
-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read"   ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile write"  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- agents
CREATE TYPE public.permission_mode AS ENUM ('monitor', 'control', 'full');
CREATE TYPE public.agent_status AS ENUM ('online', 'degraded', 'offline');

CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Hermes',
  fingerprint TEXT NOT NULL,
  profile TEXT,
  version TEXT,
  endpoint TEXT,
  permission public.permission_mode NOT NULL DEFAULT 'control',
  status public.agent_status NOT NULL DEFAULT 'offline',
  secret_hash TEXT NOT NULL, -- bcrypt-style hash of the per-agent HMAC secret
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, fingerprint)
);
CREATE INDEX agents_owner_idx ON public.agents(owner_id);
GRANT SELECT, UPDATE, DELETE ON public.agents TO authenticated;
GRANT ALL ON public.agents TO service_role;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own agents read"   ON public.agents FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "own agents update" ON public.agents FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "own agents delete" ON public.agents FOR DELETE TO authenticated USING (auth.uid() = owner_id);
-- inserts happen only via service role (pairing route)

-- pairing tokens (one-time, short-lived)
CREATE TABLE public.pairing_tokens (
  token TEXT PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  claimed_at TIMESTAMPTZ,
  claimed_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX pairing_tokens_owner_idx ON public.pairing_tokens(owner_id);
GRANT SELECT ON public.pairing_tokens TO authenticated;
GRANT ALL ON public.pairing_tokens TO service_role;
ALTER TABLE public.pairing_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tokens read" ON public.pairing_tokens FOR SELECT TO authenticated USING (auth.uid() = owner_id);
-- writes only via service role

-- validate expiry via trigger (CHECK can't use now())
CREATE OR REPLACE FUNCTION public.validate_pairing_token_expiry()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.expires_at <= now() THEN
    RAISE EXCEPTION 'expires_at must be in the future';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER pairing_tokens_validate_expiry
  BEFORE INSERT ON public.pairing_tokens
  FOR EACH ROW EXECUTE FUNCTION public.validate_pairing_token_expiry();

-- agent events
CREATE TABLE public.agent_events (
  id BIGSERIAL PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL, -- client-side id for dedupe
  event_type TEXT NOT NULL,
  mission_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agent_id, event_id)
);
CREATE INDEX agent_events_owner_recent_idx ON public.agent_events(owner_id, received_at DESC);
CREATE INDEX agent_events_agent_recent_idx ON public.agent_events(agent_id, received_at DESC);
GRANT SELECT ON public.agent_events TO authenticated;
GRANT ALL ON public.agent_events TO service_role;
ALTER TABLE public.agent_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own events read" ON public.agent_events FOR SELECT TO authenticated USING (auth.uid() = owner_id);
-- inserts only via service role (HMAC-verified ingest route)

-- realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.agents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pairing_tokens;
