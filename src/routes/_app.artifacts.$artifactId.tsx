import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Download, GitCompare, RotateCcw, Share2 } from "lucide-react";
import { useAmc } from "@/mock/store";
import { ConfidenceBar, MonoId, RelativeTime, SectionHeader, StatusChip } from "@/components/amc/primitives";
import { SourceCard } from "@/components/amc/SourceCard";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/artifacts/$artifactId")({
  component: ArtifactDetail,
});

function ArtifactDetail() {
  const { artifactId } = Route.useParams();
  const artifact = useAmc((s) => s.artifacts.find((a) => a.id === artifactId));
  if (!artifact) return <div className="p-6 text-sm text-muted-foreground">Artifact not found.</div>;

  return (
    <>
      <Link to="/artifacts" className="mb-3 inline-flex text-xs text-muted-foreground hover:text-foreground">← All artifacts</Link>

      <div className="rounded-lg border border-border bg-surface p-4 lg:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip status={artifact.status === "approved" ? "completed" : artifact.status === "ready" ? "needs_review" : "running"} label={artifact.status} />
          <span className="font-mono text-[11px] uppercase text-muted-foreground">{artifact.kind}</span>
          <MonoId>{artifact.id}</MonoId>
          <span className="ml-auto text-xs text-muted-foreground"><RelativeTime iso={artifact.created_at} /></span>
        </div>
        <h1 className="mt-3 text-xl font-semibold tracking-tight">{artifact.title}</h1>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <KV label="Confidence"><ConfidenceBar value={artifact.confidence} /></KV>
          <KV label="Sources"><span className="font-mono text-sm">{artifact.sources.length}</span></KV>
          <KV label="Version"><span className="font-mono text-sm">v{artifact.versions[0]?.v ?? 1}</span></KV>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" className="gap-1.5 bg-status-ok text-background hover:bg-status-ok/90"><Check className="h-3.5 w-3.5" /> Approve</Button>
          <Button size="sm" variant="outline" className="gap-1.5"><RotateCcw className="h-3.5 w-3.5" /> Request revision</Button>
          <Button size="sm" variant="outline" className="gap-1.5"><GitCompare className="h-3.5 w-3.5" /> Compare versions</Button>
          <Button size="sm" variant="outline" className="gap-1.5"><Share2 className="h-3.5 w-3.5" /> Share</Button>
          <Button size="sm" variant="outline" className="gap-1.5"><Download className="h-3.5 w-3.5" /> Export</Button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <article className="lg:col-span-2 rounded-lg border border-border bg-surface p-4 lg:p-6">
          <div className="rounded-md border-l-2 border-accent-cyan/60 bg-accent-cyan/5 px-3 py-2 text-sm">
            <div className="text-[11px] uppercase tracking-wider text-accent-cyan">Executive summary</div>
            <div className="mt-1 text-foreground">{artifact.summary}</div>
          </div>
          <div className="prose prose-invert prose-sm mt-4 max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h2:text-base prose-h3:text-sm prose-a:text-accent-cyan prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-muted-foreground prose-code:before:content-none prose-code:after:content-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{artifact.body_md}</ReactMarkdown>
          </div>

          {artifact.key_findings.length > 0 && (
            <Section title="Key findings">
              <ul className="ml-5 list-disc space-y-1 text-sm">
                {artifact.key_findings.map((k, i) => <li key={i}>{k}</li>)}
              </ul>
            </Section>
          )}
          {artifact.assumptions.length > 0 && (
            <Section title="Assumptions">
              <ul className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
                {artifact.assumptions.map((k, i) => <li key={i}>{k}</li>)}
              </ul>
            </Section>
          )}
          {artifact.missing.length > 0 && (
            <Section title="Missing information">
              <ul className="ml-5 list-disc space-y-1 text-sm text-status-warn">
                {artifact.missing.map((k, i) => <li key={i}>{k}</li>)}
              </ul>
            </Section>
          )}
          {artifact.recommended_actions.length > 0 && (
            <Section title="Recommended actions">
              <ul className="ml-5 list-disc space-y-1 text-sm">
                {artifact.recommended_actions.map((k, i) => <li key={i}>{k}</li>)}
              </ul>
            </Section>
          )}
        </article>

        <aside className="space-y-4">
          {artifact.sources.length > 0 && (
            <div>
              <SectionHeader title="Sources" />
              <div className="space-y-2">{artifact.sources.map((s) => <SourceCard key={s.id} source={s} />)}</div>
            </div>
          )}
          <div>
            <SectionHeader title="Version history" />
            <div className="space-y-2">
              {artifact.versions.map((v) => (
                <div key={v.v} className="rounded-md border border-border bg-surface p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono">v{v.v}</span>
                    <RelativeTime iso={v.created_at} />
                  </div>
                  <div className="mt-1 text-muted-foreground">{v.note}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-background p-2.5">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}