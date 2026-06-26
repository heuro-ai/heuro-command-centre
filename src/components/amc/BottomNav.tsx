import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, Bot, Inbox, FileText, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAmc } from "@/mock/store";

const items: { to: string; icon: typeof Activity; label: string; badge?: boolean }[] = [
  { to: "/missions", icon: Activity, label: "Missions" },
  { to: "/chat", icon: Bot, label: "Chat" },
  { to: "/approvals", icon: Inbox, label: "Approvals", badge: true },
  { to: "/artifacts", icon: FileText, label: "Artifacts" },
  { to: "/automations", icon: Repeat, label: "Automations" },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const pending = useAmc((s) => s.approvals.filter((a) => a.status === "pending").length);

  return (
    <nav className="sticky bottom-0 z-30 flex border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      {items.map((item) => {
        const active = pathname === item.to || pathname.startsWith(item.to + "/");
        return (
          <Link
            key={item.to}
            to={item.to as "/missions"}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] uppercase tracking-wider",
              active ? "text-accent-cyan" : "text-muted-foreground",
            )}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
            {item.badge && pending > 0 && (
              <span className="absolute right-3 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-warn px-1 font-mono text-[10px] font-bold text-background">
                {pending}
              </span>
            )}
            {active && <span className="absolute left-0 right-0 top-0 h-px bg-accent-cyan" />}
          </Link>
        );
      })}
    </nav>
  );
}