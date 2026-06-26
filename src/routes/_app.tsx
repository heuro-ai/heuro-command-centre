import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAmc } from "@/mock/store";
import { startMockConnector } from "@/mock/connector";
import { Sidebar } from "@/components/amc/Sidebar";
import { BottomNav } from "@/components/amc/BottomNav";
import { HealthBar, DesktopHealthStrip } from "@/components/amc/HealthBar";

export const Route = createFileRoute("/_app")({
  component: AppShell,
});

function AppShell() {
  const connected = useAmc((s) => s.connected);
  const navigate = useNavigate();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // wait for zustand persist to rehydrate from localStorage
    if (useAmc.persist?.hasHydrated?.()) {
      setHydrated(true);
    } else {
      const unsub = useAmc.persist?.onFinishHydration?.(() => setHydrated(true));
      return () => unsub?.();
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!connected) {
      navigate({ to: "/connect", replace: true });
    } else {
      startMockConnector();
    }
  }, [connected, navigate, hydrated]);

  if (!hydrated || !connected) return null;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <HealthBar />
        <DesktopHealthStrip />
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-5xl p-4 pb-24 lg:p-6 lg:pb-6">
            <Outlet />
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}