
-- Drop auth.users FKs and NOT NULL on owner_id so pairing works without auth
ALTER TABLE public.agents DROP CONSTRAINT IF EXISTS agents_owner_id_fkey;
ALTER TABLE public.agents ALTER COLUMN owner_id DROP NOT NULL;

ALTER TABLE public.pairing_tokens DROP CONSTRAINT IF EXISTS pairing_tokens_owner_id_fkey;
ALTER TABLE public.pairing_tokens ALTER COLUMN owner_id DROP NOT NULL;

ALTER TABLE public.agent_events DROP CONSTRAINT IF EXISTS agent_events_owner_id_fkey;
ALTER TABLE public.agent_events ALTER COLUMN owner_id DROP NOT NULL;

-- Open read to anon (single-tenant demo, no auth)
DROP POLICY IF EXISTS "own agents read" ON public.agents;
DROP POLICY IF EXISTS "own agents update" ON public.agents;
DROP POLICY IF EXISTS "own agents delete" ON public.agents;
CREATE POLICY "public read agents" ON public.agents FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "own tokens read" ON public.pairing_tokens;
CREATE POLICY "public read tokens" ON public.pairing_tokens FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "own events read" ON public.agent_events;
CREATE POLICY "public read events" ON public.agent_events FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON public.agents TO anon;
GRANT SELECT ON public.pairing_tokens TO anon;
GRANT SELECT ON public.agent_events TO anon;
