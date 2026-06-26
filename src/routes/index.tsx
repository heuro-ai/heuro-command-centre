import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAmc } from "@/mock/store";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const connected = useAmc((s) => s.connected);
  useEffect(() => {
    navigate({ to: connected ? "/missions" : "/connect", replace: true });
  }, [connected, navigate]);
  return null;
}
