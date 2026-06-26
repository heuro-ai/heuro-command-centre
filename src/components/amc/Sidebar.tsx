import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bot,
  Inbox,
  FileText,
  Repeat,
  ShieldCheck,
  HeartPulse,
  Settings as SettingsIcon,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAmc } from "@/mock/store";

const items: { to: string; icon: typeof Bot; label: string; badge?: boolean }[] = [
  { to: "/missions", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/chat", icon: Bot, label: "Chat" },
  { to: "/approvals", icon: Inbox, label: "Approvals", badge: true },
  { to: "/artifacts", icon: FileText, label: "Artifacts" },
  { to: "/automations", icon: Repeat, label: "Automations" },
  { to: "/trust", icon: ShieldCheck, label: "Trust" },
  { to: "/health", icon: HeartPulse, label: "Health" },
  { to: "/settings", icon: SettingsIcon, label: "Settings" },
];

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const approvals = useAmc((s) => s.approvals);
  const pending = approvals.filter((a) => a.status === "pending").length;

  return (
    <aside className="hidden w-56 shrink-0 border-r border-border bg-sidebar lg:flex lg:flex-col">
      <div className="flex h-12 items-center gap-2 border-b border-border px-4">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-accent-cyan/15 font-mono text-[10px] font-bold text-accent-cyan">
          AMC
        </div>
        <span className="text-sm font-semibold">Mission Control</span>
      </div>
      <nav className="flex-1 space-y-0.5 p-2">
        {items.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to as "/missions"}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                active
                  ? "bg-accent-cyan/10 text-accent-cyan"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
              {item.badge && pending > 0 && (
                <span className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-status-warn px-1 font-mono text-[10px] font-bold text-background">
                  {pending}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3 text-[11px] text-muted-foreground">
        <div className="font-mono">agent-control 0.3.1</div>
        <div>Open source · BYOK</div>
      </div>
    </aside>
  );
}