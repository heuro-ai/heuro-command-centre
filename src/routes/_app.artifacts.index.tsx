import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { useAmc } from "@/mock/store";
import { PageHeader } from "@/components/amc/PageHeader";
import { ConfidenceBar, MonoId, RelativeTime, StatusChip } from "@/components/amc/primitives";

export const Route = createFileRoute("/_app/artifacts/")({
  component: ArtifactsPage,
});

function ArtifactsPage() {
  const artifacts = useAmc((s) => s.artifacts);
  return (
    <>
      <PageHeader title="Artifacts" description="Verified outputs produced by missions." />
      <div className="space-y-3">
        {artifacts.map((a) => (
          <Link
            key={a.id}
            to="/artifacts/$artifactId"
            params={{ artifactId: a.id }}
            className="block rounded-lg border border-border bg-surface p-4 hover:border-accent-cyan/30"
          >
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip status={a.status === "approved" ? "completed" : a.status === "ready" ? "needs_review" : a.status === "draft" ? "running" : "failed"} label={a.status} />
              <span className="font-mono text-[11px] uppercase text-muted-foreground">{a.kind}</span>
              <MonoId>{a.id}</MonoId>
              <span className="ml-auto"><RelativeTime iso={a.created_at} /></span>
            </div>
            <div className="mt-2 flex items-start gap-3">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground">{a.title}</div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.summary}</p>
                <div className="mt-2"><ConfidenceBar value={a.confidence} /></div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}