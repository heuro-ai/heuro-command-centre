import type {
  AgentInstance,
  Artifact,
  ApprovalRequest,
  AuditLogEntry,
  AutomationJob,
  ChatMessage,
  Mission,
  TrustEvent,
} from "./types";

const now = Date.now();
const ago = (mins: number) => new Date(now - mins * 60_000).toISOString();
const ahead = (mins: number) => new Date(now + mins * 60_000).toISOString();

export const seedAgent: AgentInstance = {
  id: "agent_hermes_01",
  name: "Hermes (local)",
  status: "online",
  version: "0.14.2",
  profile: "founder-ops",
  model: "claude-sonnet-4.5",
  provider: "Anthropic via gateway",
  gateway: "ok",
  cron: "ok",
  channels: ["slack:leadership", "email", "notion"],
  last_heartbeat_at: ago(0.2),
  permission: "control",
  connector_version: "agent-control 0.3.1",
  recent_errors: [
    { at: ago(120), message: "Rate limit hit on serpapi.com, retried after 14s" },
  ],
};

export const seedSources = [
  {
    id: "src_1",
    title: "Anthropic — Claude 4.5 release notes",
    url: "https://anthropic.com/news/claude-4-5",
    domain: "anthropic.com",
    confidence: 0.95,
  },
  {
    id: "src_2",
    title: "OpenClaw monthly digest, June 2026",
    url: "https://openclaw.dev/digest/2026-06",
    domain: "openclaw.dev",
    confidence: 0.88,
  },
  {
    id: "src_3",
    title: "Hermes GitHub — release v0.14",
    url: "https://github.com/hermes-agent/hermes/releases/tag/v0.14",
    domain: "github.com",
    confidence: 0.92,
  },
  {
    id: "src_4",
    title: "TechCrunch — Agent control planes raise $40M",
    url: "https://techcrunch.com/2026/06/24/agent-control-raise",
    domain: "techcrunch.com",
    confidence: 0.7,
  },
  {
    id: "src_5",
    title: "HN discussion — supervising long-running agents",
    url: "https://news.ycombinator.com/item?id=49120311",
    domain: "news.ycombinator.com",
    confidence: 0.55,
  },
];

