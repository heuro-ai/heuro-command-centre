export type MissionStatus =
  | "queued"
  | "running"
  | "waiting"
  | "stalled"
  | "failed"
  | "needs_review"
  | "completed";

export type StepStatus = "pending" | "running" | "completed" | "failed" | "skipped";
export type RiskLevel = "low" | "medium" | "high";
export type AutonomyLevel = "observe" | "ask_external" | "ask_high_risk" | "auto_safe";
export type HealthStatus = "online" | "degraded" | "offline";
export type ApprovalStatus = "pending" | "approved" | "denied" | "expired";
export type AutomationStatus =
  | "healthy"
  | "running"
  | "missed"
  | "stalled"
  | "failed"
  | "paused";
export type ConnectionMode = "local" | "remote" | "demo" | null;
export type PermissionMode = "monitor" | "control" | "full";

export interface Source {
  id: string;
  title: string;
  url: string;
  domain: string;
  confidence: number; // 0-1
  cited_in?: string;
}

export interface MissionStep {
  id: string;
  name: string;
  status: StepStatus;
  started_at?: string;
  completed_at?: string;
  summary?: string;
  tools?: string[];
  validated?: boolean;
  error?: string;
  output_artifact_id?: string;
}

export interface Mission {
  id: string;
  title: string;
  objective: string;
  agent_id: string;
  profile: string;
  status: MissionStatus;
  risk: RiskLevel;
  autonomy: AutonomyLevel;
  created_at: string;
  updated_at: string;
  last_verified_progress_at: string;
  eta?: string;
  steps: MissionStep[];
  current_step_index: number;
  artifact_ids: string[];
  sources: Source[];
  confidence: number;
}

export interface Artifact {
  id: string;
  mission_id?: string;
  title: string;
  kind: "briefing" | "research" | "source_pack" | "automation_summary" | "decision_memo" | "error_report";
  status: "draft" | "ready" | "approved" | "needs_revision";
  summary: string;
  body_md: string;
  key_findings: string[];
  assumptions: string[];
  missing: string[];
  recommended_actions: string[];
  sources: Source[];
  confidence: number;
  created_at: string;
  versions: { v: number; created_at: string; note: string }[];
}

export interface ApprovalRequest {
  id: string;
  mission_id: string;
  mission_title: string;
  requested_action: string;
  why: string;
  consequence: string;
  reversible: "yes" | "partial" | "no";
  risk: RiskLevel;
  recommendation: string;
  channel?: string;
  artifact_id?: string;
  timeout_at: string;
  status: ApprovalStatus;
  created_at: string;
}

export interface AutomationRun {
  id: string;
  started_at: string;
  completed_at?: string;
  status: "ok" | "failed" | "missed" | "running";
  duration_ms?: number;
  artifact_id?: string;
  error?: string;
}

export interface AutomationJob {
  id: string;
  name: string;
  schedule: string; // cron
  schedule_human: string;
  status: AutomationStatus;
  last_run_at?: string;
  next_run_at?: string;
  success_rate: number;
  consecutive_failures: number;
  avg_duration_ms: number;
  runs: AutomationRun[];
}

export interface AuditLogEntry {
  id: string;
  at: string;
  event_type: string;
  summary: string;
  actor: string;
  mission_id?: string;
}

export interface TrustEvent {
  id: string;
  at: string;
  kind: "validation" | "risk" | "source";
  mission_id?: string;
  summary: string;
  severity: "info" | "warn" | "high";
}

export interface AgentInstance {
  id: string;
  name: string;
  status: HealthStatus;
  version: string;
  profile: string;
  model: string;
  provider: string;
  gateway: "ok" | "degraded" | "offline";
  cron: "ok" | "degraded" | "offline";
  channels: string[];
  last_heartbeat_at: string;
  permission: PermissionMode;
  connector_version: string;
  recent_errors: { at: string; message: string }[];
}

export interface ChatMessage {
  id: string;
  mission_id?: string;
  role: "user" | "hermes" | "system";
  text?: string;
  at: string;
  card?:
    | { kind: "progress"; mission_id: string; step: string; summary: string }
    | { kind: "approval"; approval_id: string }
    | { kind: "artifact"; artifact_id: string }
    | { kind: "error"; message: string };
}

export interface AgentEvent {
  event_type: string;
  event_id: string;
  agent_id: string;
  mission_id?: string;
  timestamp: string;
  payload: Record<string, unknown>;
}