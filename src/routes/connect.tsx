import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  Download,
  Eye,
  Loader2,
  Lock,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAmc } from "@/mock/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createPairingToken, checkPairingStatus } from "@/lib/agents.functions";

export const Route = createFileRoute("/connect")({
  component: ConnectScreen,
});

type PairState =
  | { kind: "idle" }
  | { kind: "issuing" }
  | { kind: "waiting"; token: string; expiresAt: string }
  | { kind: "expired"; token: string }
  | { kind: "claimed"; agent: ClaimedAgent };

type ClaimedAgent = {
  id: string;
  name: string;
  version: string | null;
  profile: string | null;
  endpoint: string | null;
  fingerprint: string;
  permission: "monitor" | "control" | "full";
};

function ConnectScreen() {
  const navigate = useNavigate();
  const setConnected = useAmc((s) => s.setConnected);
  const resetDemo = useAmc((s) => s.resetDemo);

  const issueToken = useServerFn(createPairingToken);
  const pollStatus = useServerFn(checkPairingStatus);

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [state, setState] = useState<PairState>({ kind: "idle" });
  const [showManual, setShowManual] = useState(false);
  const pollRef = useRef<number | null>(null);

  // Gate: require auth.
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      if (!data.session) navigate({ to: "/auth", replace: true });
      else setAuthed(true);
    });
    return () => {
      alive = false;
    };
  }, [navigate]);

  async function issue() {
    setState({ kind: "issuing" });
    try {
      const { token, expiresAt } = await issueToken();
      setState({ kind: "waiting", token, expiresAt });
    } catch (e) {
      setState({ kind: "idle" });
      console.error(e);
    }
  }

  // Poll for claim while waiting.
  useEffect(() => {
    if (state.kind !== "waiting") return;
    let stopped = false;
    async function tick() {
      try {
        const result = await pollStatus({ data: { token: (state as { token: string }).token } });
        if (stopped) return;
        if (result.state === "claimed" && result.agent) {
          setState({ kind: "claimed", agent: result.agent as ClaimedAgent });
        } else if (result.state === "expired") {
          setState({ kind: "expired", token: (state as { token: string }).token });
        }
      } catch {
        // transient errors are fine — keep polling
      }
    }
    pollRef.current = window.setInterval(tick, 2000) as unknown as number;
    tick();
    return () => {
      stopped = true;
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [state, pollStatus]);

  function confirmAndEnter() {
    if (state.kind !== "claimed") return;
    setConnected("remote", state.agent.permission === "monitor" ? "monitor" : "control");
    navigate({ to: "/missions" });
  }

  function signOut() {
    supabase.auth.signOut().then(() => navigate({ to: "/auth", replace: true }));
  }

  function enterDemo() {
    resetDemo();
    navigate({ to: "/missions" });
  }

  if (authed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-accent-cyan/15 font-mono text-[10px] font-bold text-accent-cyan">
              AMC
            </div>
            <div className="text-sm font-semibold">Agent Mission Control</div>
          </div>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-3 w-3" /> Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-10 lg:py-16">
        {state.kind === "claimed" ? (
          <ConfirmCard agent={state.agent} onConfirm={confirmAndEnter} onUndo={() => setState({ kind: "idle" })} />
        ) : (
          <PairCard
            state={state}
            onIssue={issue}
            onRegenerate={issue}
          />
        )}

        <TrustCard />

        <ManualDisclosure open={showManual} onToggle={() => setShowManual((v) => !v)}>
          <SourceInstructions />
        </ManualDisclosure>

        <div className="mt-6 text-center text-xs">
          <button onClick={enterDemo} className="text-muted-foreground hover:text-foreground">
            Just exploring? Enter Demo Mode →
          </button>
        </div>
      </div>
    </div>
  );
}

function PairCard({
  state,
  onIssue,
  onRegenerate,
}: {
  state: PairState;
  onIssue: () => void;
  onRegenerate: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const token = state.kind === "waiting" || state.kind === "expired" ? state.token : "";

  function copy(value: string) {
    navigator.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6 lg:p-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Connect Hermes</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            One token, signed handshake, end-to-end. Your code and keys stay on your machine.
          </p>
        </div>
        {state.kind === "waiting" && <WaitingPill />}
      </div>

      {state.kind === "idle" && (
        <div className="mt-6">
          <Button
            onClick={onIssue}
            className="gap-1.5 bg-accent-cyan text-background hover:bg-accent-cyan/90"
          >
            Generate pairing token <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <div className="mt-2 text-[11px] text-muted-foreground">
            Valid for 10 minutes. Single use. Bound to your account.
          </div>
        </div>
      )}

      {state.kind === "issuing" && (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Generating…
        </div>
      )}

      {(state.kind === "waiting" || state.kind === "expired") && (
        <>
          <div className="mt-6 rounded-lg border border-border bg-background/40 p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Your pairing token</div>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 truncate font-mono text-base text-foreground">{token}</code>
              <button
                onClick={() => copy(token)}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] hover:bg-surface"
              >
                {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
              </button>
            </div>
            {state.kind === "expired" && (
              <div className="mt-2 text-xs text-status-error">Token expired — generate a new one.</div>
            )}
          </div>

          <ol className="mt-5 space-y-3 text-sm">
            <Step n={1} title="Install the connector once">
              <a
                href="/hermes/amc_connector.py"
                download
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-surface"
              >
                <Download className="h-3.5 w-3.5" /> Download amc_connector.py
              </a>
              <div className="mt-1.5 text-[11px] text-muted-foreground">
                Drop it into <code className="font-mono">~/.hermes/plugins/</code> on the machine running Hermes.
              </div>
            </Step>
            <Step n={2} title="Run Hermes — it'll ask for the token">
              <code className="block rounded-md border border-border bg-background px-3 py-2 font-mono text-xs">
                # paste the token above when prompted
              </code>
              <div className="mt-1.5 text-[11px] text-muted-foreground">
                Or run non-interactively: <code className="font-mono">AMC_PAIRING_TOKEN={token || "…"} hermes start</code>
              </div>
            </Step>
          </ol>

          <div className="mt-5 flex items-center justify-between">
            <button
              onClick={onRegenerate}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-3 w-3" /> Generate new token
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ConfirmCard({
  agent,
  onConfirm,
  onUndo,
}: {
  agent: ClaimedAgent;
  onConfirm: () => void;
  onUndo: () => void;
}) {
  return (
    <div className="rounded-xl border border-status-ok/40 bg-surface p-6 lg:p-8">
      <div className="inline-flex items-center gap-1.5 rounded-full border border-status-ok/30 bg-status-ok/10 px-2 py-0.5 text-[11px] font-medium text-status-ok">
        <Check className="h-3 w-3" /> Agent bonded
      </div>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{agent.name}</h1>
      <div className="mt-1 font-mono text-xs text-muted-foreground">
        v{agent.version ?? "?"} · {agent.endpoint ?? "unknown host"}
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-border bg-background/50 p-4 text-xs">
        <Field label="Profile" value={agent.profile ?? "default"} mono />
        <Field label="Permission" value={agent.permission} />
        <div className="col-span-2">
          <Field label="Fingerprint" value={agent.fingerprint} mono />
        </div>
      </dl>

      <div className="mt-6 flex items-center justify-between">
        <button onClick={onUndo} className="text-xs text-muted-foreground hover:text-foreground">
          Cancel
        </button>
        <Button
          onClick={onConfirm}
          className="gap-1.5 bg-accent-cyan text-background hover:bg-accent-cyan/90"
        >
          Enter Mission Control <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function WaitingPill() {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2 py-0.5 text-[11px] text-muted-foreground">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-cyan opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-cyan" />
      </span>
      Waiting for agent
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-background text-[11px] font-mono text-muted-foreground">
        {n}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="mt-1.5">{children}</div>
      </div>
    </li>
  );
}

function TrustCard() {
  const items = [
    { icon: ShieldCheck, title: "HMAC-signed", desc: "Every event signed with your agent's secret. We verify before insert." },
    { icon: Lock, title: "Zero secrets shared", desc: "We never see code, API keys, env vars, or files — only event metadata." },
    { icon: Eye, title: "Revoke instantly", desc: "Disconnect from Settings; the token is invalidated immediately." },
  ];
  return (
    <div className="mt-4 rounded-xl border border-border bg-surface/60 p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-accent-cyan" /> Why this is safe
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {items.map((it) => (
          <div key={it.title} className="rounded-lg border border-border bg-background/40 p-3">
            <it.icon className="h-4 w-4 text-accent-cyan" />
            <div className="mt-1.5 text-xs font-medium">{it.title}</div>
            <div className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{it.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ManualDisclosure({
  open, onToggle, children,
}: { open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-1.5 rounded-md border border-border bg-surface/50 px-3 py-2 text-xs text-muted-foreground hover:bg-surface hover:text-foreground"
      >
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        How does the connector know what to send?
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function SourceInstructions() {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 text-xs leading-relaxed text-muted-foreground">
      <div className="flex items-center gap-1.5 text-foreground">
        <Terminal className="h-3.5 w-3.5" /> Plugin contract
      </div>
      <p className="mt-2">
        The connector subscribes to Hermes' <code className="font-mono">event_publisher</code> hooks
        (<code>mission.started</code>, <code>mission.step</code>, <code>approval.requested</code>,
        <code>artifact.created</code>, <code>automation.run</code>, …), buffers them, and ships in batches
        every ~1.5s. Each batch is signed{" "}
        <code className="font-mono">HMAC-SHA256(sha256(secret), body)</code> and verified server-side.
      </p>
      <p className="mt-2">
        The plaintext secret stays in <code className="font-mono">~/.hermes/amc.json</code> (chmod 600).
        The server only stores its SHA-256 — the secret is never reconstructable from a DB leak.
      </p>
      <Link to="/connect" className="mt-3 inline-block text-accent-cyan hover:underline">
        Source: <code className="font-mono">public/hermes/amc_connector.py</code>
      </Link>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5 truncate text-foreground", mono ? "font-mono text-xs" : "text-sm")}>{value}</dd>
    </div>
  );
}