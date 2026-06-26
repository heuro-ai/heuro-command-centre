import { Link } from "@tanstack/react-router";
import { AlertTriangle, Settings as SettingsIcon } from "lucide-react";
import { useAmc } from "@/mock/store";
import { StatusChip } from "./primitives";

export function HealthBar() {
  const agent = useAmc((s) => s.agent);
  const approvals = useAmc((s) => s.approvals.filter((a) => a.status === "pending").length);
  const stalled = useAmc((s) => s.missions.filter((m) => m.status === "stalled").length);
  const alerts = approvals + stalled;

  return (
    <div className="flex h-12 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur lg:hidden">
      <Link to="/missions" className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-accent-cyan/15 font-mono text-[10px] font-bold text-accent-cyan">
          AMC
        </div>
        <span className="text-sm font-semibold text-foreground">Mission Control</span>
      </Link>
      <div className="flex items-center gap-2">
        <Link to="/health" className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1">
          <StatusChip status={agent.status} />
        </Link>
        {alerts > 0 && (
          <Link to="/approvals" className="relative rounded-md border border-status-warn/40 bg-status-warn/10 p-1.5 text-status-warn">
            <AlertTriangle className="h-4 w-4" />
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-warn px-1 font-mono text-[10px] font-bold text-background">
              {alerts}
            </span>
          </Link>
        )}
        <Link to="/settings" className="rounded-md border border-border p-1.5 text-muted-foreground">
          <SettingsIcon className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export function DesktopHealthStrip() {
  const agent = useAmc((s) => s.agent);
  const approvals = useAmc((s) => s.approvals.filter((a) => a.status === "pending").length);
  const stalled = useAmc((s) => s.missions.filter((m) => m.status === "stalled").length);
  return (
    <div className="hidden h-12 items-center justify-between border-b border-border bg-background/80 px-5 backdrop-blur lg:flex">
      <div className="flex items-center gap-3">
        <Link to="/health" className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1 hover:border-accent-cyan/30">
          <StatusChip status={agent.status} />
          <span className="font-mono text-xs text-muted-foreground">{agent.profile}</span>
          <span className="font-mono text-[11px] text-muted-foreground">· {agent.model}</span>
        </Link>
        {(approvals > 0 || stalled > 0) && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {approvals > 0 && (
              <Link to="/approvals" className="hover:text-foreground">
                <span className="font-mono text-status-wait">{approvals}</span> awaiting approval
              </Link>
            )}
            {stalled > 0 && (
              <Link to="/missions" className="hover:text-foreground">
                <span className="font-mono text-status-warn">{stalled}</span> stalled
              </Link>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-mono">{agent.connector_version}</span>
      </div>
    </div>
  );
}