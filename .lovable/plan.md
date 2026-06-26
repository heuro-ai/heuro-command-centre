
# Agent Mission Control — MVP Build Plan

A mobile-first, installable PWA that feels like an operator's command center for AI agents. All 10 screens, fully designed, realistic mock data, no backend. Demo Mode connector emits time-sequenced events into an in-memory store so the UI behaves like the real system.

## Visual direction (committed)

- Dark-first operator console. Single theme for v1 (light mode deferred).
- Background `#0A0B0D` / surfaces `#111317` / borders `#1E2128` / text `#E6E8EB` / muted `#8A8F98`.
- Status palette: running `#3B82F6`, healthy/completed `#10B981`, warning/stalled `#F59E0B`, failed `#EF4444`, waiting `#A855F7`, idle `#6B7280`.
- Accent `#7DD3FC` (cyan) for primary actions — restrained, single hue.
- Typography: Inter (UI) + JetBrains Mono (IDs, timestamps, code, metrics). Loaded via `@fontsource` packages.
- Density: Linear/Datadog-style — small type (13–14px body), 4pt spacing grid, crisp 1px borders, no large shadows or gradients.
- Components: status chips, risk pills, monospace IDs, sparkline trends, timeline rails with verified-progress markers, source cards with confidence bars.

## Information architecture

- Mobile bottom tabs: Missions · Chat · Approvals · Artifacts · Automations.
- Top bar (global): agent health pill (online/degraded/offline), active profile, alert count, settings.
- Desktop sidebar: Dashboard · Missions · Chat · Approvals · Artifacts · Automations · Trust · Health · Settings.
- Onboarding/Connect lives outside the shell until paired (or Demo Mode activated).

## Routes (TanStack Start, file-based)

```
src/routes/
  __root.tsx                       // shell + providers + health bar + nav
  index.tsx                        // → /missions (redirect) or /connect if unpaired
  connect.tsx                      // onboarding wizard (multi-step)
  _app.tsx                         // authenticated/paired layout (bottom tabs + sidebar)
  _app.missions.tsx                // dashboard
  _app.missions.$missionId.tsx     // mission detail + timeline
  _app.chat.tsx                    // mission-aware chat
  _app.chat.$missionId.tsx         // chat scoped to a mission
  _app.approvals.tsx               // inbox
  _app.approvals.$approvalId.tsx   // detail sheet (also openable as modal)
  _app.artifacts.tsx               // list
  _app.artifacts.$artifactId.tsx   // viewer
  _app.automations.tsx             // cron health board
  _app.automations.$jobId.tsx      // job detail + run history
  _app.trust.tsx                   // trust center
  _app.health.tsx                  // agent health
  _app.settings.tsx                // workspace, instances, BYOK, privacy
```

## Mock data + event simulator

- `src/mock/types.ts` — TS types matching the spec (Workspace, AgentInstance, Connector, Mission, MissionStep, AgentEvent, ApprovalRequest, Artifact, AutomationJob, AutomationRun, TrustEvent, AuditLog).
- `src/mock/seed.ts` — realistic seed: 5 missions (Daily Founder Briefing, Market Research, Competitor Monitor stalled, Weekly Automation Health, Slack Approval Flow), 4 automations, 3 pending approvals, 6 artifacts with sources/confidence.
- `src/mock/connector.ts` — `MockHermesConnector` class with the same event-emit shape the real Python connector will use (`event_type`, `event_id`, `agent_id`, `mission_id`, `timestamp`, `payload`). Emits heartbeats every 30s, advances the "running" mission's steps, flips approvals, generates artifact events on a timer.
- `src/mock/store.ts` — Zustand store; connector pushes events, reducers update missions/approvals/artifacts/health. Components subscribe via selectors. State persisted to `localStorage` so the demo survives reloads; "Reset demo" in Settings.
- All UI code reads from this store via hooks (`useMissions`, `useApprovals`, …). Swapping in a real WS client later means replacing `MockHermesConnector` only.

## Screen-by-screen build

