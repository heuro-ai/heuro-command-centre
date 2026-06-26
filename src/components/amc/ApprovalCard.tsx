import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Hash, Mail } from "lucide-react";
import type { ApprovalRequest } from "@/mock/types";
import { useAmc } from "@/mock/store";
import { MonoId, RelativeTime, RiskPill, StatusChip } from "./primitives";
import { Button } from "@/components/ui/button";

function ChannelIcon({ channel }: { channel?: string }) {
  if (!channel) return null;
  if (channel.startsWith("slack:")) return <Hash className="h-3.5 w-3.5" />;
  if (channel.startsWith("email:")) return <Mail className="h-3.5 w-3.5" />;
  return null;
}

export function ApprovalCard({ approval, compact = false }: { approval: ApprovalRequest; compact?: boolean }) {
  const resolve = useAmc((s) => s.resolveApproval);

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip
          status={approval.status === "pending" ? "waiting" : approval.status === "approved" ? "completed" : "failed"}
          label={approval.status === "pending" ? "Awaiting decision" : approval.status}
        />
        <RiskPill risk={approval.risk} />
        <MonoId>{approval.id.replace("appr_", "a_")}</MonoId>
        <span className="ml-auto">
          <RelativeTime iso={approval.timeout_at} prefix="Timeout" />
        </span>
      </div>

      <Link
        to="/approvals/$approvalId"
        params={{ approvalId: approval.id }}
        className="group mt-3 block"
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground group-hover:text-accent-cyan">
            {approval.requested_action}
          </h3>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{approval.mission_title}</div>
      </Link>

      {!compact && (
        <div className="mt-3 space-y-2 text-xs">
          <Row label="Why">{approval.why}</Row>
          <Row label="Consequence">{approval.consequence}</Row>
          <Row label="Reversible">
            <span className="font-mono">{approval.reversible}</span>
          </Row>
          {approval.channel && (
            <Row label="Target">
              <span className="inline-flex items-center gap-1.5 font-mono">
                <ChannelIcon channel={approval.channel} />
                {approval.channel}
              </span>
            </Row>
          )}
          <Row label="Recommendation">{approval.recommendation}</Row>
        </div>
      )}

      {approval.status === "pending" && (
        <div className="mt-4 flex gap-2">
          <Button
            size="sm"
            className="h-9 flex-1 bg-status-ok text-background hover:bg-status-ok/90"
            onClick={() => resolve(approval.id, "approved")}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 flex-1 border-status-fail/40 text-status-fail hover:bg-status-fail/10"
            onClick={() => resolve(approval.id, "denied")}
          >
            Deny
          </Button>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="w-24 shrink-0 text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="min-w-0 flex-1 text-foreground">{children}</div>
    </div>
  );
}