import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bot,
  Check,
  Cloud,
  Copy,
  Eye,
  Globe,
  Loader2,
  Lock,
  PlayCircle,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useAmc } from "@/mock/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PermissionMode } from "@/mock/types";

export const Route = createFileRoute("/connect")({
  component: ConnectWizard,
});

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type Method = "local" | "remote" | "demo";

const STEPS = ["Welcome", "Method", "Install", "Pair", "Permissions", "Check", "Done"];

function ConnectWizard() {
  const [step, setStep] = useState<Step>(0);
  const [method, setMethod] = useState<Method>("local");
  const [permission, setPermission] = useState<PermissionMode>("control");
  const setConnected = useAmc((s) => s.setConnected);
  const resetDemo = useAmc((s) => s.resetDemo);
  const navigate = useNavigate();

  const next = () => setStep((s) => Math.min(6, (s + 1) as Step));
  const back = () => setStep((s) => Math.max(0, (s - 1) as Step));

  const finish = () => {
    if (method === "demo") resetDemo();
    else setConnected(method, permission);
    navigate({ to: "/missions" });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-4">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-accent-cyan/15 font-mono text-[10px] font-bold text-accent-cyan">
            AMC
          </div>
          <div className="text-sm font-semibold">Agent Mission Control</div>
          <div className="ml-auto font-mono text-[11px] text-muted-foreground">
            Step {step + 1}/{STEPS.length}
          </div>
        </div>
        <div className="mx-auto flex max-w-3xl gap-1 px-4 pb-3">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-0.5 flex-1 rounded-full",
                i <= step ? "bg-accent-cyan" : "bg-border",
              )}
            />
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8">
        {step === 0 && (
          <StepCard title="Connect your Hermes agent." subtitle="A visual operations layer for the agents you already run.">
            <p className="text-sm text-muted-foreground">
              Mission Control is a supervision surface — not a chat app. You'll see missions,
              approvals, artifacts, and automation health in one place. Connect once and
              everything updates in real time.
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <Bullet>Mission timelines with verified-progress markers.</Bullet>
              <Bullet>Inbox-style approvals with full context and reversibility.</Bullet>
              <Bullet>Cron and automation health that surfaces missed runs.</Bullet>
              <Bullet>Artifact viewer with sources and confidence.</Bullet>
            </ul>
          </StepCard>
        )}

        {step === 1 && (
          <StepCard title="Choose connection method" subtitle="You can change this later in Settings.">
            <div className="space-y-3">
              <MethodOption icon={Terminal} title="Local connector" desc="Recommended. Run a small sidecar next to Hermes on your machine." selected={method === "local"} onClick={() => setMethod("local")} />
              <MethodOption icon={Globe} title="Remote Hermes endpoint" desc="Point AMC at an existing Hermes instance reachable over HTTPS." selected={method === "remote"} onClick={() => setMethod("remote")} />
              <MethodOption icon={PlayCircle} title="Demo mode" desc="Explore the product with realistic mock missions, approvals, and artifacts." selected={method === "demo"} onClick={() => setMethod("demo")} />
            </div>
          </StepCard>
        )}

        {step === 2 && method === "local" && (
          <StepCard title="One-command setup" subtitle="Run this on the machine where Hermes is installed.">
            <CopyBlock command="curl -sSL https://agentmissioncontrol.dev/install.sh | bash" />
            <CopyBlock command="agent-control connect" />
            <DataNotice />
          </StepCard>
        )}

        {step === 2 && method === "remote" && (
          <StepCard title="Remote Hermes endpoint" subtitle="Provide a reachable Hermes API endpoint.">
            <label className="block text-xs uppercase tracking-wider text-muted-foreground">Endpoint</label>
            <input className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-accent-cyan/40" defaultValue="https://hermes.your-domain.com" />
            <label className="mt-3 block text-xs uppercase tracking-wider text-muted-foreground">Bearer token</label>
            <input className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-accent-cyan/40" placeholder="hms_…" />
            <DataNotice />
          </StepCard>
        )}

        {step === 2 && method === "demo" && (
          <StepCard title="Demo mode" subtitle="No Hermes instance required.">
            <div className="rounded-lg border border-accent-cyan/30 bg-accent-cyan/5 p-4 text-sm">
              <div className="flex items-center gap-2 text-accent-cyan">
                <Cloud className="h-4 w-4" />
                Loaded with realistic missions, approvals, artifacts, and cron jobs.
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                You can reset demo data at any time from Settings.
              </div>
            </div>
          </StepCard>
        )}

        {step === 3 && method !== "demo" && (
          <StepCard title="Pair this device" subtitle="Enter the pairing code shown by the connector, or scan the QR.">
            <div className="grid items-center gap-6 sm:grid-cols-2">
              <div className="flex items-center justify-center rounded-lg border border-border bg-surface p-6">
                <div className="rounded-md bg-white p-3">
                  <QRCodeSVG value="https://agentmissioncontrol.dev/pair/AMC-7K92" size={144} />
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Pairing code</div>
                <div className="mt-1 font-mono text-2xl tracking-widest text-accent-cyan">AMC-7K92</div>
                <div className="mt-3 text-xs text-muted-foreground">Expires in 2 minutes. Single-use. PKCE-protected.</div>
              </div>
            </div>
          </StepCard>
        )}

        {step === 3 && method === "demo" && (
          <StepCard title="Pairing skipped" subtitle="Demo mode uses a mock connector — no pairing needed.">
            <DataNotice />
          </StepCard>
        )}

        {step === 4 && (
          <StepCard title="Permission mode" subtitle="What can Mission Control do with your Hermes agent?">
            <div className="space-y-3">
              <PermissionOption icon={Eye} title="Monitor only" desc="Read events, health, and artifacts. No control commands." selected={permission === "monitor"} onClick={() => setPermission("monitor")} />
              <PermissionOption icon={ShieldCheck} title="Mission control" desc="Start, pause, retry, and approve. Cannot change connector config or upload keys." selected={permission === "control"} onClick={() => setPermission("control")} />
              <PermissionOption icon={Lock} title="Full control" desc="Connector-side config and key management. Disabled in MVP for safety." selected={false} onClick={() => {}} disabled />
            </div>
          </StepCard>
        )}

        {step === 5 && <ConnectionCheck onReady={() => next()} />}

        {step === 6 && (
          <StepCard title="Hermes connected." subtitle="Start monitoring missions.">
            <div className="rounded-lg border border-status-ok/30 bg-status-ok/5 p-4 text-sm text-status-ok">
              <div className="flex items-center gap-2 font-medium">
                <Check className="h-4 w-4" /> All systems healthy.
              </div>
              <ul className="mt-2 space-y-1 text-xs text-status-ok/80">
                <li>· Hermes 0.14.2 detected on profile <span className="font-mono">founder-ops</span></li>
                <li>· Gateway and cron service responding</li>
                <li>· Connector subscribed for events</li>
              </ul>
            </div>
          </StepCard>
        )}

        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={back} disabled={step === 0}>Back</Button>
          {step < 6 ? (
            <Button
              size="sm"
              className="gap-1.5 bg-accent-cyan text-background hover:bg-accent-cyan/90"
              onClick={next}
              disabled={step === 5}
            >
              {step === 4 ? "Run checks" : "Continue"} <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              size="sm"
              className="gap-1.5 bg-accent-cyan text-background hover:bg-accent-cyan/90"
              onClick={finish}
            >
              Open Mission Control <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 lg:p-7">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-status-ok" />
      <span>{children}</span>
    </li>
  );
}

