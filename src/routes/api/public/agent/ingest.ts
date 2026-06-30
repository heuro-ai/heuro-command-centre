import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { Json } from "@/integrations/supabase/types";

// Receives events from a bonded Hermes agent. Authentication is HMAC-SHA256
// over the raw request body using the per-agent secret. The server stores
// only the SHA-256 of the secret, so to verify we hash the secret again and
// compare. The agent identifies itself with X-Agent-Id; the signature is
// in X-Agent-Signature; the body is a JSON array of events (batch).

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Agent-Id, X-Agent-Signature",
  "Access-Control-Max-Age": "86400",
} as const;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

const EventSchema = z.object({
  event_id: z.string().min(1).max(80),
  event_type: z.string().min(1).max(80),
  mission_id: z.string().max(120).optional().nullable(),
  occurred_at: z.string().datetime().optional(),
  payload: z.record(z.unknown()).default({}),
});
const BatchSchema = z.array(EventSchema).min(1).max(100);

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/public/agent/ingest")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const agentId = request.headers.get("X-Agent-Id");
        const signature = request.headers.get("X-Agent-Signature");
        if (!agentId || !signature) return json(401, { error: "missing_auth_headers" });

        const raw = await request.text();
        if (raw.length > 256 * 1024) return json(413, { error: "payload_too_large" });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: agent, error: agentErr } = await supabaseAdmin
          .from("agents")
          .select("id, owner_id, secret_hash")
          .eq("id", agentId)
          .maybeSingle();
        if (agentErr) return json(500, { error: "db_error" });
        if (!agent) return json(401, { error: "unknown_agent" });

        // We don't have the plaintext secret; the agent does. The agent
        // signs with the secret; we re-derive the expected hex sig using
        // HMAC(secret_hash, body) on the server -> NO, that won't match.
        // Instead the agent sends signature = HMAC(secret, body) AND we
        // verify by HMAC(secret, body)==signature where we look up secret.
        // We can't, because we only stored sha256(secret).
        //
        // Fix: store hash of the SIGNING KEY, but use the SIGNING KEY itself
        // as derived from the secret. Specifically: signing_key = sha256(secret).
        // The agent computes signing_key = sha256(its_secret), then signs
        // HMAC(signing_key, body). The server stores sha256(secret) as
        // secret_hash, and verifies HMAC(secret_hash, body). This way the
        // raw secret never has to be reconstructed.
        const signingKey = Buffer.from(agent.secret_hash, "hex");
        const expected = createHmac("sha256", signingKey).update(raw).digest("hex");
        if (!safeEqualHex(expected, signature.toLowerCase())) {
          return json(401, { error: "bad_signature" });
        }

        let parsedBody: unknown;
        try {
          parsedBody = JSON.parse(raw);
        } catch {
          return json(400, { error: "invalid_json" });
        }
        const batch = BatchSchema.safeParse(parsedBody);
        if (!batch.success) return json(400, { error: "invalid_batch", details: batch.error.flatten() });

        const rows = batch.data.map((e) => ({
          agent_id: agent.id,
          owner_id: agent.owner_id,
          event_id: e.event_id,
          event_type: e.event_type,
          mission_id: e.mission_id ?? null,
          payload: e.payload as unknown as Json,
          occurred_at: e.occurred_at ?? new Date().toISOString(),
        }));

        const { error: insErr } = await supabaseAdmin
          .from("agent_events")
          .upsert(rows, { onConflict: "agent_id,event_id" });
        if (insErr) return json(500, { error: "insert_failed", detail: insErr.message });

        await supabaseAdmin
          .from("agents")
          .update({ status: "online", last_seen_at: new Date().toISOString() })
          .eq("id", agent.id);

        return json(200, { ok: true, accepted: rows.length });
      },
    },
  },
});

// Reference: hash function exported for tooling/tests that need to derive the
// signing key (sha256 of plaintext secret) outside the agent.
export function deriveSigningKey(plaintextSecret: string): Buffer {
  return Buffer.from(createHash("sha256").update(plaintextSecret).digest("hex"), "hex");
}