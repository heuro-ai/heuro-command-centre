import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useAmc } from "@/mock/store";
import { supabase } from "@/integrations/supabase/client";
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
  const [authChecked, setAuthChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const connected = useAmc((s) => s.connected);
  const mode = useAmc((s) => s.mode);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setAuthed(!!data.session);
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!mounted || !authChecked) return;
    // Demo mode bypasses auth (lets people poke around without an account).
    if (mode === "demo") return;
    if (!authed) {
      navigate({ to: "/auth", replace: true });
      return;
    }
    if (!connected) navigate({ to: "/connect", replace: true });
  }, [connected, mode, navigate, mounted, authChecked, authed]);

  if (!mounted || !authChecked) return null;
  if (!authed && mode !== "demo") return null;
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