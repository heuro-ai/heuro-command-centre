import { createFileRoute, Outlet } from "@tanstack/react-router";
function MissionsLayout() { return <Outlet />; }
export const Route = createFileRoute("/_app/missions")({ component: MissionsLayout });