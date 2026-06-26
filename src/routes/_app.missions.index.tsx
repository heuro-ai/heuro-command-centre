import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useAmc } from "@/mock/store";
import { KpiTile, SectionHeader } from "@/components/amc/primitives";
import { MissionCard } from "@/components/amc/MissionCard";
import { PageHeader } from "@/components/amc/PageHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/missions/")({
  component: MissionsPage,
});

function MissionsPage() {
  const missions = useAmc((s) => s.missions);
  const approvals = useAmc((s) => s.approvals);
  const automations = useAmc((s) => s.automations);
  const agent = useAmc((s) => s.agent);

  const active = missions.filter((m) => ["running", "waiting", "queued"].includes(m.status));
  const stalled = missions.filter((m) => m.status === "stalled");
  const needsReview = missions.filter((m) => m.status === "needs_review");
  const completedToday = missions.filter(
    (m) => m.status === "completed" && Date.now() - new Date(m.updated_at).getTime() < 86_400_000,
  );
  const pendingApprovals = approvals.filter((a) => a.status === "pending").length;
  const automationHealth = Math.round(
    (automations.reduce((acc, a) => acc + a.success_rate, 0) / automations.length) * 100,
  );

  return (
    <>
      <PageHeader
        title="Mission Dashboard"
        description="What is running, waiting, stuck, and ready for review."
        action={
          <Button size="sm" className="gap-1.5 bg-accent-cyan text-background hover:bg-accent-cyan/90">
            <Plus className="h-4 w-4" />
            New mission
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
        <KpiTile label="Active" value={active.length} hint="running or waiting" />
        <KpiTile label="Awaiting approval" value={pendingApprovals} tone={pendingApprovals > 0 ? "warn" : "default"} hint="needs decision" />
        <KpiTile label="Stalled" value={stalled.length} tone={stalled.length > 0 ? "warn" : "default"} hint="no verified progress" />
        <KpiTile label="Needs review" value={needsReview.length} tone={needsReview.length > 0 ? "warn" : "default"} hint="artifact ready" />
        <KpiTile label="Completed today" value={completedToday.length} tone="ok" hint="last 24h" />
        <KpiTile label="Automation health" value={`${automationHealth}%`} tone={automationHealth >= 90 ? "ok" : "warn"} hint={`${agent.status} · ${agent.profile}`} />
      </div>

      {needsReview.length > 0 && (
        <section className="mt-8">
          <SectionHeader title="Needs review" />
          <div className="grid gap-3 lg:grid-cols-2">
            {needsReview.map((m) => <MissionCard key={m.id} mission={m} />)}
          </div>
        </section>
      )}

      {stalled.length > 0 && (
        <section className="mt-8">
          <SectionHeader title="Stalled" />
          <div className="grid gap-3 lg:grid-cols-2">
            {stalled.map((m) => <MissionCard key={m.id} mission={m} />)}
          </div>
        </section>
      )}

      <section className="mt-8">
        <SectionHeader
          title="Active"
          action={<Link to="/automations" className="text-xs text-muted-foreground hover:text-accent-cyan">View automations →</Link>}
        />
        <div className="grid gap-3 lg:grid-cols-2">
          {active.map((m) => <MissionCard key={m.id} mission={m} />)}
        </div>
      </section>

      {completedToday.length > 0 && (
        <section className="mt-8">
          <SectionHeader title="Completed today" />
          <div className="grid gap-3 lg:grid-cols-2">
            {completedToday.map((m) => <MissionCard key={m.id} mission={m} />)}
          </div>
        </section>
      )}
    </>
  );
}