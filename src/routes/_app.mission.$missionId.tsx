import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  AlertTriangle,
  Bot,
  Pause,
  Play,
  RotateCcw,
  Square,
  Terminal,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAmc } from "@/mock/store";
import { MonoId, RelativeTime, RiskPill, StatusChip, ConfidenceBar, SectionHeader } from "@/components/amc/primitives";
import { MissionTimeline } from "@/components/amc/MissionTimeline";
import { SourceCard } from "@/components/amc/SourceCard";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/mission/$missionId")({
  component: MissionDetail,
  notFoundComponent: () => (
    <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
      Mission not found.
    </div>
  ),
});

function MissionDetail() {
  const { missionId } = Route.useParams();
  const mission = useAmc((s) => s.missions.find((m) => m.id === missionId));
  const allArtifacts = useAmc((s) => s.artifacts);
  const artifacts = mission
    ? allArtifacts.filter((a) => mission.artifact_ids.includes(a.id))
    : [];
  const [logsOpen, setLogsOpen] = useState(false);
  if (!mission) {
    return <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-muted-foreground">Mission not found.</div>;
  }

  const stalledMins = Math.round(
    (Date.now() - new Date(mission.last_verified_progress_at).getTime()) / 60_000,
  );
  const stalledWarn = mission.status === "running" && stalledMins >= 10;

  return (
    <>
      <Link to="/missions" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        ← All missions
      </Link>

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip status={mission.status} />
          <RiskPill risk={mission.risk} />
          <MonoId>{mission.id}</MonoId>
          <span className="ml-auto font-mono text-[11px] text-muted-foreground">
            autonomy: {mission.autonomy}
          </span>
        </div>
        <h1 className="mt-3 text-lg font-semibold tracking-tight text-foreground">
          {mission.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{mission.objective}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Bot className="h-3 w-3" />
            <span className="font-mono">{mission.profile}</span>
          </span>
          <RelativeTime iso={mission.last_verified_progress_at} prefix="Verified progress" />
          {mission.eta && <span className="font-mono">ETA <RelativeTime iso={mission.eta} /></span>}
        </div>
      </div>

      {stalledWarn && (
        <div className="mt-3 flex items-start gap-3 rounded-lg border border-status-warn/40 bg-status-warn/5 p-3 text-sm text-status-warn">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-semibold">No verified progress for {stalledMins} minutes.</div>
            <div className="mt-0.5 text-xs opacity-80">
              Hermes is active but no step output has changed. Likely stalled.
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionHeader title="Timeline" />
          <div className="rounded-lg border border-border bg-surface p-4">
            TIMELINE PLACEHOLDER
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1.5"><Pause className="h-3.5 w-3.5" /> Pause</Button>
            <Button size="sm" variant="outline" className="gap-1.5"><Play className="h-3.5 w-3.5" /> Resume</Button>
            <Button size="sm" variant="outline" className="gap-1.5"><RotateCcw className="h-3.5 w-3.5" /> Retry step</Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-status-fail border-status-fail/40 hover:bg-status-fail/10"><Square className="h-3.5 w-3.5" /> Cancel</Button>
            <Link to="/thread/$missionId" params={{ missionId: mission.id }}>
              <Button size="sm" className="gap-1.5 bg-accent-cyan text-background hover:bg-accent-cyan/90">
                <Bot className="h-3.5 w-3.5" /> Ask Hermes what's blocked
              </Button>
            </Link>
          </div>

          <div className="mt-4 rounded-lg border border-border bg-surface">
            <button onClick={() => setLogsOpen((v) => !v)} className="flex w-full items-center justify-between p-3 text-sm">
              <span className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground">
                <Terminal className="h-3.5 w-3.5" />
                Technical logs
              </span>
              <span className="text-xs text-muted-foreground">{logsOpen ? "Hide" : "Show"}</span>
            </button>
            {logsOpen && (
              <pre className="border-t border-border bg-background p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
{`[${new Date().toISOString()}] step.running id=s4 tool=fetch
[planner] 11/14 products profiled
[fetch] GET conductor.dev/pricing 200 1.2s
[fetch] GET agentops.io 200 0.9s
[validator] schema OK, sources OK
[hermes] no verified output change in 4s, continuing
`}
              </pre>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          {artifacts.length > 0 && (
            <div>
              <SectionHeader title="Current artifact" />
              {artifacts.map((a) => (
                <Link
                  key={a.id}
                  to="/artifact/$artifactId"
                  params={{ artifactId: a.id }}
                  className="block rounded-lg border border-border bg-surface p-3 hover:border-accent-cyan/30"
                >
                  <div className="text-xs font-mono text-muted-foreground uppercase">{a.kind}</div>
                  <div className="mt-0.5 text-sm font-semibold text-foreground">{a.title}</div>
                  <div className="mt-1 line-clamp-3 text-xs text-muted-foreground">{a.summary}</div>
                  <div className="mt-2"><ConfidenceBar value={a.confidence} /></div>
                </Link>
              ))}
            </div>
          )}

          <div>
            <SectionHeader title="Trust" />
            <div className="space-y-2 rounded-lg border border-border bg-surface p-3">
              <Row label="Confidence"><ConfidenceBar value={mission.confidence} /></Row>
              <Row label="Sources"><span className="font-mono text-xs">{mission.sources.length}</span></Row>
              <Row label="Risk"><RiskPill risk={mission.risk} /></Row>
              <Row label="Validation"><span className="text-xs text-status-ok">Passed</span></Row>
            </div>
          </div>

          {mission.sources.length > 0 && (
            <div>
              <SectionHeader title="Sources" />
              <div className="space-y-2">
                {mission.sources.map((s) => <SourceCard key={s.id} source={s} />)}
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div>{children}</div>
    </div>
  );
}