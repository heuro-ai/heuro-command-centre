import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Eye,
  Loader2,
  Lock,
  Radar,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useAmc } from "@/mock/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PermissionMode } from "@/mock/types";

export const Route = createFileRoute("/connect")({
  component: ConnectScreen,
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === "string" ? s.token : undefined,
    link: typeof s.link === "string" ? s.link : undefined,
  }),
});

type AgentSource = "link" | "deeplink" | "discovery";
type ParsedAgent = {
  name: string;
  version: string;
  profile: string;
  fingerprint: string;
  endpoint: string;
  source: AgentSource;
};

type ParseResult = { ok: true; agent: ParsedAgent } | { ok: false; error: string };

function parseConnectLink(raw: string, source: AgentSource = "link"): ParseResult {
  const input = raw.trim();
  if (!input) return { ok: false, error: "Paste a connect link from Hermes." };
  let url: URL | null = null;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, error: "That doesn't look like a connect link." };
  }
  const isHermes = url.protocol === "hermes:" && url.host === "connect";
  const isPair = /agentmissioncontrol\.dev$/.test(url.hostname) && url.pathname.startsWith("/pair");
  if (!isHermes && !isPair) {
    return { ok: false, error: "Use a hermes:// link or an agentmissioncontrol.dev/pair URL." };
  }
  const token = url.searchParams.get("token") ?? url.pathname.split("/").pop() ?? "";
  if (!token) return { ok: false, error: "Missing token in connect link." };
  return {
    ok: true,
    agent: {
      name: url.searchParams.get("name") ?? "Hermes",
      version: url.searchParams.get("v") ?? "0.14.2",
      profile: url.searchParams.get("profile") ?? "founder-ops",
      fingerprint: `hms_${token.slice(0, 6)}…${token.slice(-6)}`,
      endpoint: isHermes ? "remote agent" : url.host,
      source,
    },
  };
}

type Probe = "scanning" | "found" | "not_found";