1. **Connect wizard** (`/connect`) — 7 steps as specced: welcome → method (Local / Remote / Demo) → install command (copyable, with `agent-control connect`) → pairing code `AMC-7K92` + QR placeholder → permission mode (Monitor / Mission control / Full disabled) → connection checks list (Hermes, Gateway, Profile, Model, Cron with live check animation) → success. Clear "what we collect / don't collect" panel. Demo Mode skips pairing and seeds the store.
2. **Mission Dashboard** (`/missions`) — top KPI strip (Active / Waiting / Stalled / Completed today / Automation health % / Hermes status). Mission list with status chip, current step, last-verified-progress relative time, risk pill, ETA, action chip.
3. **Mission Detail** — header (objective, status, agent, autonomy level), vertical timeline with per-step status/duration/tools/validation, current artifact preview card, trust panel (sources, confidence, risk), action bar (Pause/Resume/Cancel/Retry/Ask Hermes/Open logs), collapsible technical logs, verified-progress warning banner when applicable.
4. **Chat** — mission-aware. Left rail (desktop) / sheet (mobile) to pick mission context. Inline structured cards (progress / approval / artifact / error) rendered as first-class blocks, not bubbles. Quick-command chips. Composer with attach + voice placeholder.
5. **Approval Inbox** — list grouped by risk. Card shows requested action, mission, risk, consequence, reversibility, recommendation, timeout countdown. Detail sheet has full context + large Approve / Deny / Edit / Ask Why buttons (mobile-optimized, thumb-reachable).
6. **Artifact Viewer** — document-style layout: title, status, executive summary, key findings, source cards with confidence bars, missing info, assumptions, recommended actions, version history. Action bar: Approve / Request revision / Add sources / Compare versions / Export / Share / Schedule. Markdown rendering for body.
7. **Automations** — table/list with job, schedule (cron string + human), last run, next run, status, success-rate %, consecutive failures, avg duration, last artifact link. Detail view has run history list + simple sparkline of recent durations + retry/pause/notify.
8. **Trust Center** — tabs: Source Quality, Approval History, Validation Results, Risk Events, Audit Log. Memory & Skill governance shown as locked "Coming soon" cards.
9. **Agent Health** — status header, heartbeat age, Hermes version, profile, gateway, channels, model/provider, cron service, recent errors list, connector permission summary. Actions: Refresh / Reconnect / View logs / Test event / Download diagnostic.
10. **Settings** — Workspace · Agent Instances · Connector Setup · Notifications · API Keys (BYOK explainer, no key upload by default) · Data Privacy · Open Source links · Reset Demo Data · Future: OpenClaw connector (disabled).

## Reusable components (`src/components/amc/`)

`StatusChip`, `RiskPill`, `MonoId`, `RelativeTime`, `VerifiedProgressBadge`, `MissionCard`, `MissionTimeline`, `TimelineStep`, `ApprovalCard`, `ArtifactCard`, `SourceCard`, `ConfidenceBar`, `HealthIndicator`, `KpiTile`, `Sparkline` (simple SVG), `EventCard` (chat inline), `Sheet`/`Drawer` wrappers for mobile detail views, `EmptyState`, `SectionHeader`.

## PWA

- `public/manifest.webmanifest` with name "Agent Mission Control", standalone, theme `#0A0B0D`.
- App icons (generated, dark square mark).
- Head tags in `__root.tsx`: manifest link, theme-color, apple-touch-icon.
- No service worker (manifest-only installability per Lovable PWA guidance — offline not in scope for v1).
- Push notifications shown as UI placeholders only (toggle in Settings).

## Copy tone

Direct, operational, calm. Examples wired in throughout: "Hermes is online", "No verified progress for 18 minutes", "Approval required before sending to Slack", "Cron job missed expected run", "Source confidence: medium". No "AI is thinking" style copy anywhere.

## Out of scope (v1)

Real backend, real pairing, auth, push delivery, light theme, OpenClaw connector, memory/skill governance, team features, marketplace. All present in UI as clearly-labeled future states where the spec calls for them.

## Technical notes

- TanStack Start + TanStack Router file-based routes (matches template); no react-router-dom.
- State: Zustand + localStorage persist for the demo store. TanStack Query not needed (no network) but kept available for future.
- Styling: Tailwind v4 tokens in `src/styles.css`, status colors as semantic vars (`--color-status-running` etc.), shadcn components themed via tokens — no hardcoded color classes.
- Fonts via `@fontsource/inter` + `@fontsource/jetbrains-mono`, imported in `src/start.ts` or root.
- Charts: tiny hand-rolled SVG sparkline (no Recharts dependency needed).
- Markdown: `react-markdown` + `remark-gfm` for artifact bodies.
- QR code: `qrcode.react` for the pairing screen.
- Icons: `lucide-react` (already present).

Implementation order: tokens & shell → mock store + connector + seed → Connect wizard → Mission dashboard + detail → Approvals → Artifacts → Automations → Health → Trust → Chat → Settings → PWA manifest/icons → polish pass.
