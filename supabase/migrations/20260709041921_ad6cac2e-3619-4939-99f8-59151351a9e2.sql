
ALTER TABLE public.agent_events
  ADD COLUMN IF NOT EXISTS seq BIGINT;

-- Backfill any existing rows with a synthetic seq (id preserves order per agent).
UPDATE public.agent_events e
SET seq = sub.rn
FROM (
  SELECT id, row_number() OVER (PARTITION BY agent_id ORDER BY id) AS rn
  FROM public.agent_events
) sub
WHERE e.id = sub.id AND e.seq IS NULL;

ALTER TABLE public.agent_events
  ALTER COLUMN seq SET NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agent_events_agent_seq_key'
  ) THEN
    ALTER TABLE public.agent_events
      ADD CONSTRAINT agent_events_agent_seq_key UNIQUE (agent_id, seq);
  END IF;
END $$;

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS last_seq BIGINT NOT NULL DEFAULT 0;

-- Initialize last_seq from any existing events.
UPDATE public.agents a
SET last_seq = COALESCE(sub.max_seq, 0)
FROM (
  SELECT agent_id, MAX(seq) AS max_seq FROM public.agent_events GROUP BY agent_id
) sub
WHERE a.id = sub.agent_id AND a.last_seq < sub.max_seq;
