import { Check, CircleDashed, AlertTriangle, Loader2 } from "lucide-react";
import type { MissionStep } from "@/mock/types";
import { cn } from "@/lib/utils";
import { RelativeTime } from "./primitives";

function StepIcon({ status }: { status: MissionStep["status"] }) {
  const base = "h-4 w-4";
  if (status === "completed") return <Check className={cn(base, "text-status-ok")} />;
  if (status === "running") return <Loader2 className={cn(base, "animate-spin text-status-running")} />;
  if (status === "failed") return <AlertTriangle className={cn(base, "text-status-fail")} />;
  return <CircleDashed className={cn(base, "text-status-idle")} />;
}

export function MissionTimeline({ steps }: { steps: MissionStep[] }) {
  return (
    <ol className="relative space-y-0">
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        return (
          <li key={step.id} className="relative pl-8">
            {!last && (
              <span
                className={cn(
                  "absolute left-[7px] top-6 h-full w-px",
                  step.status === "completed" ? "bg-status-ok/40" : "bg-border",
                )}
              />
            )}
            <span className="absolute left-0 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-background">
              <StepIcon status={step.status} />
            </span>
            <div className="pb-5">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-sm font-medium text-foreground">{step.name}</div>
                <div className="flex items-center gap-2">
                  {step.validated && (
                    <span className="text-[10px] font-medium uppercase tracking-wider text-status-ok">
                      Verified
                    </span>
                  )}
                  {step.completed_at && <RelativeTime iso={step.completed_at} />}
                </div>
              </div>
              {step.summary && (
                <div className="mt-1 text-xs text-muted-foreground">{step.summary}</div>
              )}
              {step.tools && step.tools.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {step.tools.map((t) => (
                    <code
                      key={t}
                      className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {t}
                    </code>
                  ))}
                </div>
              )}
              {step.error && (
                <div className="mt-1 text-xs text-status-fail">{step.error}</div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}