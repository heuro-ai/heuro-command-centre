"""
Simulates a flaky link between the Hermes connector and AMC's ingest
endpoint and asserts the local spool replay delivers every event exactly
once, in per-agent sequence order.

Failure modes exercised:
  1. Random 5xx drops on ~50% of batches (packet-loss analogue).
  2. Half-open drop: server accepts insert but returns 500 — the
     connector MUST re-ship those seqs and the server MUST dedupe them.
  3. Cold restart mid-flight: kill the connector, spin up a fresh one
     against the same spool + config, and verify no events are lost or
     re-numbered.

Run:  python3 -m unittest tests.hermes.test_reconnect -v
"""
from __future__ import annotations

import hashlib
import hmac
import json
import random
import sys
import tempfile
import threading
import time
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

# Import the connector under test.
REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "public" / "hermes"))
import amc_connector  # noqa: E402

AGENT_ID = "test-agent-0000-0000-000000000000"
AGENT_SECRET = "hs_" + "a" * 64
SIGNING_KEY = bytes.fromhex(hashlib.sha256(AGENT_SECRET.encode()).hexdigest())


class MockIngest:
    """Threaded HTTP server that emulates /api/public/agent/ingest.

    Verifies HMAC, dedupes by (agent, seq), and can be told to drop or
    500 a configurable fraction of requests to simulate missed frames.
    """

    def __init__(self, drop_rate: float = 0.0, half_open_rate: float = 0.0, seed: int = 42):
        self.drop_rate = drop_rate
        self.half_open_rate = half_open_rate
        self.rng = random.Random(seed)
        self.received: dict[int, dict] = {}  # seq -> event
        self.last_seq = 0
        self.request_count = 0
        self.dropped_count = 0
        self.lock = threading.Lock()
        self._server: ThreadingHTTPServer | None = None
        self._thread: threading.Thread | None = None

    def start(self) -> str:
        outer = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *_a, **_kw):
                return

            def do_POST(self):
                length = int(self.headers.get("Content-Length", "0"))
                raw = self.rfile.read(length)
                sig = self.headers.get("X-Agent-Signature", "")
                agent = self.headers.get("X-Agent-Id", "")
                expected = hmac.new(SIGNING_KEY, raw, hashlib.sha256).hexdigest()
                if agent != AGENT_ID or not hmac.compare_digest(sig, expected):
                    self.send_response(401)
                    self.end_headers()
                    self.wfile.write(b'{"error":"bad_signature"}')
                    return

                with outer.lock:
                    outer.request_count += 1
                    # Chaos monkey — simulate packet loss BEFORE we touch state.
                    if outer.rng.random() < outer.drop_rate:
                        outer.dropped_count += 1
                        self.send_response(503)
                        self.end_headers()
                        self.wfile.write(b'{"error":"simulated_drop"}')
                        return

                    batch = json.loads(raw)
                    accepted = 0
                    for evt in sorted(batch, key=lambda e: e["seq"]):
                        if evt["seq"] <= outer.last_seq:
                            continue  # server dedupe
                        if evt["seq"] in outer.received:
                            continue
                        outer.received[evt["seq"]] = evt
                        outer.last_seq = max(outer.last_seq, evt["seq"])
                        accepted += 1

                    # Half-open failure: we DID insert, but tell the client we didn't.
                    # The connector must re-ship these seqs and the server must dedupe.
                    if outer.rng.random() < outer.half_open_rate:
                        outer.dropped_count += 1
                        self.send_response(500)
                        self.end_headers()
                        self.wfile.write(b'{"error":"half_open"}')
                        return

                    body = json.dumps({"ok": True, "accepted": accepted, "last_seq": outer.last_seq})
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(body.encode())

        self._server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        port = self._server.server_address[1]
        self._thread = threading.Thread(target=self._server.serve_forever, daemon=True)
        self._thread.start()
        return f"http://127.0.0.1:{port}/ingest"

    def stop(self):
        if self._server:
            self._server.shutdown()
            self._server.server_close()


class ReconnectTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.tmp_path = Path(self.tmp.name)
        # Point the module's state files at a scratch dir.
        amc_connector.CONFIG_PATH = self.tmp_path / "amc.json"
        amc_connector.SPOOL_PATH = self.tmp_path / "amc_spool.jsonl"
        # Speed the shipper up so tests finish in seconds.
        amc_connector.BATCH_INTERVAL = 0.05
        amc_connector.BATCH_MAX = 20
        amc_connector.BACKOFF_MIN = 0.02
        amc_connector.BACKOFF_MAX = 0.2

    def tearDown(self):
        self.tmp.cleanup()

    def _cfg(self, ingest_url: str) -> dict:
        return {
            "agent_id": AGENT_ID,
            "agent_secret": AGENT_SECRET,
            "ingest_url": ingest_url,
            "paired_at": time.time(),
            "fingerprint": "test",
            "last_seq": 0,
            "next_seq": 1,
        }

    def _wait_drained(self, conn: amc_connector.AmcConnector, expected: int, timeout: float = 20.0):
        deadline = time.time() + timeout
        while time.time() < deadline:
            if len(conn.spool) == 0 and conn.last_seq_ack >= expected:
                return
            time.sleep(0.05)
        self.fail(
            f"spool did not drain in {timeout}s "
            f"(unacked={len(conn.spool)}, ack={conn.last_seq_ack}, expected={expected})",
        )

    def test_replay_recovers_dropped_batches(self):
        """~50% batch drop rate: every event still lands at the server exactly once."""
        server = MockIngest(drop_rate=0.5)
        url = server.start()
        try:
            conn = amc_connector.AmcConnector(self._cfg(url))
            conn.start()
            N = 60
            for i in range(N):
                conn.publish("mission.step", {"i": i})

            self._wait_drained(conn, expected=N)
            conn.stop.set()

            self.assertEqual(len(server.received), N, "missing events on server")
            self.assertEqual(sorted(server.received.keys()), list(range(1, N + 1)),
                             "seqs are not a contiguous 1..N")
            self.assertGreater(server.dropped_count, 0, "test didn't actually drop anything")
            self.assertEqual(len(conn.spool), 0)
        finally:
            server.stop()

    def test_half_open_dedupe(self):
        """Server inserted but returned 5xx — connector re-ships, server dedupes."""
        server = MockIngest(drop_rate=0.0, half_open_rate=0.4, seed=7)
        url = server.start()
        try:
            conn = amc_connector.AmcConnector(self._cfg(url))
            conn.start()
            N = 40
            for i in range(N):
                conn.publish("mission.step", {"i": i})
            self._wait_drained(conn, expected=N)
            conn.stop.set()

            self.assertEqual(len(server.received), N)
            self.assertEqual(sorted(server.received.keys()), list(range(1, N + 1)))
            # Dedupe means retry requests must have happened without creating duplicates.
            self.assertGreater(server.request_count, N // amc_connector.BATCH_MAX)
        finally:
            server.stop()

    def test_cold_restart_resumes_from_spool(self):
        """Kill the connector mid-flight; a fresh one picks up unacked seqs."""
        # Phase 1: everything drops, so nothing gets acked.
        server = MockIngest(drop_rate=1.0)
        url = server.start()
        try:
            conn1 = amc_connector.AmcConnector(self._cfg(url))
            conn1.start()
            for i in range(25):
                conn1.publish("mission.step", {"i": i})
            # Give the shipper time to hit the drop wall a few times.
            time.sleep(0.5)
            self.assertEqual(server.last_seq, 0)
            self.assertGreaterEqual(len(conn1.spool), 25)
            conn1.stop.set()
            conn1.thread.join(timeout=2)
        finally:
            server.stop()

        # Phase 2: bring up a healthy server + fresh connector against the SAME spool.
        server2 = MockIngest(drop_rate=0.0)
        url2 = server2.start()
        try:
            # Simulate reading persisted state — the previous run saved nothing to
            # config because no ack ever happened, so next_seq must be recovered
            # from the spool.
            cfg = self._cfg(url2)
            conn2 = amc_connector.AmcConnector(cfg)
            # The new connector must NOT reset seq — it must resume >= 26.
            self.assertGreaterEqual(conn2.next_seq, 26,
                                    f"connector reset seq to {conn2.next_seq}")
            conn2.start()
            for i in range(25, 50):
                conn2.publish("mission.step", {"i": i})
            self._wait_drained(conn2, expected=50)
            conn2.stop.set()

            self.assertEqual(sorted(server2.received.keys()), list(range(1, 51)))
        finally:
            server2.stop()


if __name__ == "__main__":
    unittest.main(verbosity=2)