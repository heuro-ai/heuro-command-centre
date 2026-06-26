import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUp, Mic, Paperclip } from "lucide-react";
import { useAmc } from "@/mock/store";
import { PageHeader } from "@/components/amc/PageHeader";
import { MonoId, StatusChip } from "@/components/amc/primitives";
import { ApprovalCard } from "@/components/amc/ApprovalCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/chat/$missionId")({
  component: ChatPage,
});

const QUICK = [
  "Explain status",
  "What is blocked?",
  "Revise artifact",
  "Add more sources",
  "Retry current step",
  "Create approval request",
];

function ChatPage() {
  const { missionId } = Route.useParams();
  const mission = useAmc((s) => s.missions.find((m) => m.id === missionId));
  const missions = useAmc((s) => s.missions);
  const chat = useAmc((s) => s.chat.filter((c) => c.mission_id === missionId));
  const artifacts = useAmc((s) => s.artifacts);
  const approvals = useAmc((s) => s.approvals);
  const addChat = useAmc((s) => s.addChat);
  const [input, setInput] = useState("");

  if (!mission) throw notFound();

  const send = (text: string) => {
    if (!text.trim()) return;
    addChat({ id: `c_${Date.now()}`, mission_id: missionId, role: "user", text, at: new Date().toISOString() });
    setTimeout(() => {
      addChat({
        id: `c_${Date.now()}_r`,
        mission_id: missionId,
        role: "hermes",
        at: new Date().toISOString(),
        card: { kind: "progress", mission_id: missionId, step: mission.steps[mission.current_step_index]?.name ?? "Current step", summary: "Status acknowledged. No state change required." },
      });
    }, 600);
    setInput("");
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col lg:h-[calc(100vh-7rem)]">
      <PageHeader
        title="Chat with Hermes"
        description="Mission-aware. Cards are structured events, not text."
      />

      {/* mission selector */}
      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        {missions.map((m) => (
          <Link
            key={m.id}
            to="/chat/$missionId"
            params={{ missionId: m.id }}
            className={cn(
              "shrink-0 rounded-md border px-2.5 py-1.5 text-xs",
              m.id === missionId ? "border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {m.title}
          </Link>
        ))}
      </div>

      <div className="mb-3 flex items-center gap-2 rounded-md border border-border bg-surface p-2 text-xs">
        <span className="text-muted-foreground">Context:</span>
        <MonoId>{mission.id}</MonoId>
        <StatusChip status={mission.status} />
        <Link to="/missions/$missionId" params={{ missionId }} className="ml-auto text-accent-cyan hover:underline">Open mission</Link>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {chat.map((m) => {
          const isUser = m.role === "user";
          return (
            <div key={m.id} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[85%] space-y-2", isUser ? "items-end" : "items-start")}>
                {!isUser && (
                  <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-accent-cyan/15 text-[9px] font-bold text-accent-cyan">H</span>
                    Hermes
                  </div>
                )}
                {m.text && (
                  <div className={cn(
                    "rounded-lg px-3 py-2 text-sm",
                    isUser ? "bg-accent-cyan text-background" : "border border-border bg-surface text-foreground",
                  )}>
                    {m.text}
                  </div>
                )}
                {m.card?.kind === "progress" && (
                  <div className="rounded-lg border border-border bg-surface p-3">
                    <div className="text-[11px] uppercase tracking-wider text-status-running">Progress</div>
                    <div className="mt-1 text-sm font-medium">{m.card.step}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{m.card.summary}</div>
                  </div>
                )}
                {m.card?.kind === "approval" && (() => {
                  const a = approvals.find((x) => x.id === m.card!.approval_id);
                  return a ? <ApprovalCard approval={a} compact /> : null;
                })()}
                {m.card?.kind === "artifact" && (() => {
                  const a = artifacts.find((x) => x.id === m.card!.artifact_id);
                  return a ? (
                    <Link
                      to="/artifacts/$artifactId"
                      params={{ artifactId: a.id }}
                      className="block rounded-lg border border-border bg-surface p-3 hover:border-accent-cyan/30"
                    >
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Artifact · {a.kind}</div>
                      <div className="mt-0.5 text-sm font-semibold">{a.title}</div>
                      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.summary}</div>
                    </Link>
                  ) : null;
                })()}
                {m.card?.kind === "error" && (
                  <div className="rounded-lg border border-status-fail/40 bg-status-fail/5 p-3 text-sm text-status-fail">
                    {m.card.message}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        {QUICK.map((q) => (
          <button
            key={q}
            onClick={() => send(q)}
            className="shrink-0 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground hover:border-accent-cyan/40 hover:text-foreground"
          >
            {q}
          </button>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-surface p-2">
        <button className="rounded-md p-2 text-muted-foreground hover:text-foreground"><Paperclip className="h-4 w-4" /></button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder="Ask Hermes about this mission…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <button className="rounded-md p-2 text-muted-foreground hover:text-foreground"><Mic className="h-4 w-4" /></button>
        <button
          onClick={() => send(input)}
          className="rounded-md bg-accent-cyan p-2 text-background hover:bg-accent-cyan/90"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}