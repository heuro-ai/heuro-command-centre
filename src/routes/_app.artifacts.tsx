import { createFileRoute, Outlet } from "@tanstack/react-router";
function ArtifactsLayout() { return <Outlet />; }
export const Route = createFileRoute("/_app/artifacts")({ component: ArtifactsLayout });