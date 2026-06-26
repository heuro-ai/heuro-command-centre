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

    // Heartbeat
    s.advanceTick();
    useAmc.setState((prev) => ({
      agent: { ...prev.agent, last_heartbeat_at: new Date().toISOString() },
    }));

    // Advance the running market-research mission summary text occasionally
    const research = s.missions.find((m) => m.id === "mission_market_research");
    if (research && research.status === "running") {
      const step = research.steps[research.current_step_index];
      if (step && step.status === "running") {
        const match = step.summary?.match(/(\d+)\/(\d+)/);
        if (match) {
          const done = Math.min(parseInt(match[2]), parseInt(match[1]) + (s.tick % 6 === 0 ? 1 : 0));
          const updatedSteps = research.steps.map((st, i) =>
            i === research.current_step_index
              ? { ...st, summary: `${done}/${match[2]} products profiled` }
              : st,
          );
          s.updateMission(research.id, {
            steps: updatedSteps,
            updated_at: new Date().toISOString(),
            last_verified_progress_at:
              done > parseInt(match[1])
                ? new Date().toISOString()
                : research.last_verified_progress_at,
          });
        }
      }
    }
  }, 5_000);
}

export function stopMockConnector() {
  if (interval) clearInterval(interval);
  interval = null;
  started = false;
}