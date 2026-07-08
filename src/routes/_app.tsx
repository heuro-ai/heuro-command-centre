import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useAmc } from "@/mock/store";
// connector intentionally disabled in MVP demo build
import { Sidebar } from "@/components/amc/Sidebar";
import { BottomNav } from "@/components/amc/BottomNav";
import { HealthBar, DesktopHealthStrip } from "@/components/amc/HealthBar";

export const Route = createFileRoute("/_app")({
  component: AppShell,
});

function AppShell() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const connected = useAmc((s) => s.connected);
  const mode = useAmc((s) => s.mode);

  useEffect(() => {
    if (!mounted) return;
    if (!connected) navigate({ to: "/connect", replace: true });
  }, [connected, mode, navigate, mounted]);

  if (!mounted) return null;
  if (!connected) return null;

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