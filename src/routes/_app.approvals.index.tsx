import { createFileRoute } from "@tanstack/react-router";
import { useAmc } from "@/mock/store";
import { ApprovalCard } from "@/components/amc/ApprovalCard";
import { PageHeader } from "@/components/amc/PageHeader";
import { SectionHeader, EmptyState } from "@/components/amc/primitives";
import { Inbox } from "lucide-react";

export const Route = createFileRoute("/_app/approvals/")({
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const approvals = useAmc((s) => s.approvals);
  const pending = approvals.filter((a) => a.status === "pending");
  const resolved = approvals.filter((a) => a.status !== "pending");

  const high = pending.filter((a) => a.risk === "high");
  const medium = pending.filter((a) => a.risk === "medium");
  const low = pending.filter((a) => a.risk === "low");

  return (
    <>
      <PageHeader
        title="Approval Inbox"
        description="Decisions Hermes is waiting on. Higher risk first."
      />

      {pending.length === 0 && (
        <EmptyState icon={<Inbox className="h-6 w-6" />} title="Inbox zero" description="Nothing waiting on you right now." />
      )}

      {high.length > 0 && (
        <section className="mb-6">
          <SectionHeader title="High risk" />
          <div className="space-y-3">{high.map((a) => <ApprovalCard key={a.id} approval={a} />)}</div>
        </section>
      )}
      {medium.length > 0 && (
        <section className="mb-6">
          <SectionHeader title="Medium risk" />
          <div className="space-y-3">{medium.map((a) => <ApprovalCard key={a.id} approval={a} />)}</div>
        </section>
      )}
      {low.length > 0 && (
        <section className="mb-6">
          <SectionHeader title="Low risk" />
          <div className="space-y-3">{low.map((a) => <ApprovalCard key={a.id} approval={a} />)}</div>
        </section>
      )}

      {resolved.length > 0 && (
        <section className="mt-10">
          <SectionHeader title="Resolved" />
          <div className="space-y-3 opacity-70">
            {resolved.map((a) => <ApprovalCard key={a.id} approval={a} compact />)}
          </div>
        </section>
      )}
    </>
  );
}