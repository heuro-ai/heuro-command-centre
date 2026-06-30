import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Issues a one-time pairing token bound to the authenticated user. The token
// is what the Hermes plugin presents to /api/public/agent/pair to claim a
// bond. Tokens are short-lived (10 min) and single-use. The plaintext token
// is also stored in the DB row (it's already random and only valuable while
// unclaimed and unexpired); rotating to a hashed lookup later is a drop-in
// change.
export const createPairingToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // amc_XXXX-XXXX (16 hex chars total) — easy to read aloud, hard to guess.
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const token = `amc_${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 16)}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from("pairing_tokens")
      .insert({ token, owner_id: userId, expires_at: expiresAt });
    if (error) throw new Error(error.message);

    return { token, expiresAt };
  });

// Polled by the /connect page while the user is waiting for the agent to
// finish the handshake. Returns the bonded agent (or null if not yet claimed).
export const checkPairingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ token: z.string().min(8).max(64) }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("pairing_tokens")
      .select("token, claimed_at, claimed_agent_id, expires_at")
      .eq("token", data.token)
      .eq("owner_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { state: "missing" as const };
    if (row.claimed_agent_id) {
      const { data: agent } = await supabase
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
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        agentId: z.string().uuid(),
        permission: z.enum(["monitor", "control"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await context.supabase
      .from("agents")
      .update({ permission: data.permission })
      .eq("id", data.agentId)
      .eq("owner_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
    void supabase;
  });

export const disconnectAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ agentId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("agents")
      .delete()
      .eq("id", data.agentId)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });