import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Eye,
  Link2,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
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

type ParsedAgent = {
  name: string;
  version: string;
  profile: string;
  fingerprint: string;
  endpoint: string;
  source: "link" | "code" | "deeplink";
};

type ParseResult =
  | { ok: true; agent: ParsedAgent }
  | { ok: false; error: string };

const CODE_RE = /^[A-Z0-9]{3}-?[A-Z0-9]{3}$/;

function parseConnectLink(raw: string, source: ParsedAgent["source"] = "link"): ParseResult {
  const input = raw.trim();
  if (!input) return { ok: false, error: "Paste a connect link or pairing code." };

  // Pairing code path
  const codeNormalized = input.toUpperCase().replace(/\s+/g, "");
  if (CODE_RE.test(codeNormalized)) {
    const code = codeNormalized.length === 6
      ? `${codeNormalized.slice(0, 3)}-${codeNormalized.slice(3)}`
      : codeNormalized;
    return {
      ok: true,
      agent: {
        name: "Hermes",
        version: "0.14.2",
        profile: "founder-ops",
        fingerprint: `hms_${code.replace("-", "").toLowerCase()}9f3a7e2c41b8`,
        endpoint: "local connector",
        source: "code",
      },
    };
  }

  // URL path: hermes://connect?... or https://agentmissioncontrol.dev/pair?...
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
      endpoint: isHermes ? "local connector" : url.host,
      source,
    },
  };
}

function ConnectScreen() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const setConnected = useAmc((s) => s.setConnected);
  const resetDemo = useAmc((s) => s.resetDemo);

  const [linkInput, setLinkInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [parsed, setParsed] = useState<ParsedAgent | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [permission, setPermission] = useState<PermissionMode>("control");
  const [connecting, setConnecting] = useState(false);
  const [showDataNotice, setShowDataNotice] = useState(false);

  // Deep-link handling: ?token=… or ?link=…
  useEffect(() => {
    const deepToken = search.link ?? (search.token ? `hermes://connect?token=${search.token}` : "");
    if (!deepToken) return;
    const result = parseConnectLink(deepToken, "deeplink");
    if (result.ok) setParsed(result.agent);
  }, [search.link, search.token]);

  function onLinkChange(v: string) {
    setLinkInput(v);
    setLinkError(null);
    if (!v.trim()) return;
    const result = parseConnectLink(v);
    if (result.ok) {
      setParsed(result.agent);
      setCodeInput("");
    } else if (v.includes("://") || v.length > 12) {
      setLinkError(result.error);
    }
  }

  function onCodeChange(v: string) {
    const raw = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    const formatted = raw.length > 3 ? `${raw.slice(0, 3)}-${raw.slice(3)}` : raw;
    setCodeInput(formatted);
    setCodeError(null);
    if (raw.length === 6) {
      const result = parseConnectLink(formatted, "code");
      if (result.ok) {
        setParsed(result.agent);
        setLinkInput("");
      } else {
        setCodeError(result.error);
      }
    }
  }

  function confirm() {
    setConnecting(true);
    setTimeout(() => {
      setConnected("local", permission);
      navigate({ to: "/missions" });
    }, 1200);
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
          <PairCard
            linkInput={linkInput}
            codeInput={codeInput}
            linkError={linkError}
            codeError={codeError}
            onLinkChange={onLinkChange}
            onCodeChange={onCodeChange}
            onDemo={enterDemo}
          />
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
              setCodeInput("");
            }}
          />
        )}

        <DataNoticeDisclosure open={showDataNotice} onToggle={() => setShowDataNotice((v) => !v)} />
      </div>
    </div>
  );
}

