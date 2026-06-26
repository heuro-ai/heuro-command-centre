import { createFileRoute } from "@tanstack/react-router";
import { Download, FlaskConical, RefreshCw, Terminal, Zap } from "lucide-react";
import { useAmc } from "@/mock/store";
import { PageHeader } from "@/components/amc/PageHeader";
import { MonoId, RelativeTime, SectionHeader, StatusChip } from "@/components/amc/primitives";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/health")({
  component: HealthPage,
});

function HealthPage() {
  const agent = useAmc((s) => s.agent);
  return (
    <>
      <PageHeader title="Agent Health" description={`${agent.name} · ${agent.connector_version}`} />

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusChip status={agent.status} />
          <MonoId>{agent.id}</MonoId>
          <span className="text-xs text-muted-foreground"><RelativeTime iso={agent.last_heartbeat_at} prefix="Last heartbeat" /></span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Kv label="Hermes version" value={agent.version} />
          <Kv label="Active profile" value={agent.profile} />
          <Kv label="Model" value={agent.model} />
          <Kv label="Provider" value={agent.provider} />
          <Kv label="Gateway" value={agent.gateway} />
          <Kv label="Cron service" value={agent.cron} />
          <Kv label="Permission" value={agent.permission} />
          <Kv label="Connector" value={agent.connector_version} />
          <Kv label="Channels" value={agent.channels.join(", ")} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" className="gap-1.5 bg-accent-cyan text-background"><RefreshCw className="h-3.5 w-3.5" /> Refresh health</Button>
        <Button size="sm" variant="outline" className="gap-1.5"><Zap className="h-3.5 w-3.5" /> Reconnect</Button>
        <Button size="sm" variant="outline" className="gap-1.5"><Terminal className="h-3.5 w-3.5" /> View connector logs</Button>
        <Button size="sm" variant="outline" className="gap-1.5"><FlaskConical className="h-3.5 w-3.5" /> Test mission event</Button>
        <Button size="sm" variant="outline" className="gap-1.5"><Download className="h-3.5 w-3.5" /> Diagnostic bundle</Button>
      </div>

      <section className="mt-6">
        <SectionHeader title="Recent errors" />
        {agent.recent_errors.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            No errors recorded.
          </div>
        ) : (
          <div className="space-y-2">
            {agent.recent_errors.map((e, i) => (
              <div key={i} className="rounded-md border border-status-fail/30 bg-status-fail/5 p-3 text-sm">
                <div className="text-xs text-muted-foreground"><RelativeTime iso={e.at} /></div>
                <div className="mt-1 text-status-fail">{e.message}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-2.5">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-sm">{value}</div>
    </div>
  );
}