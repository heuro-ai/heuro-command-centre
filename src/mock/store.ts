import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AgentInstance,
  ApprovalRequest,
  Artifact,
  AuditLogEntry,
  AutomationJob,
  ChatMessage,
  ConnectionMode,
  Mission,
  PermissionMode,
  TrustEvent,
} from "./types";
import {
  seedAgent,
  seedApprovals,
  seedArtifacts,
  seedAudit,
  seedAutomations,
  seedChat,
  seedMissions,
  seedTrustEvents,
} from "./seed";

interface AmcState {
  connected: boolean;
  mode: ConnectionMode;
  permission: PermissionMode;
  agent: AgentInstance;
  missions: Mission[];
  approvals: ApprovalRequest[];
  artifacts: Artifact[];
  automations: AutomationJob[];
  audit: AuditLogEntry[];
  trust: TrustEvent[];
  chat: ChatMessage[];
  tick: number;

  setConnected: (mode: ConnectionMode, permission: PermissionMode) => void;
  disconnect: () => void;
  resetDemo: () => void;

  // mutations driven by mock connector / UI
  updateMission: (id: string, patch: Partial<Mission>) => void;
  advanceTick: () => void;
  resolveApproval: (id: string, decision: "approved" | "denied") => void;
  addChat: (m: ChatMessage) => void;
  pushAudit: (entry: AuditLogEntry) => void;
}

const initial = () => ({
  agent: { ...seedAgent },
  missions: structuredClone(seedMissions),
  approvals: structuredClone(seedApprovals),
  artifacts: structuredClone(seedArtifacts),
  automations: structuredClone(seedAutomations),
  audit: structuredClone(seedAudit),
  trust: structuredClone(seedTrustEvents),
  chat: structuredClone(seedChat),
  tick: 0,
});

export const useAmc = create<AmcState>()(
  persist(
    (set, get) => ({
      connected: false,
      mode: null,
      permission: "control",
      ...initial(),

      setConnected: (mode, permission) =>
        set({ connected: true, mode, permission }),
      disconnect: () => set({ connected: false, mode: null }),
      resetDemo: () =>
        set({ connected: true, mode: "demo", permission: "control", ...initial() }),

      updateMission: (id, patch) =>
        set((s) => ({
          missions: s.missions.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        })),

      advanceTick: () => set((s) => ({ tick: s.tick + 1 })),

      resolveApproval: (id, decision) =>
        set((s) => {
          const approval = s.approvals.find((a) => a.id === id);
          const audit: AuditLogEntry = {
            id: `log_${Date.now()}`,
            at: new Date().toISOString(),
            event_type: decision === "approved" ? "approval.granted" : "approval.denied",
            summary: approval
              ? `${decision === "approved" ? "Approved" : "Denied"}: ${approval.requested_action}`
              : "Approval resolved",
            actor: "user",
            mission_id: approval?.mission_id,
          };
          return {
            approvals: s.approvals.map((a) =>
              a.id === id ? { ...a, status: decision } : a,
            ),
            audit: [audit, ...s.audit],
          };
        }),

      addChat: (m) => set((s) => ({ chat: [...s.chat, m] })),
      pushAudit: (entry) => set((s) => ({ audit: [entry, ...s.audit] })),
    }),
    {
      name: "amc-store-v1",
      // SSR-safe: only persist on client
      skipHydration: typeof window === "undefined",
    },
  ),
);