export const seedArtifacts: Artifact[] = [
  {
    id: "art_briefing_06_26",
    mission_id: "mission_briefing",
    title: "Daily Founder Briefing — Jun 26, 2026",
    kind: "briefing",
    status: "ready",
    summary:
      "Agent-control space saw two funding events and a notable OpenClaw release. Hermes ecosystem activity is up 22% week-over-week. One competitor shipped a mission-templates marketplace.",
    body_md: `## Executive summary

Agent-control startups raised **$58M** combined this week. **OpenClaw 0.9** ships scoped permissions, narrowing the gap with Hermes. A new entrant, *Conductor*, launched a mission-template marketplace.

## Top 5 market signals

1. **Funding** — AgentOps Inc. raised $40M Series A (Sequoia lead).
2. **Release** — OpenClaw 0.9 with scoped MCP permissions.
3. **Adoption** — Hermes GitHub stars +18% WoW.
4. **Pricing** — Conductor undercuts at $19/seat.
5. **Regulation** — EU AI Act draft adds disclosure for autonomous agents.

## Recommended actions

- Ship the Trust Center MVP this week to defend on governance.
- Reach out to AgentOps for distribution.
`,
    key_findings: [
      "OpenClaw 0.9 closes the permissions gap with Hermes.",
      "Conductor is the first credible mission-template marketplace.",
      "Hermes adoption accelerating: +18% stars WoW.",
    ],
    assumptions: [
      "GitHub stars are a directional proxy for adoption, not revenue.",
      "Conductor pricing reflects launch promo; expect normalization in 60d.",
    ],
    missing: [
      "AgentOps customer count not disclosed.",
      "No primary source on EU draft language yet.",
    ],
    recommended_actions: [
      "Prioritize Trust Center launch this week.",
      "Open conversation with AgentOps BD.",
      "Draft positioning vs. Conductor marketplace.",
    ],
    sources: seedSources.slice(0, 4),
    confidence: 0.78,
    created_at: ago(35),
    versions: [
      { v: 2, created_at: ago(35), note: "Added EU regulation signal" },
      { v: 1, created_at: ago(95), note: "Initial draft" },
    ],
  },
  {
    id: "art_market_research",
    mission_id: "mission_market_research",
    title: "Market Research — Agent Control Apps",
    kind: "research",
    status: "draft",
    summary:
      "Survey of 14 products positioning around agent supervision. Three patterns emerge: chat-first (Telegram bots), IDE-first (Hermes Desktop), and dashboard-first (this category).",
    body_md: `## Landscape

14 products surveyed across **chat-first**, **IDE-first**, and **dashboard-first** patterns. Dashboard-first is the smallest and youngest segment but has the strongest retention signal.

## Players

- Conductor — dashboard-first, marketplace play.
- AgentOps — observability-first, weak approvals UX.
- HermesDesktop — IDE-first, no remote control.
`,
    key_findings: [
      "Dashboard-first segment is youngest but retains best.",
      "Approvals UX is broadly poor across the category.",
    ],
    assumptions: ["Retention signals based on public testimonials, not internal data."],
    missing: ["Pricing for 6 of 14 products."],
    recommended_actions: ["Interview 3 operators in next 2 weeks."],
    sources: seedSources.slice(1, 5),
    confidence: 0.62,
    created_at: ago(180),
    versions: [{ v: 1, created_at: ago(180), note: "Initial scan" }],
  },
  {
    id: "art_automation_health",
    title: "Weekly Automation Health Report",
    kind: "automation_summary",
    status: "approved",
    summary:
      "All 4 automations ran this week. 1 missed run on competitor monitor (gateway timeout). Overall success rate: 94%.",
    body_md: `## Summary\n\n- 4 automations active\n- 28 runs total\n- 26 success / 1 failed / 1 missed\n- Average runtime down 11% WoW\n`,
    key_findings: ["Competitor monitor needs gateway retry tuning."],
    assumptions: [],
    missing: [],
    recommended_actions: ["Increase gateway timeout to 45s for competitor monitor."],
    sources: [],
    confidence: 0.9,
    created_at: ago(1440),
    versions: [{ v: 1, created_at: ago(1440), note: "Generated" }],
  },
];

