"""
Agent Mission Control connector for Hermes.

Drop this file into ~/.hermes/plugins/ and run Hermes normally.

On first run it will print a URL and prompt you to paste an AMC pairing
token. After that, it stores the per-agent secret in ~/.hermes/amc.json
and pushes events to AMC over plain HTTPS, signed with HMAC-SHA256.

Delivery model
--------------
- **At-least-once**: every published event is assigned a monotonic
  per-agent sequence number (`seq`) and appended to a durable spool at
  ~/.hermes/amc_spool.jsonl BEFORE we try to ship it. If the process
  crashes or the network flakes, on next start we resume from the spool.
- **Ack watermark**: the server returns `last_seq` after every successful
  batch. We only trim the spool up to that point, so anything the server
  hasn't confirmed is re-shipped on the next attempt.
- **Server dedupe**: batches are deduped by (agent_id, seq). Re-shipping
  the same seq is a no-op on the server side, so retries are safe.
- **Reconnect**: on any network / 5xx / auth-transient error we back off
  exponentially (1s → 2s → 4s → … capped at 60s) and keep the spool
  intact. On 401 (bad_signature / unknown_agent) we halt and require
  re-pairing rather than losing events silently.

Security model
--------------
- Pairing token: one-time, 10-minute, single-use.
- Agent secret shown once at pair time, hashed (SHA-256) at rest.
- Every batch signed HMAC-SHA256(sha256(secret), body).
- No inbound ports. Outbound HTTPS only. Only event metadata is sent.

Requirements
------------
- Python 3.9+
- `requests` (already a Hermes dep)
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import platform
import socket
import sys
import threading
import time
import uuid
from pathlib import Path
from queue import Queue, Empty
from typing import Any, Dict, Optional

import requests

AMC_BASE_URL = os.environ.get("AMC_BASE_URL", "https://heuro-command-centre.lovable.app")
CONFIG_PATH = Path.home() / ".hermes" / "amc.json"
SPOOL_PATH = Path.home() / ".hermes" / "amc_spool.jsonl"
BATCH_INTERVAL = 1.5  # seconds
BATCH_MAX = 50
BACKOFF_MIN = 1.0
BACKOFF_MAX = 60.0
SPOOL_SOFT_CAP = 50_000  # events; older ones stay on disk but warn


def _fingerprint() -> str:
    """Stable per-machine, per-user identifier (no PII)."""
    raw = f"{socket.gethostname()}|{platform.node()}|{uuid.getnode()}|{os.getuid() if hasattr(os, 'getuid') else 0}"
    return "hms_" + hashlib.sha256(raw.encode()).hexdigest()[:24]


def _load_config() -> Optional[Dict[str, Any]]:
    if not CONFIG_PATH.exists():
        return None
    try:
        return json.loads(CONFIG_PATH.read_text())
    except Exception:
        return None


def _save_config(cfg: Dict[str, Any]) -> None:
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(json.dumps(cfg, indent=2))
    try:
        os.chmod(CONFIG_PATH, 0o600)
    except Exception:
        pass


def _pair_interactively() -> Dict[str, Any]:
    print("\n┌── Agent Mission Control ──────────────────────────")
    print(f"│  Open: {AMC_BASE_URL}/connect")
    print( "│  Click 'New pairing token' and paste it below.")
    print( "└────────────────────────────────────────────────────")
    token = (os.environ.get("AMC_PAIRING_TOKEN") or input("AMC pairing token: ")).strip()
    if not token:
        raise RuntimeError("No pairing token provided. Aborting.")

    body = {
        "token": token,
        "fingerprint": _fingerprint(),
        "name": socket.gethostname() or "Hermes",
        "version": os.environ.get("HERMES_VERSION", "0.14.2"),
        "profile": os.environ.get("HERMES_PROFILE", "default"),
        "endpoint": f"{platform.system()} {platform.release()}",
    }
    resp = requests.post(f"{AMC_BASE_URL}/api/public/agent/pair", json=body, timeout=15)
    if resp.status_code != 200:
        raise RuntimeError(f"Pair failed [{resp.status_code}]: {resp.text}")
    data = resp.json()
    cfg = {
        "agent_id": data["agentId"],
        "agent_secret": data["agentSecret"],
        "ingest_url": data["ingestUrl"],
        "paired_at": time.time(),
        "fingerprint": body["fingerprint"],
        "last_seq": 0,     # highest seq the server has ACKed
        "next_seq": 1,     # next seq to assign to a new event
    }
    _save_config(cfg)
    print(f"✓ Paired. Agent ID {cfg['agent_id']}")
    return cfg


def _signing_key(secret: str) -> bytes:
    """Match server: signing_key = sha256(plaintext_secret) as 32 raw bytes."""
    return bytes.fromhex(hashlib.sha256(secret.encode()).hexdigest())


def _sign(secret: str, raw_body: bytes) -> str:
    return hmac.new(_signing_key(secret), raw_body, hashlib.sha256).hexdigest()


class Spool:
    """Append-only JSONL of unacked events. Persists across restarts.

    Rewrites on trim. A single lock covers both the file and the in-memory
    mirror so a shipping thread and the publish thread can't race.
    """

    def __init__(self, path: Path):
        self.path = path
        self.lock = threading.Lock()
        self.events: list[Dict[str, Any]] = []
        self._load()

    def _load(self) -> None:
        if not self.path.exists():
            return
        try:
            with self.path.open() as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        self.events.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
        except OSError as exc:
            print(f"[amc] spool read failed: {exc}", file=sys.stderr)

    def append(self, event: Dict[str, Any]) -> None:
        with self.lock:
            self.events.append(event)
            try:
                self.path.parent.mkdir(parents=True, exist_ok=True)
                with self.path.open("a") as f:
                    f.write(json.dumps(event, separators=(",", ":")) + "\n")
                    f.flush()
                    os.fsync(f.fileno())
            except OSError as exc:
                print(f"[amc] spool write failed: {exc}", file=sys.stderr)
            if len(self.events) == SPOOL_SOFT_CAP:
                print(
                    f"[amc] spool has {SPOOL_SOFT_CAP} unacked events — "
                    "AMC may be unreachable",
                    file=sys.stderr,
                )

    def peek(self, n: int) -> list[Dict[str, Any]]:
        with self.lock:
            return list(self.events[:n])

    def trim_up_to(self, last_seq: int) -> int:
        """Drop everything with seq <= last_seq. Returns count removed."""
        with self.lock:
            keep = [e for e in self.events if e["seq"] > last_seq]
            removed = len(self.events) - len(keep)
            if removed == 0:
                return 0
            self.events = keep
            self._rewrite_locked()
            return removed

    def _rewrite_locked(self) -> None:
        try:
            tmp = self.path.with_suffix(".tmp")
            with tmp.open("w") as f:
                for e in self.events:
                    f.write(json.dumps(e, separators=(",", ":")) + "\n")
                f.flush()
                os.fsync(f.fileno())
            os.replace(tmp, self.path)
        except OSError as exc:
            print(f"[amc] spool rewrite failed: {exc}", file=sys.stderr)

    def __len__(self) -> int:
        with self.lock:
            return len(self.events)

    def max_seq(self) -> int:
        with self.lock:
            return max((e["seq"] for e in self.events), default=0)


class AmcConnector:
    """Durable at-least-once shipper.

    Flow:
      publish(evt) → assign seq → append to spool → notify shipper
      shipper loop → peek up to BATCH_MAX → POST /ingest
                   → on 2xx: trim spool up to server-ack `last_seq`
                   → on transient: exponential backoff, keep spool
                   → on auth error: halt (require re-pair)
    """

    def __init__(self, cfg: Dict[str, Any]):
        self.cfg = cfg
        self.spool = Spool(SPOOL_PATH)
        self.stop = threading.Event()
        self.wake = threading.Event()
        self.seq_lock = threading.Lock()
        # Resume seq state from the durable spool AND the persisted config,
        # taking the max — so a partial ack survives a crash without
        # reissuing a seq we already spooled.
        self.next_seq = max(int(cfg.get("next_seq", 1)), self.spool.max_seq() + 1)
        self.last_seq_ack = int(cfg.get("last_seq", 0))
        self.halted = False
        self.thread = threading.Thread(target=self._run, name="amc-shipper", daemon=True)

    def start(self) -> None:
        self.thread.start()

    def publish(self, event_type: str, payload: Dict[str, Any], mission_id: Optional[str] = None) -> None:
        if self.halted:
            return
        with self.seq_lock:
            seq = self.next_seq
            self.next_seq += 1
        event = {
            "seq": seq,
            "event_id": str(uuid.uuid4()),
            "event_type": event_type,
            "mission_id": mission_id,
            "occurred_at": _iso_now(),
            "payload": payload,
        }
        self.spool.append(event)
        self.wake.set()

    def _run(self) -> None:
        last_beat = 0.0
        backoff = BACKOFF_MIN
        while not self.stop.is_set():
            if self.halted:
                time.sleep(1.0)
                continue

            # Ensure a heartbeat is spooled at least every 30s.
            now = time.time()
            if now - last_beat > 30:
                self.publish(
                    "agent.heartbeat",
                    {"uptime_s": int(now - self.cfg.get("paired_at", now)),
                     "unacked": len(self.spool)},
                )
                last_beat = now

            batch = self.spool.peek(BATCH_MAX)
            if not batch:
                # Nothing to ship — sleep until publish() wakes us or heartbeat is due.
                self.wake.wait(timeout=BATCH_INTERVAL)
                self.wake.clear()
                continue

            outcome = self._ship(batch)
            if outcome == "ok":
                backoff = BACKOFF_MIN
                # Small pause to allow batches to fill; drain quickly if backlog remains.
                if len(self.spool) == 0:
                    self.wake.wait(timeout=BATCH_INTERVAL)
                    self.wake.clear()
            elif outcome == "halt":
                self.halted = True
                print(
                    "[amc] halted — agent needs to be re-paired. "
                    f"{len(self.spool)} events remain in {SPOOL_PATH}",
                    file=sys.stderr,
                )
            else:  # "retry"
                jitter = 0.1 * backoff * (2 * (os.urandom(1)[0] / 255.0) - 1)
                sleep_for = min(BACKOFF_MAX, backoff + jitter)
                print(f"[amc] transient error, retrying in {sleep_for:.1f}s "
                      f"({len(self.spool)} unacked)", file=sys.stderr)
                self.stop.wait(timeout=sleep_for)
                backoff = min(BACKOFF_MAX, backoff * 2)

    def _ship(self, batch: list) -> str:
        """Returns 'ok', 'retry', or 'halt'."""
        raw = json.dumps(batch, separators=(",", ":")).encode()
        sig = _sign(self.cfg["agent_secret"], raw)
        try:
            resp = requests.post(
                self.cfg["ingest_url"],
                data=raw,
                headers={
                    "Content-Type": "application/json",
                    "X-Agent-Id": self.cfg["agent_id"],
                    "X-Agent-Signature": sig,
                },
                timeout=15,
            )
        except requests.RequestException as exc:
            print(f"[amc] network error: {exc}", file=sys.stderr)
            return "retry"

        if 200 <= resp.status_code < 300:
            try:
                body = resp.json()
                # Trust the server's watermark — it may be higher than what
                # we just sent (already-acked replay) or equal.
                server_seq = int(body.get("last_seq", 0))
            except (ValueError, TypeError):
                server_seq = batch[-1]["seq"]
            # Never rewind the watermark.
            server_seq = max(server_seq, self.last_seq_ack)
            removed = self.spool.trim_up_to(server_seq)
            self.last_seq_ack = server_seq
            self._persist_progress()
            if removed:
                # keeps logs quiet in the steady state
                pass
            return "ok"

        if resp.status_code in (401, 403):
            # Signature invalid or agent unknown — no amount of retrying fixes this.
            print(f"[amc] auth error {resp.status_code}: {resp.text[:200]}", file=sys.stderr)
            return "halt"

        if resp.status_code == 413:
            # Batch too large — this shouldn't happen with BATCH_MAX=50, but if
            # a single event is pathological, drop it so we don't wedge forever.
            print(f"[amc] payload too large; dropping seq {batch[0]['seq']}", file=sys.stderr)
            self.spool.trim_up_to(batch[0]["seq"])
            return "ok"

        # 4xx (non-auth) and 5xx → transient
        print(f"[amc] ingest {resp.status_code}: {resp.text[:200]}", file=sys.stderr)
        return "retry"

    def _persist_progress(self) -> None:
        """Snapshot seq state so a crashed process resumes cleanly."""
        self.cfg["last_seq"] = self.last_seq_ack
        self.cfg["next_seq"] = self.next_seq
        try:
            _save_config(self.cfg)
        except OSError as exc:
            print(f"[amc] config save failed: {exc}", file=sys.stderr)


def _iso_now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


# ── Hermes plugin entrypoint ────────────────────────────────────────
# Hermes will import this module and call `register(hermes)` if present.

_connector: Optional[AmcConnector] = None


def _ensure() -> AmcConnector:
    global _connector
    if _connector is not None:
        return _connector
    cfg = _load_config() or _pair_interactively()
    _connector = AmcConnector(cfg)
    _connector.start()
    _connector.publish("agent.connected", {"fingerprint": cfg["fingerprint"]})
    return _connector


def register(hermes) -> None:  # noqa: ANN001 — Hermes-specific type
    """Called by Hermes during plugin load."""
    conn = _ensure()

    pub = getattr(hermes, "event_publisher", None)
    if pub is None:
        print("[amc] hermes.event_publisher not found; running heartbeat-only", file=sys.stderr)
        return

    def _forward(event_type: str, **payload):
        mid = payload.pop("mission_id", None)
        conn.publish(event_type, payload, mission_id=mid)

    for name in (
        "mission.started", "mission.step", "mission.completed", "mission.failed",
        "approval.requested", "approval.resolved",
        "artifact.created", "artifact.updated",
        "automation.run", "automation.failed",
    ):
        try:
            pub.subscribe(name, lambda **p, _n=name: _forward(_n, **p))
        except Exception as exc:
            print(f"[amc] couldn't subscribe to {name}: {exc}", file=sys.stderr)


if __name__ == "__main__":
    # Standalone smoke test: pair (if needed) and send a hello.
    conn = _ensure()
    conn.publish("agent.hello", {"source": "cli"})
    time.sleep(3)
    print("Hello shipped.")