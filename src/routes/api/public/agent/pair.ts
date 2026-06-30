import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";

// Called by the Hermes plugin once, with a fresh pairing token the user
// pasted (or that was passed via env). Returns:
//   { agentId, agentSecret, ingestUrl }
// The agentSecret is shown ONCE and never stored in plaintext server-side.
// All subsequent events from this agent are HMAC-signed with this secret and
// verified by /api/public/agent/ingest.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
} as const;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

const PairBody = z.object({
  token: z.string().min(8).max(64),
  fingerprint: z.string().min(8).max(128),
  name: z.string().min(1).max(80).optional(),
  version: z.string().min(1).max(40).optional(),
  profile: z.string().min(1).max(80).optional(),
  endpoint: z.string().min(1).max(120).optional(),
});

export const Route = createFileRoute("/api/public/agent/pair")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json(400, { error: "invalid_json" });
        }
        const parsed = PairBody.safeParse(body);
        if (!parsed.success) return json(400, { error: "invalid_body", details: parsed.error.flatten() });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Look up the token. Single-use, must not be claimed, must not be expired.
        const { data: tokenRow, error: tokenErr } = await supabaseAdmin
          .from("pairing_tokens")
          .select("token, owner_id, expires_at, claimed_at")
          .eq("token", parsed.data.token)
          .maybeSingle();
        if (tokenErr) return json(500, { error: "db_error" });
        if (!tokenRow) return json(404, { error: "token_not_found" });
        if (tokenRow.claimed_at) return json(409, { error: "token_already_claimed" });
        if (new Date(tokenRow.expires_at).getTime() < Date.now())
          return json(410, { error: "token_expired" });

        // Mint the agent secret (shown once, hashed at rest).
        const agentSecret = `hs_${randomBytes(32).toString("hex")}`;
        const secretHash = createHash("sha256").update(agentSecret).digest("hex");

        // Upsert by (owner_id, fingerprint) — rebonding the same agent reuses its row.
        const { data: agent, error: agentErr } = await supabaseAdmin
          .from("agents")
          .upsert(
            {
              owner_id: tokenRow.owner_id,
              fingerprint: parsed.data.fingerprint,
              name: parsed.data.name ?? "Hermes",
              version: parsed.data.version ?? null,
              profile: parsed.data.profile ?? null,
              endpoint: parsed.data.endpoint ?? null,
              secret_hash: secretHash,
              status: "online",
              last_seen_at: new Date().toISOString(),
            },
            { onConflict: "owner_id,fingerprint" },
          )
          .select("id")
          .single();
        if (agentErr || !agent) return json(500, { error: "agent_create_failed" });

        // Burn the token.
        await supabaseAdmin
          .from("pairing_tokens")
          .update({ claimed_at: new Date().toISOString(), claimed_agent_id: agent.id })
          .eq("token", tokenRow.token);

        const origin = new URL(request.url).origin;
        return json(200, {
          agentId: agent.id,
          agentSecret,
          ingestUrl: `${origin}/api/public/agent/ingest`,
        });
      },
    },
  },
});