function ConnectScreen() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const setConnected = useAmc((s) => s.setConnected);
  const resetDemo = useAmc((s) => s.resetDemo);

  const [linkInput, setLinkInput] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedAgent | null>(null);
  const [permission, setPermission] = useState<PermissionMode>("control");
  const [connecting, setConnecting] = useState(false);
  const [showManual, setShowManual] = useState(false);

  // Localhost auto-discovery — the seamless path. Probes the agent's loopback
  // endpoint. Mocked here; swap fetch in for the real Hermes /amc/discover.
  const [probe, setProbe] = useState<Probe>("scanning");
  const [discovered, setDiscovered] = useState<ParsedAgent | null>(null);

  async function runProbe() {
    setProbe("scanning");
    setDiscovered(null);
    await new Promise((r) => setTimeout(r, 900));
    // Mock: 80% chance the agent is found.
    if (Math.random() < 0.8) {
      setDiscovered({
        name: "Hermes",
        version: "0.14.2",
        profile: "founder-ops",
        fingerprint: "hms_9f3a7e2c41b8d6f0a2e1",
        endpoint: "127.0.0.1:18789",
        source: "discovery",
      });
      setProbe("found");
    } else {
      setProbe("not_found");
    }
  }

  useEffect(() => {
    runProbe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deep-link override: ?token=… or ?link=…
  useEffect(() => {
    const deep = search.link ?? (search.token ? `hermes://connect?token=${search.token}` : "");
    if (!deep) return;
    const r = parseConnectLink(deep, "deeplink");
    if (r.ok) setParsed(r.agent);
  }, [search.link, search.token]);

  function onLinkChange(v: string) {
    setLinkInput(v);
    setLinkError(null);
    if (!v.trim()) return;
    const r = parseConnectLink(v);
    if (r.ok) setParsed(r.agent);
    else if (v.includes("://")) setLinkError(r.error);
  }

  function confirm() {
    setConnecting(true);
    setTimeout(() => {
      setConnected("local", permission);
      navigate({ to: "/missions" });
    }, 1100);
  }

  function enterDemo() {
    resetDemo();
    navigate({ to: "/missions" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-4">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-accent-cyan/15 font-mono text-[10px] font-bold text-accent-cyan">
            AMC
          </div>
          <div className="text-sm font-semibold">Agent Mission Control</div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-10 lg:py-16">
        {!parsed ? (
          <>
            <DiscoverCard
              probe={probe}
              agent={discovered}
              onRescan={runProbe}
              onPair={() => discovered && setParsed(discovered)}
              onDemo={enterDemo}
            />
            <TrustCard />
            <ManualDisclosure open={showManual} onToggle={() => setShowManual((v) => !v)}>
              <PairCard
                linkInput={linkInput}
                linkError={linkError}
                onLinkChange={onLinkChange}
              />
            </ManualDisclosure>
          </>
        ) : (
          <ConfirmCard
            agent={parsed}
            permission={permission}
            onPermission={setPermission}
            connecting={connecting}
            onConfirm={confirm}
            onCancel={() => {
              setParsed(null);
              setLinkInput("");
            }}
          />
        )}
      </div>
    </div>
  );
}

function DiscoverCard({
  probe,
  agent,
  onRescan,
  onPair,
  onDemo,
}: {
  probe: Probe;
  agent: ParsedAgent | null;
  onRescan: () => void;
  onPair: () => void;
  onDemo: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 lg:p-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {probe === "found" ? "Hermes is right here." : probe === "not_found" ? "No agent on this machine." : "Looking for Hermes…"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {probe === "found"
              ? "We detected your agent on this machine. One click to pair — nothing to copy."
              : probe === "not_found"
                ? "Start Hermes and enable AMC pairing, then rescan."
                : "Scanning your machine for a running agent. Nothing leaves your browser."}
          </p>
        </div>
        <ProbePill probe={probe} />
      </div>

      {probe === "scanning" && (
        <div className="mt-6 flex items-center gap-3 rounded-lg border border-border bg-background/40 p-4">
          <Radar className="h-5 w-5 animate-pulse text-accent-cyan" />
          <div className="flex-1">
            <div className="text-sm">Probing <code className="font-mono">127.0.0.1:18789</code></div>
            <div className="text-xs text-muted-foreground">Local loopback only. No network calls leave your device.</div>
          </div>
        </div>
      )}

      {probe === "found" && agent && (
        <div className="mt-6 rounded-lg border border-status-ok/30 bg-status-ok/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-status-ok/15 px-2 py-0.5 text-[11px] font-medium text-status-ok">
                <Check className="h-3 w-3" /> Detected
              </div>
              <div className="mt-2 text-base font-semibold">
                {agent.name} <span className="font-mono text-xs font-normal text-muted-foreground">v{agent.version}</span>
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                {agent.endpoint} · {agent.profile}
              </div>
            </div>
            <Button
              size="sm"
              onClick={onPair}
              className="gap-1.5 bg-accent-cyan text-background hover:bg-accent-cyan/90"
            >
              Pair <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {probe === "not_found" && (
        <div className="mt-6 space-y-3">
          <div className="rounded-lg border border-border bg-background/40 p-4 text-sm">
            <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
              <li>Open Hermes and make sure it's running.</li>
              <li>Enable <span className="font-mono text-foreground">Allow AMC pairing</span> in Hermes → Settings.</li>
              <li>Click rescan below.</li>
            </ol>
          </div>
          <button
            onClick={onRescan}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-surface"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Rescan
          </button>
        </div>
      )}

      <div className="mt-6 flex items-center gap-1.5 text-xs">
        <Sparkles className="h-3.5 w-3.5 text-accent-cyan" />
        <span className="text-muted-foreground">Just exploring?</span>
        <button onClick={onDemo} className="font-medium text-accent-cyan hover:underline">
          Enter Demo Mode →
        </button>
      </div>
    </div>
  );
}

function ProbePill({ probe }: { probe: Probe }) {
  if (probe === "found") {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-status-ok/30 bg-status-ok/10 px-2 py-0.5 text-[11px] font-medium text-status-ok">
        <Wifi className="h-3 w-3" /> Online
      </div>
    );
  }
  if (probe === "not_found") {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2 py-0.5 text-[11px] text-muted-foreground">
        <WifiOff className="h-3 w-3" /> Offline
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2 py-0.5 text-[11px] text-muted-foreground">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-cyan opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-cyan" />
      </span>
      Scanning
    </div>
  );
}

function TrustCard() {
  const items = [
    { icon: ShieldCheck, title: "End-to-end local", desc: "Pairing happens on 127.0.0.1. Your token never leaves the loopback." },
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
  open,
  onToggle,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-1.5 rounded-md border border-border bg-surface/50 px-3 py-2 text-xs text-muted-foreground hover:bg-surface hover:text-foreground"
      >
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        Agent on another machine? Paste a link instead
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function PairCard(props: {
  linkInput: string;
  linkError: string | null;
  onLinkChange: (v: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
        Connect link from Hermes
      </label>
      <input
        value={props.linkInput}
        onChange={(e) => props.onLinkChange(e.target.value)}
        placeholder="hermes://connect?token=…"
        className={cn(
          "mt-2 w-full rounded-md border bg-background px-3.5 py-3 font-mono text-sm outline-none transition-colors",
          props.linkError
            ? "border-status-error/50 focus:border-status-error"
            : "border-border focus:border-accent-cyan/50",
        )}
      />
      {props.linkError && <div className="mt-1.5 text-xs text-status-error">{props.linkError}</div>}
      <div className="mt-2 text-[11px] text-muted-foreground">
        In Hermes, run <code className="font-mono text-foreground">hermes pair</code> and copy the link it prints.
      </div>
    </div>
  );
}

function ConfirmCard(props: {
  agent: ParsedAgent;
  permission: PermissionMode;
  onPermission: (p: PermissionMode) => void;
  connecting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { agent } = props;
  const sourceLabel =
    agent.source === "deeplink" ? "Deep link" : agent.source === "discovery" ? "Local discovery" : "Connect link";
  return (
    <div className="rounded-xl border border-border bg-surface p-6 lg:p-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-status-ok/30 bg-status-ok/10 px-2 py-0.5 text-[11px] font-medium text-status-ok">
            <Check className="h-3 w-3" /> Agent detected
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">{agent.name}</h1>
          <div className="mt-1 font-mono text-xs text-muted-foreground">
            v{agent.version} · {agent.endpoint}
          </div>
        </div>
        {!props.connecting && (
          <button
            onClick={props.onCancel}
            className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-border bg-background/50 p-4 text-xs">
        <Field label="Profile" value={agent.profile} mono />
        <Field label="Pairing via" value={sourceLabel} />
        <div className="col-span-2">
          <Field label="Fingerprint" value={agent.fingerprint} mono />
        </div>
      </dl>

      <div className="mt-6">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Permission</div>
        <div className="mt-2 space-y-2">
          <PermOpt
            icon={Eye}
            title="Monitor only"
            desc="Read events, health, artifacts. No control."
            selected={props.permission === "monitor"}
            onClick={() => props.onPermission("monitor")}
          />
          <PermOpt
            icon={ShieldCheck}
            title="Mission control"
            desc="Start, pause, retry, approve."
            selected={props.permission === "control"}
            onClick={() => props.onPermission("control")}
          />
          <PermOpt icon={Lock} title="Full control" desc="Connector config & keys." disabled />
        </div>
      </div>

      <div className="mt-7 flex items-center justify-between">
        <button
          onClick={props.onCancel}
          disabled={props.connecting}
          className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          Use a different agent
        </button>
        <Button
          size="sm"
          onClick={props.onConfirm}
          disabled={props.connecting}
          className="gap-1.5 bg-accent-cyan text-background hover:bg-accent-cyan/90"
        >
          {props.connecting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Connecting…
            </>
          ) : (
            <>
              Connect agent <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </Button>
      </div>
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

function PermOpt({
  icon: Icon,
  title,
  desc,
  selected,
  onClick,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <div className="flex items-start gap-2.5 rounded-md border border-dashed border-border p-2.5 text-xs opacity-50">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div>
          <div className="font-medium">
            {title} <span className="text-muted-foreground">— Coming soon</span>
          </div>
          <div className="text-muted-foreground">{desc}</div>
        </div>
      </div>
    );
  }
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-md border p-2.5 text-left text-xs transition-colors",
        selected ? "border-accent-cyan/40 bg-accent-cyan/5" : "border-border hover:border-border/80",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", selected ? "text-accent-cyan" : "text-muted-foreground")} />
      <div className="flex-1">
        <div className="font-medium">{title}</div>
        <div className="text-muted-foreground">{desc}</div>
      </div>
      {selected && <Check className="h-3.5 w-3.5 shrink-0 text-accent-cyan" />}
    </button>
  );
}