import { createFileRoute, Outlet } from "@tanstack/react-router";
function AutomationsLayout() { return <Outlet />; }
export const Route = createFileRoute("/_app/automations")({ component: AutomationsLayout });