function PairCard(props: {
  linkInput: string;
  codeInput: string;
  linkError: string | null;
  codeError: string | null;
  onLinkChange: (v: string) => void;
  onCodeChange: (v: string) => void;
  onDemo: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 lg:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Connect your Hermes agent.</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Paste a connect link from your Hermes dashboard. That's it.
      </p>

      <div className="mt-6">
        <label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
          <Link2 className="h-3 w-3" /> Connect link
        </label>
        <input
          autoFocus
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
        {props.linkError && (
          <div className="mt-1.5 text-xs text-status-error">{props.linkError}</div>
        )}
        <div className="mt-1.5 text-xs text-muted-foreground">
          Auto-detects on paste. Also accepts <span className="font-mono">agentmissioncontrol.dev/pair/…</span>
        </div>
      </div>

      <Divider label="or" />

      <div>
        <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Pairing code
        </label>
        <input
          value={props.codeInput}
          onChange={(e) => props.onCodeChange(e.target.value)}
          placeholder="H3K-9QF"
          maxLength={7}
          className={cn(
            "mt-2 w-44 rounded-md border bg-background px-3.5 py-2.5 font-mono text-base tracking-[0.2em] uppercase outline-none transition-colors",
            props.codeError
              ? "border-status-error/50 focus:border-status-error"
              : "border-border focus:border-accent-cyan/50",
          )}
        />
        {props.codeError && (
          <div className="mt-1.5 text-xs text-status-error">{props.codeError}</div>
        )}
      </div>

      <div className="mt-7 rounded-lg border border-dashed border-border bg-background/40 p-3.5 text-xs text-muted-foreground">
        <div className="font-medium text-foreground">Open from Hermes</div>
        <div className="mt-0.5">
          Click <span className="text-foreground">Open in Mission Control</span> from your Hermes dashboard
          and this page fills in automatically.
        </div>
      </div>

      <div className="mt-5 flex items-center gap-1.5 text-xs">
        <Sparkles className="h-3.5 w-3.5 text-accent-cyan" />
        <span className="text-muted-foreground">Just exploring?</span>
        <button
          onClick={props.onDemo}
          className="font-medium text-accent-cyan hover:underline"
        >
          Enter Demo Mode →
        </button>
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
        <Field label="Pairing via" value={agent.source === "deeplink" ? "Deep link" : agent.source === "code" ? "Pairing code" : "Connect link"} />
        <div className="col-span-2">
          <Field label="Fingerprint" value={agent.fingerprint} mono />
        </div>
      </dl>

      <div className="mt-6">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Permission</div>
        <div className="mt-2 space-y-2">
          <PermOpt icon={Eye} title="Monitor only" desc="Read events, health, artifacts. No control."
            selected={props.permission === "monitor"} onClick={() => props.onPermission("monitor")} />
          <PermOpt icon={ShieldCheck} title="Mission control" desc="Start, pause, retry, approve."
            selected={props.permission === "control"} onClick={() => props.onPermission("control")} />
          <PermOpt icon={Lock} title="Full control" desc="Connector config & keys." disabled />
        </div>
      </div>

      <div className="mt-7 flex items-center justify-between">
        <button
          onClick={props.onCancel}
          disabled={props.connecting}
          className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          Use a different link
        </button>
        <Button
          size="sm"
          onClick={props.onConfirm}
          disabled={props.connecting}
          className="gap-1.5 bg-accent-cyan text-background hover:bg-accent-cyan/90"
        >
          {props.connecting ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Connecting…</>
          ) : (
            <>Connect agent <ArrowRight className="h-3.5 w-3.5" /></>
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
  icon: Icon, title, desc, selected, onClick, disabled,
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
          <div className="font-medium">{title} <span className="text-muted-foreground">— Coming soon</span></div>
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

function Divider({ label }: { label: string }) {
  return (
    <div className="my-6 flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function DataNoticeDisclosure({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div className="mt-5">
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        What gets shared
      </button>
      {open && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-border bg-surface p-3 text-xs">
            <div className="font-medium text-foreground">Collected</div>
            <ul className="mt-1 space-y-0.5 text-muted-foreground">
              <li>· Heartbeats and health snapshots</li>
              <li>· Mission and step events</li>
              <li>· Cron status</li>
              <li>· Approval requests</li>
              <li>· Artifact metadata</li>
              <li>· Errors</li>
            </ul>
          </div>
          <div className="rounded-md border border-border bg-surface p-3 text-xs">
            <div className="font-medium text-foreground">Never collected</div>
            <ul className="mt-1 space-y-0.5 text-muted-foreground">
              <li>· Secrets and API keys</li>
              <li>· Full execution logs</li>
              <li>· Source code</li>
              <li>· Environment variables</li>
              <li>· Private files</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}