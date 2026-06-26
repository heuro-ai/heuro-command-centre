import { createFileRoute, Outlet } from "@tanstack/react-router";
function ChatLayout() { return <Outlet />; }
export const Route = createFileRoute("/_app/chat")({ component: ChatLayout });