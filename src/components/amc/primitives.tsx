import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type {
  HealthStatus,
  MissionStatus,
  RiskLevel,
  AutomationStatus,
  StepStatus,
} from "@/mock/types";

const statusMap: Record<string, { label: string; cls: string; dot: string }> = {
  // mission
  queued: { label: "Queued", cls: "text-status-idle border-status-idle/30 bg-status-idle/5", dot: "bg-status-idle" },
  running: { label: "Running", cls: "text-status-running border-status-running/40 bg-status-running/10", dot: "bg-status-running animate-pulse" },
  waiting: { label: "Waiting", cls: "text-status-wait border-status-wait/40 bg-status-wait/10", dot: "bg-status-wait" },
  stalled: { label: "Stalled", cls: "text-status-warn border-status-warn/40 bg-status-warn/10", dot: "bg-status-warn" },
  failed: { label: "Failed", cls: "text-status-fail border-status-fail/40 bg-status-fail/10", dot: "bg-status-fail" },
  needs_review: { label: "Needs review", cls: "text-status-wait border-status-wait/40 bg-status-wait/10", dot: "bg-status-wait" },
  completed: { label: "Completed", cls: "text-status-ok border-status-ok/40 bg-status-ok/10", dot: "bg-status-ok" },
  // automation extras
  healthy: { label: "Healthy", cls: "text-status-ok border-status-ok/40 bg-status-ok/10", dot: "bg-status-ok" },
  missed: { label: "Missed", cls: "text-status-warn border-status-warn/40 bg-status-warn/10", dot: "bg-status-warn" },
  paused: { label: "Paused", cls: "text-status-idle border-status-idle/30 bg-status-idle/5", dot: "bg-status-idle" },
  // step
  pending: { label: "Pending", cls: "text-status-idle border-status-idle/30 bg-status-idle/5", dot: "bg-status-idle" },
  skipped: { label: "Skipped", cls: "text-status-idle border-status-idle/30 bg-status-idle/5", dot: "bg-status-idle" },
  // health
  online: { label: "Online", cls: "text-status-ok border-status-ok/40 bg-status-ok/10", dot: "bg-status-ok" },
  degraded: { label: "Degraded", cls: "text-status-warn border-status-warn/40 bg-status-warn/10", dot: "bg-status-warn" },
  offline: { label: "Offline", cls: "text-status-fail border-status-fail/40 bg-status-fail/10", dot: "bg-status-fail" },
};

export function StatusChip({
  status,
  label,
  className,
}: {
  status: MissionStatus | AutomationStatus | StepStatus | HealthStatus | string;
  label?: string;
  className?: string;
}) {
  const s = statusMap[status] ?? { label: status, cls: "text-muted-foreground border-border bg-muted", dot: "bg-muted-foreground" };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wider",
        s.cls,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {label ?? s.label}
    </span>
  );
}

export function RiskPill({ risk }: { risk: RiskLevel }) {
  const map = {
    low: "text-status-ok border-status-ok/30",
    medium: "text-status-warn border-status-warn/30",
    high: "text-status-fail border-status-fail/30",
  } as const;
  return (
    <span className={cn("inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider", map[risk])}>
      Risk: {risk}
    </span>
  );
}

export function MonoId({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <code className={cn("rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground", className)}>
      {children}
    </code>
  );
}

export function RelativeTime({ iso, prefix }: { iso?: string; prefix?: string }) {
  if (!iso) return <span className="text-muted-foreground">—</span>;
  const ms = Date.now() - new Date(iso).getTime();
  const future = ms < 0;
  const abs = Math.abs(ms);
  const mins = Math.round(abs / 60_000);
  let label = "just now";
  if (mins >= 1 && mins < 60) label = `${mins}m`;
  else if (mins >= 60 && mins < 60 * 24) label = `${Math.round(mins / 60)}h`;
  else if (mins >= 60 * 24) label = `${Math.round(mins / (60 * 24))}d`;
  const suffix = future ? "from now" : "ago";
  return (
    <span className="font-mono text-xs text-muted-foreground">
      {prefix ? `${prefix} ` : ""}
      {label} {label !== "just now" ? suffix : ""}
    </span>
  );
}

export function KpiTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "warn" | "fail" | "ok";
}) {
  const toneCls = {
    default: "text-foreground",
    warn: "text-status-warn",
    fail: "text-status-fail",
    ok: "text-status-ok",
  }[tone];
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-1 font-mono text-2xl font-semibold tabular-nums", toneCls)}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const tone = value >= 0.8 ? "bg-status-ok" : value >= 0.6 ? "bg-status-warn" : "bg-status-fail";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full", tone)} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs text-muted-foreground tabular-nums">{pct}%</span>
    </div>
  );
}

export function Sparkline({ values, width = 80, height = 24 }: { values: number[]; width?: number; height?: number }) {
  if (values.length === 0) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = width / Math.max(values.length - 1, 1);
  const points = values
    .map((v, i) => `${i * step},${height - ((v - min) / range) * height}`)
    .join(" ");
  return (
    <svg width={width} height={height} className="text-status-running">
      <polyline fill="none" stroke="currentColor" strokeWidth="1.5" points={points} />
    </svg>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</h2>
      {action}
    </div>
  );
}

export function EmptyState({ title, description, icon }: { title: string; description?: string; icon?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center">
      {icon && <div className="mb-3 flex justify-center text-muted-foreground">{icon}</div>}
      <div className="text-sm font-medium text-foreground">{title}</div>
      {description && <div className="mt-1 text-xs text-muted-foreground">{description}</div>}
    </div>
  );
}