export const seedMissions: Mission[] = [
  {
    id: "mission_briefing",
    title: "Daily Founder Briefing",
    objective:
      "Produce a daily briefing covering market signals, competitor activity, and recommended actions for the founder.",
    agent_id: "agent_hermes_01",
    profile: "founder-ops",
    status: "needs_review",
    risk: "low",
    autonomy: "ask_external",
    created_at: ago(120),
    updated_at: ago(35),
    last_verified_progress_at: ago(35),
    steps: [
      { id: "s1", name: "Goal interpreted", status: "completed", started_at: ago(120), completed_at: ago(119), summary: "Briefing for 2026-06-26", tools: ["planner"], validated: true },
      { id: "s2", name: "Plan generated", status: "completed", started_at: ago(119), completed_at: ago(115), summary: "12-step research plan", tools: ["planner"], validated: true },
      { id: "s3", name: "Sources selected", status: "completed", started_at: ago(115), completed_at: ago(110), summary: "9 sources, 2 paywalled skipped", tools: ["search", "rank"], validated: true },
      { id: "s4", name: "Data collected", status: "completed", started_at: ago(110), completed_at: ago(60), summary: "9 pages fetched, 2 PDFs parsed", tools: ["fetch", "pdf"], validated: true },
      { id: "s5", name: "Artifact drafted", status: "completed", started_at: ago(60), completed_at: ago(40), summary: "Briefing markdown drafted, 5 key findings", tools: ["writer"], validated: true, output_artifact_id: "art_briefing_06_26" },
      { id: "s6", name: "Validation", status: "completed", started_at: ago(40), completed_at: ago(36), summary: "Citation check passed, 1 source confidence flagged medium", tools: ["validator"], validated: true },
      { id: "s7", name: "Review required", status: "running", started_at: ago(36), summary: "Awaiting human review before publishing to Slack", tools: ["approval"] },
    ],
    current_step_index: 6,
    artifact_ids: ["art_briefing_06_26"],
    sources: seedSources.slice(0, 4),
    confidence: 0.78,
    eta: ahead(5),
  },
  {
    id: "mission_market_research",
    title: "Market Research: Agent Control Apps",
    objective: "Survey landscape of agent supervision tools and identify positioning opportunities.",
    agent_id: "agent_hermes_01",
    profile: "founder-ops",
    status: "running",
    risk: "low",
    autonomy: "ask_external",
    created_at: ago(220),
    updated_at: ago(2),
    last_verified_progress_at: ago(4),
    steps: [
      { id: "s1", name: "Goal interpreted", status: "completed", started_at: ago(220), completed_at: ago(219), tools: ["planner"], validated: true },
      { id: "s2", name: "Plan generated", status: "completed", started_at: ago(219), completed_at: ago(215), tools: ["planner"], validated: true },
      { id: "s3", name: "Sources selected", status: "completed", started_at: ago(215), completed_at: ago(200), tools: ["search"], validated: true },
      { id: "s4", name: "Data collected", status: "running", started_at: ago(200), summary: "11/14 products profiled", tools: ["fetch"] },
      { id: "s5", name: "Artifact drafted", status: "pending" },
      { id: "s6", name: "Validation", status: "pending" },
      { id: "s7", name: "Review required", status: "pending" },
    ],
    current_step_index: 3,
    artifact_ids: ["art_market_research"],
    sources: seedSources.slice(1, 5),
    confidence: 0.62,
    eta: ahead(25),
  },
  {
    id: "mission_competitor",
    title: "Competitor Monitor: Hermes / OpenClaw",
    objective: "Track competitor activity and surface meaningful changes daily.",
    agent_id: "agent_hermes_01",
    profile: "ops",
    status: "stalled",
    risk: "medium",
    autonomy: "ask_external",
    created_at: ago(60),
    updated_at: ago(18),
    last_verified_progress_at: ago(18),
    steps: [
      { id: "s1", name: "Goal interpreted", status: "completed", started_at: ago(60), completed_at: ago(59), tools: ["planner"], validated: true },
      { id: "s2", name: "Plan generated", status: "completed", started_at: ago(59), completed_at: ago(58), tools: ["planner"], validated: true },
      { id: "s3", name: "Sources selected", status: "completed", started_at: ago(58), completed_at: ago(55), tools: ["search"], validated: true },
      { id: "s4", name: "Data collected", status: "running", started_at: ago(55), summary: "Activity detected but no output for 18m", tools: ["fetch", "diff"] },
      { id: "s5", name: "Artifact drafted", status: "pending" },
    ],
    current_step_index: 3,
    artifact_ids: [],
    sources: seedSources.slice(2, 4),
    confidence: 0.5,
  },
  {
    id: "mission_health_report",
    title: "Weekly Automation Health Report",
    objective: "Roll up health metrics across all automations weekly.",
    agent_id: "agent_hermes_01",
    profile: "ops",
    status: "completed",
    risk: "low",
    autonomy: "auto_safe",
    created_at: ago(1500),
    updated_at: ago(1440),
    last_verified_progress_at: ago(1440),
    steps: [
      { id: "s1", name: "Goal interpreted", status: "completed", started_at: ago(1500), completed_at: ago(1499), validated: true },
      { id: "s2", name: "Metrics collected", status: "completed", started_at: ago(1499), completed_at: ago(1480), validated: true },
      { id: "s3", name: "Report drafted", status: "completed", started_at: ago(1480), completed_at: ago(1440), validated: true, output_artifact_id: "art_automation_health" },
    ],
    current_step_index: 2,
    artifact_ids: ["art_automation_health"],
    sources: [],
    confidence: 0.9,
  },
  {
    id: "mission_slack_test",
    title: "Slack Approval Flow Test",
    objective: "Validate end-to-end approval flow before enabling for production missions.",
    agent_id: "agent_hermes_01",
    profile: "ops",
    status: "waiting",
    risk: "medium",
    autonomy: "ask_external",
    created_at: ago(45),
    updated_at: ago(8),
    last_verified_progress_at: ago(8),
    steps: [
      { id: "s1", name: "Goal interpreted", status: "completed", started_at: ago(45), completed_at: ago(44), validated: true },
      { id: "s2", name: "Plan generated", status: "completed", started_at: ago(44), completed_at: ago(40), validated: true },
      { id: "s3", name: "Approval requested", status: "running", started_at: ago(8), summary: "Waiting on approval for test message", tools: ["approval"] },
    ],
    current_step_index: 2,
    artifact_ids: [],
    sources: [],
    confidence: 0.7,
  },
];

export const seedApprovals: ApprovalRequest[] = [
  {
    id: "appr_briefing_slack",
    mission_id: "mission_briefing",
    mission_title: "Daily Founder Briefing",
    requested_action: "Send Daily Founder Briefing to Slack #leadership",
    why: "Briefing is ready and validated. Default channel is #leadership.",
    consequence: "Visible to 12 workspace members. Cannot be unsent after 1 minute.",
    reversible: "partial",
    risk: "medium",
    recommendation: "Review artifact before sending.",
    channel: "slack:#leadership",
    artifact_id: "art_briefing_06_26",
    timeout_at: ahead(25),
    status: "pending",
    created_at: ago(8),
  },
  {
    id: "appr_slack_test",
    mission_id: "mission_slack_test",
    mission_title: "Slack Approval Flow Test",
    requested_action: "Post test message to Slack #automation-tests",
    why: "Validating approval round-trip.",
    consequence: "Visible to 3 workspace members. Reversible.",
    reversible: "yes",
    risk: "low",
    recommendation: "Safe to approve.",
    channel: "slack:#automation-tests",
    timeout_at: ahead(120),
    status: "pending",
    created_at: ago(8),
  },
  {
    id: "appr_competitor_email",
    mission_id: "mission_competitor",
    mission_title: "Competitor Monitor: Hermes / OpenClaw",
    requested_action: "Email summary to founders@",
    why: "Detected 3 changes worth flagging.",
    consequence: "Sends to 4 founders. Cannot be unsent.",
    reversible: "no",
    risk: "high",
    recommendation: "Review changes before approving.",
    channel: "email:founders@company.com",
    timeout_at: ahead(60),
    status: "pending",
    created_at: ago(2),
  },
];

export const seedAutomations: AutomationJob[] = [
  {
    id: "auto_briefing",
    name: "Daily Briefing Bot",
    schedule: "0 7 * * *",
    schedule_human: "Every day at 07:00",
    status: "healthy",
    last_run_at: ago(35),
    next_run_at: ahead(60 * 23),
    success_rate: 0.97,
    consecutive_failures: 0,
    avg_duration_ms: 92_000,
    runs: Array.from({ length: 10 }).map((_, i) => ({
      id: `r${i}`,
      started_at: ago(35 + i * 1440),
      completed_at: ago(35 + i * 1440 - 1.5),
      status: i === 7 ? "failed" : "ok",
      duration_ms: 80_000 + Math.round(Math.random() * 40_000),
      artifact_id: i === 0 ? "art_briefing_06_26" : undefined,
      error: i === 7 ? "Source rate-limit, retried but timed out" : undefined,
    })),
  },
  {
    id: "auto_competitor",
    name: "Competitor Monitor",
    schedule: "*/30 * * * *",
    schedule_human: "Every 30 minutes",
    status: "missed",
    last_run_at: ago(95),
    next_run_at: ahead(5),
    success_rate: 0.81,
    consecutive_failures: 1,
    avg_duration_ms: 18_000,
    runs: [
      { id: "r0", started_at: ago(95), status: "missed", error: "No heartbeat from connector during scheduled window" },
      { id: "r1", started_at: ago(125), completed_at: ago(124.5), status: "ok", duration_ms: 16_000 },
      { id: "r2", started_at: ago(155), completed_at: ago(154.6), status: "ok", duration_ms: 17_000 },
    ],
  },
  {
    id: "auto_github_watcher",
    name: "GitHub Issue Watcher",
    schedule: "*/15 * * * *",
    schedule_human: "Every 15 minutes",
    status: "failed",
    last_run_at: ago(12),
    next_run_at: ahead(3),
    success_rate: 0.66,
    consecutive_failures: 2,
    avg_duration_ms: 9_000,
    runs: [
      { id: "r0", started_at: ago(12), completed_at: ago(11.8), status: "failed", duration_ms: 9_500, error: "GitHub 5xx, exhausted retries" },
      { id: "r1", started_at: ago(27), completed_at: ago(26.8), status: "failed", duration_ms: 9_200, error: "GitHub 5xx, exhausted retries" },
      { id: "r2", started_at: ago(42), completed_at: ago(41.8), status: "ok", duration_ms: 8_900 },
    ],
  },
  {
    id: "auto_weekly_report",
    name: "Weekly Automation Health Report",
    schedule: "0 9 * * 1",
    schedule_human: "Mondays at 09:00",
    status: "healthy",
    last_run_at: ago(1440),
    next_run_at: ahead(60 * 24 * 3),
    success_rate: 1,
    consecutive_failures: 0,
    avg_duration_ms: 45_000,
    runs: [
      { id: "r0", started_at: ago(1440), completed_at: ago(1439.2), status: "ok", duration_ms: 45_000, artifact_id: "art_automation_health" },
    ],
  },
];

