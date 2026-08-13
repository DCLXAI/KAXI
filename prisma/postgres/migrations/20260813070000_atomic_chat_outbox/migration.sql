-- Transactional outbox for canonical chat/handoff persistence.

-- Prisma's native upsert needs a full unique conflict target. PostgreSQL still
-- permits multiple NULL values, so removing the historical partial predicate
-- does not change the optional-key semantics.
DROP INDEX IF EXISTS public.chat_messages_idempotency_key_key;
CREATE UNIQUE INDEX chat_messages_idempotency_key_key
  ON public.chat_messages (idempotency_key);

CREATE TABLE IF NOT EXISTS public.outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  message_id BIGINT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  trace_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 12,
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  lock_token UUID,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  retention_until TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '90 days'),
  CONSTRAINT outbox_events_message_id_fkey
    FOREIGN KEY (message_id) REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  CONSTRAINT outbox_events_attempts_check CHECK (attempts >= 0),
  CONSTRAINT outbox_events_max_attempts_check CHECK (max_attempts > 0),
  CONSTRAINT outbox_events_status_check CHECK (status IN ('queued', 'processing', 'retry', 'processed', 'dead_letter'))
);

CREATE UNIQUE INDEX IF NOT EXISTS outbox_events_event_idempotency_key
  ON public.outbox_events (event_type, idempotency_key);
CREATE INDEX IF NOT EXISTS outbox_events_delivery_idx
  ON public.outbox_events (status, available_at, created_at);
CREATE INDEX IF NOT EXISTS outbox_events_locked_idx
  ON public.outbox_events (locked_at)
  WHERE locked_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS outbox_events_tenant_created_idx
  ON public.outbox_events (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS outbox_events_aggregate_idx
  ON public.outbox_events (aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS outbox_events_message_idx
  ON public.outbox_events (message_id)
  WHERE message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS outbox_events_retention_idx
  ON public.outbox_events (retention_until);

DROP TRIGGER IF EXISTS outbox_events_touch_updated_at ON public.outbox_events;
CREATE TRIGGER outbox_events_touch_updated_at
BEFORE UPDATE ON public.outbox_events
FOR EACH ROW EXECUTE FUNCTION public.kaxi_touch_updated_at();

ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.outbox_events FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public.outbox_events FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.outbox_events FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.outbox_events TO service_role;
  END IF;
END
$$;

COMMENT ON TABLE public.outbox_events IS
  'PII-minimized events committed atomically with canonical chat turns and delivered asynchronously.';
COMMENT ON COLUMN public.outbox_events.payload IS
  'Identifiers, routing metadata, and redacted/non-PII fields only. Fetch protected aggregate data at delivery time.';

NOTIFY pgrst, 'reload schema';
