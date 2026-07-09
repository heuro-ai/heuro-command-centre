import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Auth removed — pairing is single-tenant / anonymous. All DB access goes
// through supabaseAdmin (loaded inside each handler so it never leaks into
// the client bundle).

export const createPairingToken = createServerFn({ method: "POST" }).handler(
  async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const token = `amc_${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 16)}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error } = await supabaseAdmin
      .from("pairing_tokens")
      .insert({ token, owner_id: null, expires_at: expiresAt });
    if (error) throw new Error(error.message);

    return { token, expiresAt };
  },
);

export const checkPairingStatus = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ token: z.string().min(8).max(64) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("pairing_tokens")
      .select("token, claimed_at, claimed_agent_id, expires_at")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { state: "missing" as const };
    if (row.claimed_agent_id) {
      const { data: agent } = await supabaseAdmin
        .from("agents")
        .select("id, name, version, profile, endpoint, fingerprint, permission, status")
        .eq("id", row.claimed_agent_id)
        .maybeSingle();
      return { state: "claimed" as const, agent };
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return { state: "expired" as const };
    }
    return { state: "waiting" as const };
  });

export const updateAgentPermission = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        agentId: z.string().uuid(),
        permission: z.enum(["monitor", "control"]),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("agents")
      .update({ permission: data.permission })
      .eq("id", data.agentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const disconnectAgent = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ agentId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("agents")
      .delete()
      .eq("id", data.agentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });