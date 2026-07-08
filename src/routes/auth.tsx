import { createFileRoute, redirect } from "@tanstack/react-router";

// Auth removed — redirect any lingering links to /connect.
export const Route = createFileRoute("/auth")({
  beforeLoad: () => {
    throw redirect({ to: "/connect", replace: true });
  },
  component: () => null,
});