function MethodOption({
  icon: Icon, title, desc, selected, onClick,
}: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
        selected ? "border-accent-cyan/40 bg-accent-cyan/5" : "border-border bg-surface hover:border-border/80",
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", selected ? "text-accent-cyan" : "text-muted-foreground")} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
      </div>
      {selected && <Check className="h-4 w-4 shrink-0 text-accent-cyan" />}
    </button>
  );
}

function PermissionOption(props: Parameters<typeof MethodOption>[0] & { disabled?: boolean }) {
  if (!props.disabled) return <MethodOption {...props} />;
  return (
    <div className="flex w-full items-start gap-3 rounded-lg border border-dashed border-border p-3 opacity-60">
      <props.icon className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{props.title} <span className="ml-1 text-xs text-muted-foreground">— Coming soon</span></div>
        <div className="mt-0.5 text-xs text-muted-foreground">{props.desc}</div>
      </div>
    </div>
  );
}

function CopyBlock({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mb-3 flex items-center gap-2 rounded-md border border-border bg-background p-3">
      <Terminal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <code className="flex-1 overflow-x-auto whitespace-nowrap text-xs text-foreground">{command}</code>
      <button
        onClick={() => { navigator.clipboard?.writeText(command); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
        className="rounded p-1 text-muted-foreground hover:text-foreground"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-status-ok" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function DataNotice() {
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <div className="rounded-md border border-border bg-background p-3 text-xs">
        <div className="font-medium text-foreground">What we collect</div>
        <ul className="mt-1 space-y-0.5 text-muted-foreground">
          <li>· Heartbeats and health snapshots</li>
          <li>· Mission and step events</li>
          <li>· Cron status</li>
          <li>· Approval requests</li>
          <li>· Artifact metadata</li>
          <li>· Errors</li>
        </ul>
      </div>
      <div className="rounded-md border border-border bg-background p-3 text-xs">
        <div className="font-medium text-foreground">Not collected by default</div>
        <ul className="mt-1 space-y-0.5 text-muted-foreground">
          <li>· Secrets and API keys</li>
          <li>· Full execution logs</li>
          <li>· Source code</li>
          <li>· Environment variables</li>
          <li>· Private files</li>
        </ul>
      </div>
    </div>
  );
}

function ConnectionCheck({ onReady }: { onReady: () => void }) {
  const checks = [
    "Hermes detected",
    "Gateway responding",
    "Active profile loaded",
    "Model / provider verified",
    "Cron service healthy",
  ];
  const [done, setDone] = useState(0);
  useEffect(() => {
    if (done >= checks.length) {
      const t = setTimeout(onReady, 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setDone((d) => d + 1), 600);
    return () => clearTimeout(t);
  }, [done, onReady]);

  return (
    <StepCard title="Running connection checks" subtitle="Verifying everything Hermes needs to operate.">
      <ol className="space-y-2">
        {checks.map((c, i) => (
          <li key={c} className="flex items-center gap-3 rounded-md border border-border bg-surface p-3 text-sm">
            {i < done ? (
              <Check className="h-4 w-4 text-status-ok" />
            ) : i === done ? (
              <Loader2 className="h-4 w-4 animate-spin text-accent-cyan" />
            ) : (
              <span className="h-4 w-4 rounded-full border border-border" />
            )}
            <span className={i <= done ? "text-foreground" : "text-muted-foreground"}>{c}</span>
          </li>
        ))}
      </ol>
    </StepCard>
  );
}