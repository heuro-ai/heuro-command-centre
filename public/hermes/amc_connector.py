"""
Agent Mission Control connector for Hermes.

Drop this file into ~/.hermes/plugins/ and run Hermes normally.

On first run it will print a URL and prompt you to paste an AMC pairing
token. After that, it stores the per-agent secret in ~/.hermes/amc.json
and pushes events to AMC over plain HTTPS, signed with HMAC-SHA256.

Security model
--------------
- Pairing token: one-time, 10-minute, single-use. Issued from /connect
  while you're signed in to AMC.
- Agent secret: generated server-side at pair time, shown ONCE in the
  pair response, hashed at rest with SHA-256. The agent stores the raw
  secret locally in ~/.hermes/amc.json (chmod 600).
- Every event batch is signed:
      sig = HMAC-SHA256(sha256(secret), raw_body_bytes).hex()
  The server re-derives the same key from the stored hash and verifies.
  This means the raw secret is never reconstructable from the database.
- No inbound ports. The connector only makes outbound HTTPS calls.
- No code, env vars, or files are read. Only event metadata you publish
  via Hermes' event_publisher is forwarded.

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
BATCH_INTERVAL = 1.5  # seconds
BATCH_MAX = 50


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
    }
    _save_config(cfg)
    print(f"✓ Paired. Agent ID {cfg['agent_id']}")
    return cfg


def _signing_key(secret: str) -> bytes:
    """Match server: signing_key = sha256(plaintext_secret) as 32 raw bytes."""
    return bytes.fromhex(hashlib.sha256(secret.encode()).hexdigest())


def _sign(secret: str, raw_body: bytes) -> str:
    return hmac.new(_signing_key(secret), raw_body, hashlib.sha256).hexdigest()


class AmcConnector:
    """Buffers events and ships them to AMC in batches."""

    def __init__(self, cfg: Dict[str, Any]):
        self.cfg = cfg
        self.queue: Queue[Dict[str, Any]] = Queue()
        self.stop = threading.Event()
        self.thread = threading.Thread(target=self._run, name="amc-shipper", daemon=True)

    def start(self) -> None:
        self.thread.start()

    def publish(self, event_type: str, payload: Dict[str, Any], mission_id: Optional[str] = None) -> None:
        self.queue.put({
            "event_id": str(uuid.uuid4()),
            "event_type": event_type,
            "mission_id": mission_id,
            "occurred_at": _iso_now(),
            "payload": payload,
        })

    def _drain(self) -> list:
        batch: list = []
        deadline = time.time() + BATCH_INTERVAL
        while len(batch) < BATCH_MAX and time.time() < deadline:
            try:
                batch.append(self.queue.get(timeout=max(0.05, deadline - time.time())))
            except Empty:
                break
        return batch

    def _run(self) -> None:
        # Heartbeat so AMC marks us online even when idle.
        last_beat = 0.0
        while not self.stop.is_set():
            batch = self._drain()
            now = time.time()
            if now - last_beat > 30:
                batch.append({
                    "event_id": str(uuid.uuid4()),
                    "event_type": "agent.heartbeat",
                    "mission_id": None,
                    "occurred_at": _iso_now(),
                    "payload": {"uptime_s": int(now - self.cfg.get("paired_at", now))},
                })
                last_beat = now
            if not batch:
                continue
            self._ship(batch)

    def _ship(self, batch: list, attempt: int = 0) -> None:
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
                timeout=10,
            )
            if resp.status_code >= 400:
                print(f"[amc] ingest {resp.status_code}: {resp.text[:200]}", file=sys.stderr)
        except requests.RequestException as exc:
            if attempt < 3:
                time.sleep(2 ** attempt)
                self._ship(batch, attempt + 1)
            else:
                print(f"[amc] dropped batch of {len(batch)}: {exc}", file=sys.stderr)


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