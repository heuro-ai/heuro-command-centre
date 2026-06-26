import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Bell, Pause, RotateCcw } from "lucide-react";
import { useAmc } from "@/mock/store";
import { PageHeader } from "@/components/amc/PageHeader";
import { MonoId, RelativeTime, SectionHeader, Sparkline, StatusChip } from "@/components/amc/primitives";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/automation/$jobId")({
  component: AutomationDetail,
});

function AutomationDetail() {
  const { jobId } = Route.useParams();
  const job = useAmc((s) => s.automations.find((a) => a.id === jobId));
  if (!job) return <div className="p-6 text-sm text-muted-foreground">Automation not found.</div>;

  const durations = job.runs.map((r) => r.duration_ms ?? 0).reverse();

  return (
    <>
      <Link to="/automations" className="mb-3 inline-flex text-xs text-muted-foreground hover:text-foreground">← All automations</Link>
      <PageHeader title={job.name} description={`${job.schedule_human} · ${job.schedule}`} />

      <div className="grid gap-3 lg:grid-cols-4">
        <Stat label="Status"><StatusChip status={job.status} /></Stat>
        <Stat label="Success rate"><span className="font-mono text-lg">{Math.round(job.success_rate * 100)}%</span></Stat>
        <Stat label="Avg duration"><span className="font-mono text-lg">{(job.avg_duration_ms / 1000).toFixed(1)}s</span></Stat>
        <Stat label="Trend"><Sparkline values={durations.length ? durations : [1]} width={120} height={28} /></Stat>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" className="gap-1.5 bg-accent-cyan text-background"><RotateCcw className="h-3.5 w-3.5" /> Run now</Button>
        <Button size="sm" variant="outline" className="gap-1.5"><Pause className="h-3.5 w-3.5" /> Pause</Button>
        <Button size="sm" variant="outline" className="gap-1.5"><Bell className="h-3.5 w-3.5" /> Notify settings</Button>
      </div>

      <section className="mt-6">
        <SectionHeader title="Run history" />
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Run</th>
                <th className="px-3 py-2 text-left font-medium">Started</th>
                <th className="px-3 py-2 text-left font-medium">Duration</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {job.runs.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2"><MonoId>{r.id}</MonoId></td>
                  <td className="px-3 py-2"><RelativeTime iso={r.started_at} /></td>
                  <td className="px-3 py-2 font-mono tabular-nums text-muted-foreground">
                    {r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)}s` : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <StatusChip status={r.status === "ok" ? "completed" : r.status === "failed" ? "failed" : r.status === "missed" ? "missed" : "running"} label={r.status} />
                    {r.error && <div className="mt-1 text-xs text-status-fail">{r.error}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}