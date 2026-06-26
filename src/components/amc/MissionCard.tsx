import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Cpu } from "lucide-react";
import type { Mission } from "@/mock/types";
import { MonoId, RelativeTime, RiskPill, StatusChip } from "./primitives";

export function MissionCard({ mission }: { mission: Mission }) {
  const current = mission.steps[mission.current_step_index];
  const stalledMins = Math.round(
    (Date.now() - new Date(mission.last_verified_progress_at).getTime()) / 60_000,
  );
  const warn = mission.status === "running" && stalledMins >= 10;

  return (
    <Link
      to="/missions/$missionId"
      params={{ missionId: mission.id }}
      className="group block rounded-lg border border-border bg-surface p-4 transition-colors hover:border-accent-cyan/30 hover:bg-surface-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip status={mission.status} />
            <RiskPill risk={mission.risk} />
            <MonoId>{mission.id.replace("mission_", "m_")}</MonoId>
          </div>
          <h3 className="mt-2 truncate text-sm font-semibold text-foreground">
            {mission.title}
          </h3>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Cpu className="h-3 w-3" />
            <span className="font-mono">{mission.profile}</span>
            <span>·</span>
            <span>Step {mission.current_step_index + 1}/{mission.steps.length}</span>
          </div>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-accent-cyan" />
      </div>

      {current && (
        <div className="mt-3 rounded-md border border-border bg-background px-3 py-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Current step
          </div>
          <div className="mt-0.5 text-sm text-foreground">{current.name}</div>
          {current.summary && (
            <div className="mt-0.5 text-xs text-muted-foreground">{current.summary}</div>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <RelativeTime iso={mission.last_verified_progress_at} prefix="Verified progress" />
        {mission.eta && (
          <span className="font-mono text-muted-foreground">
            ETA <RelativeTime iso={mission.eta} />
          </span>
        )}
      </div>

      {warn && (
        <div className="mt-3 rounded-md border border-status-warn/40 bg-status-warn/5 px-3 py-2 text-xs text-status-warn">
          No verified progress for {stalledMins} minutes. Likely stalled.
        </div>
      )}
    </Link>
  );
}