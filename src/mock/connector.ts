import { useAmc } from "./store";

/**
 * MockHermesConnector — simulates real Hermes connector behavior.
 * Emits heartbeats, advances running missions, and surfaces verified-progress
 * markers. Designed so the WS protocol can later replace this class with no
 * UI changes.
 */
let started = false;
let interval: ReturnType<typeof setInterval> | null = null;

export function startMockConnector() {
  if (started || typeof window === "undefined") return;
  started = true;
  interval = setInterval(() => {
    const s = useAmc.getState();
    if (!s.connected) return;
    useAmc.setState((prev) => ({
      agent: { ...prev.agent, last_heartbeat_at: new Date().toISOString() },
    }));
  }, 15_000);
}

export function stopMockConnector() {
  if (interval) clearInterval(interval);
  interval = null;
  started = false;
}