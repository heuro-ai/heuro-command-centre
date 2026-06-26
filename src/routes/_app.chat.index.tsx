import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAmc } from "@/mock/store";

export const Route = createFileRoute("/_app/chat")({
  component: ChatIndex,
});

function ChatIndex() {
  const missions = useAmc((s) => s.missions);
  const navigate = useNavigate();
  useEffect(() => {
    const m = missions.find((x) => x.status === "needs_review") ?? missions[0];
    if (m) navigate({ to: "/chat/$missionId", params: { missionId: m.id }, replace: true });
  }, [missions, navigate]);
  return null;
}