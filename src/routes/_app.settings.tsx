import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAmc } from "@/mock/store";
import { PageHeader } from "@/components/amc/PageHeader";
import { SectionHeader, StatusChip } from "@/components/amc/primitives";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ExternalLink, Lock } from "lucide-react";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const agent = useAmc((s) => s.agent);
  const mode = useAmc((s) => s.mode);
  const permission = useAmc((s) => s.permission);
  const resetDemo = useAmc((s) => s.resetDemo);
  const disconnect = useAmc((s) => s.disconnect);
  const navigate = useNavigate();

  return (
    <>
      <PageHeader title="Settings" description="Workspace, connector, and privacy." />

      <Card title="Workspace">
        <Kv label="Workspace">Personal · Founder Ops</Kv>
        <Kv label="Members">1</Kv>
        <Kv label="Plan">Self-hosted (free)</Kv>
      </Card>

      <Card title="Agent instance">
        <Kv label="Name">{agent.name}</Kv>
        <Kv label="Status"><StatusChip status={agent.status} /></Kv>
        <Kv label="Connector version" mono>{agent.connector_version}</Kv>
        <Kv label="Permission mode" mono>{permission}</Kv>
        <Kv label="Connection mode" mono>{mode ?? "—"}</Kv>
      </Card>

      <Card title="Notifications">
        <Row label="Push: approvals required"><Switch defaultChecked /></Row>
        <Row label="Push: mission failures"><Switch defaultChecked /></Row>
        <Row label="Push: cron missed"><Switch defaultChecked /></Row>
        <Row label="Push: artifact ready"><Switch /></Row>
        <p className="mt-2 text-[11px] text-muted-foreground">Web push not wired in MVP. Settings persist for when it lands.</p>
      </Card>

      <Card title="API keys (BYOK)">
        <p className="text-xs text-muted-foreground">
          Hermes uses your own model API keys. The connector never uploads keys by default.
          To allow encrypted key storage in AMC for use across instances, enable it explicitly.
        </p>
        <Row label="Allow encrypted key upload"><Switch /></Row>
      </Card>

      <Card title="Data privacy">
        <p className="text-xs text-muted-foreground">
          AMC stores event metadata, mission timelines, approvals, and artifacts.
          It does not store secrets, full logs, source code, environment variables, or private files.
        </p>
      </Card>

      <Card title="Future connectors">
        <div className="flex items-center gap-3 rounded-md border border-dashed border-border bg-surface p-3">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="text-sm">OpenClaw connector</div>
            <div className="text-xs text-muted-foreground">Coming soon. Adapter-ready.</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-md border border-dashed border-border bg-surface p-3">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="text-sm">Hosted runtime</div>
            <div className="text-xs text-muted-foreground">Run agents without managing the sidecar.</div>
          </div>
        </div>
      </Card>

      <Card title="Open source">
        <ul className="space-y-2 text-sm">
          {[
            { label: "Connector source", href: "https://github.com/" },
            { label: "Protocol spec", href: "https://github.com/" },
            { label: "Community adapters", href: "https://github.com/" },
          ].map((l) => (
            <li key={l.label}>
              <a href={l.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-accent-cyan hover:underline">
                {l.label} <ExternalLink className="h-3 w-3" />
              </a>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Demo">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => { resetDemo(); }}>
            Reset demo data
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-status-fail border-status-fail/40"
            onClick={() => { disconnect(); navigate({ to: "/connect" }); }}
          >
            Disconnect
          </Button>
        </div>
      </Card>
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <SectionHeader title={title} />
      <div className="space-y-2 rounded-lg border border-border bg-surface p-4">{children}</div>
    </section>
  );
}

function Kv({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={mono ? "font-mono text-xs" : ""}>{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div>{label}</div>
      {children}
    </div>
  );
}