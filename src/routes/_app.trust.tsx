import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Lock } from "lucide-react";
import { useAmc } from "@/mock/store";
import { PageHeader } from "@/components/amc/PageHeader";
import { ConfidenceBar, MonoId, RelativeTime, SectionHeader } from "@/components/amc/primitives";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/trust")({
  component: TrustCenter,
});

const tabs = ["Sources", "Approvals", "Validation", "Risk", "Audit log", "Memory & Skills"] as const;

function TrustCenter() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Sources");
  const audit = useAmc((s) => s.audit);
  const trust = useAmc((s) => s.trust);
  const approvals = useAmc((s) => s.approvals);
  const missions = useAmc((s) => s.missions);

  const allSources = missions.flatMap((m) => m.sources);

  return (
    <>
      <PageHeader title="Trust Center" description="Govern autonomy. Inspect sources, validations, approvals, and audit history." />

      <div className="-mx-4 mb-4 flex gap-1 overflow-x-auto border-b border-border px-4 lg:mx-0 lg:px-0">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2 text-xs font-medium uppercase tracking-wider",
              tab === t ? "border-accent-cyan text-accent-cyan" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Sources" && (
        <div className="space-y-2">
          {allSources.map((s) => (
            <div key={s.id + s.url} className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface p-3">
              <div className="min-w-0">
                <div className="truncate text-sm">{s.title}</div>
                <div className="truncate font-mono text-[11px] text-muted-foreground">{s.domain}</div>
              </div>
              <ConfidenceBar value={s.confidence} />
            </div>
          ))}
        </div>
      )}

      {tab === "Approvals" && (
        <div className="space-y-2">
          {approvals.map((a) => (
            <div key={a.id} className="rounded-md border border-border bg-surface p-3 text-sm">
              <div className="flex items-center gap-2">
                <MonoId>{a.id}</MonoId>
                <span className="text-xs text-muted-foreground">{a.mission_title}</span>
                <span className="ml-auto text-xs font-mono uppercase text-muted-foreground">{a.status}</span>
              </div>
              <div className="mt-1">{a.requested_action}</div>
            </div>
          ))}
        </div>
      )}

      {tab === "Validation" && (
        <div className="space-y-2">
          {trust.filter((t) => t.kind === "validation").map((t) => (
            <TrustItem key={t.id} t={t} />
          ))}
        </div>
      )}

      {tab === "Risk" && (
        <div className="space-y-2">
          {trust.filter((t) => t.kind === "risk").map((t) => <TrustItem key={t.id} t={t} />)}
        </div>
      )}

      {tab === "Audit log" && (
        <div className="space-y-1">
          {audit.map((entry) => (
            <div key={entry.id} className="flex items-baseline gap-3 rounded-md border border-border bg-surface p-2.5 text-sm">
              <MonoId>{entry.event_type}</MonoId>
              <span className="min-w-0 flex-1 truncate">{entry.summary}</span>
              <span className="text-xs text-muted-foreground"><RelativeTime iso={entry.at} /></span>
            </div>
          ))}
        </div>
      )}

      {tab === "Memory & Skills" && (
        <div className="space-y-3">
          <SectionHeader title="Coming soon" />
          {["Memory review", "Skill review", "Policy engine"].map((title) => (
            <div key={title} className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              <div>
                <div className="font-medium text-foreground">{title}</div>
                <div className="text-xs">Available in a future release.</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function TrustItem({ t }: { t: ReturnType<typeof useAmc.getState>["trust"][number] }) {
  const sev = t.severity === "high" ? "text-status-fail" : t.severity === "warn" ? "text-status-warn" : "text-muted-foreground";
  return (
    <div className="rounded-md border border-border bg-surface p-3 text-sm">
      <div className="flex items-center gap-2">
        <span className={cn("font-mono text-[11px] uppercase", sev)}>{t.severity}</span>
        <span className="ml-auto text-xs text-muted-foreground"><RelativeTime iso={t.at} /></span>
      </div>
      <div className="mt-1">{t.summary}</div>
    </div>
  );
}