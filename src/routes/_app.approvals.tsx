import { createFileRoute, Outlet } from "@tanstack/react-router";
function ApprovalsLayout() { return <Outlet />; }
export const Route = createFileRoute("/_app/approvals")({ component: ApprovalsLayout });