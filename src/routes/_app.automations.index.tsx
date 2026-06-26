import { createFileRoute, Link } from "@tanstack/react-router";
import { useAmc } from "@/mock/store";
import { PageHeader } from "@/components/amc/PageHeader";
import { MonoId, RelativeTime, Sparkline, StatusChip } from "@/components/amc/primitives";

export const Route = createFileRoute("/_app/automations")({
  component: AutomationsPage,
});

function AutomationsPage() {
  const jobs = useAmc((s) => s.automations);
  return (
    <>
      <PageHeader title="Automations" description="Scheduled jobs and their health." />
      <div className="space-y-2">
        {jobs.map((j) => {
          const durations = j.runs.map((r) => r.duration_ms ?? 0).reverse();
          return (
            <Link
              key={j.id}
              to="/automations/$jobId"
              params={{ jobId: j.id }}
              className="block rounded-lg border border-border bg-surface p-4 hover:border-accent-cyan/30"
            >
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip status={j.status} />
                <MonoId>{j.schedule}</MonoId>
                <span className="text-xs text-muted-foreground">{j.schedule_human}</span>
              </div>
              <div className="mt-2 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold">{j.name}</h3>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Last <RelativeTime iso={j.last_run_at} /></span>
                    <span>Next <RelativeTime iso={j.next_run_at} /></span>
                    <span>Success <span className="font-mono tabular-nums">{Math.round(j.success_rate * 100)}%</span></span>
                    {j.consecutive_failures > 0 && (
                      <span className="text-status-fail font-mono">
                        {j.consecutive_failures} consecutive failures
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  <Sparkline values={durations.length ? durations : [1, 1, 1]} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}