export const seedAudit: AuditLogEntry[] = [
  { id: "log1", at: ago(2), event_type: "approval.requested", summary: "Competitor monitor requested email send", actor: "hermes", mission_id: "mission_competitor" },
  { id: "log2", at: ago(8), event_type: "approval.requested", summary: "Briefing requested Slack send to #leadership", actor: "hermes", mission_id: "mission_briefing" },
  { id: "log3", at: ago(35), event_type: "artifact.created", summary: "Daily Founder Briefing v2 drafted", actor: "hermes", mission_id: "mission_briefing" },
  { id: "log4", at: ago(95), event_type: "cron.missed", summary: "Competitor Monitor missed scheduled run", actor: "scheduler" },
  { id: "log5", at: ago(120), event_type: "mission.started", summary: "Daily Founder Briefing started", actor: "scheduler", mission_id: "mission_briefing" },
  { id: "log6", at: ago(1440), event_type: "mission.completed", summary: "Weekly Automation Health Report completed", actor: "hermes", mission_id: "mission_health_report" },
];

export const seedTrustEvents: TrustEvent[] = [
  { id: "t1", at: ago(36), kind: "validation", mission_id: "mission_briefing", summary: "Citation check passed; 1 source confidence flagged medium", severity: "info" },
  { id: "t2", at: ago(95), kind: "risk", mission_id: "mission_competitor", summary: "Cron missed expected run", severity: "warn" },
  { id: "t3", at: ago(120), kind: "source", mission_id: "mission_briefing", summary: "Excluded paywalled source: ft.com", severity: "info" },
  { id: "t4", at: ago(2), kind: "risk", mission_id: "mission_competitor", summary: "High-risk approval requested: send email to 4 recipients", severity: "high" },
];

export const seedChat: ChatMessage[] = [
  { id: "c1", mission_id: "mission_briefing", role: "user", text: "What's the status of the briefing?", at: ago(10) },
  { id: "c2", mission_id: "mission_briefing", role: "hermes", at: ago(10), card: { kind: "progress", mission_id: "mission_briefing", step: "Review required", summary: "Validated and waiting on your approval to publish." } },
  { id: "c3", mission_id: "mission_briefing", role: "hermes", at: ago(10), card: { kind: "approval", approval_id: "appr_briefing_slack" } },
  { id: "c4", mission_id: "mission_briefing", role: "user", text: "Open the artifact.", at: ago(9) },
  { id: "c5", mission_id: "mission_briefing", role: "hermes", at: ago(9), card: { kind: "artifact", artifact_id: "art_briefing_06_26" } },
];