import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useAmc } from "@/mock/store";
import { ApprovalCard } from "@/components/amc/ApprovalCard";
import { PageHeader } from "@/components/amc/PageHeader";
import { SectionHeader } from "@/components/amc/primitives";

export const Route = createFileRoute("/_app/approvals/$approvalId")({
  component: ApprovalDetail,
});

function ApprovalDetail() {
  const { approvalId } = Route.useParams();
  const approval = useAmc((s) => s.approvals.find((a) => a.id === approvalId));
  const artifact = useAmc((s) =>
    approval?.artifact_id ? s.artifacts.find((a) => a.id === approval.artifact_id) : undefined,
  );

  if (!approval) return <div className="p-6 text-sm text-muted-foreground">Approval not found.</div>;

  return (
    <>
      <Link to="/approvals" className="mb-3 inline-flex text-xs text-muted-foreground hover:text-foreground">← All approvals</Link>
      <PageHeader title="Approval" description={approval.mission_title} />

      <ApprovalCard approval={approval} />

      {artifact && (
        <section className="mt-6">
          <SectionHeader title="Attached artifact" />
          <Link
            to="/artifacts/$artifactId"
            params={{ artifactId: artifact.id }}
            className="block rounded-lg border border-border bg-surface p-4 hover:border-accent-cyan/30"
          >
            <div className="text-xs font-mono uppercase text-muted-foreground">{artifact.kind}</div>
            <div className="mt-1 text-sm font-semibold">{artifact.title}</div>
            <p className="mt-1 text-xs text-muted-foreground">{artifact.summary}</p>
          </Link>
        </section>
      )}
    </>
  );
}