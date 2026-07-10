-- Canonical chat turn contract shared by KAXI, Typebot, n8n, and Supabase.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.chat_sessions
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'kaxi-site',
  ADD COLUMN IF NOT EXISTS typebot_result_id TEXT,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

UPDATE public.chat_sessions
SET channel = CASE WHEN source = 'typebot' THEN 'typebot' ELSE 'kaxi-site' END
WHERE channel IS NULL OR channel = '' OR channel = 'kaxi-site';

CREATE UNIQUE INDEX IF NOT EXISTS chat_sessions_typebot_result_id_key
  ON public.chat_sessions (typebot_result_id)
  WHERE typebot_result_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS chat_sessions_channel_status_idx
  ON public.chat_sessions (channel, status, last_message_at DESC);

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS request_id UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'kaxi-site',
  ADD COLUMN IF NOT EXISTS execution_id TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS error_code TEXT;

UPDATE public.chat_messages
SET channel = CASE WHEN source = 'typebot' THEN 'typebot' ELSE 'kaxi-site' END
WHERE channel IS NULL OR channel = '' OR channel = 'kaxi-site';

CREATE UNIQUE INDEX IF NOT EXISTS chat_messages_request_id_key
  ON public.chat_messages (request_id);

CREATE UNIQUE INDEX IF NOT EXISTS chat_messages_idempotency_key_key
  ON public.chat_messages (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS chat_messages_channel_created_idx
  ON public.chat_messages (channel, created_at DESC);

CREATE INDEX IF NOT EXISTS chat_messages_execution_id_idx
  ON public.chat_messages (execution_id)
  WHERE execution_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chat_messages_session_id_fkey'
  ) THEN
    ALTER TABLE public.chat_messages
      ADD CONSTRAINT chat_messages_session_id_fkey
      FOREIGN KEY (session_id)
      REFERENCES public.chat_sessions(session_key)
      ON DELETE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.retrieval_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL UNIQUE,
  message_id BIGINT NOT NULL UNIQUE,
  session_id TEXT NOT NULL,
  execution_id TEXT,
  query TEXT NOT NULL,
  retrieval_type TEXT NOT NULL DEFAULT 'hybrid',
  category TEXT NOT NULL DEFAULT 'general',
  similarity_threshold DOUBLE PRECISION,
  top_score DOUBLE PRECISION,
  retrieved_count INTEGER NOT NULL DEFAULT 0,
  rejected_citation_count INTEGER NOT NULL DEFAULT 0,
  no_context BOOLEAN NOT NULL DEFAULT false,
  no_context_reason TEXT,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  search_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT retrieval_runs_message_id_fkey
    FOREIGN KEY (message_id) REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  CONSTRAINT retrieval_runs_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES public.chat_sessions(session_key) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS retrieval_runs_session_created_idx
  ON public.retrieval_runs (session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS retrieval_runs_execution_id_idx
  ON public.retrieval_runs (execution_id)
  WHERE execution_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS retrieval_runs_no_context_idx
  ON public.retrieval_runs (no_context, created_at DESC);

ALTER TABLE public.n8n_audit_messages
  ADD COLUMN IF NOT EXISTS request_id UUID,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

UPDATE public.n8n_audit_messages audit
SET request_id = message.request_id,
    idempotency_key = message.idempotency_key
FROM public.chat_messages message
WHERE audit.source_chat_message_id = message.id
  AND audit.request_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS n8n_audit_messages_request_id_key
  ON public.n8n_audit_messages (request_id)
  WHERE request_id IS NOT NULL;

-- Historical audit rows can outlive canonical messages removed by the earlier
-- deduplication migration. Keep the audit row and clear only the stale link.
UPDATE public.n8n_audit_messages audit
SET source_chat_message_id = NULL
WHERE audit.source_chat_message_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.chat_messages message
    WHERE message.id = audit.source_chat_message_id
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'n8n_audit_messages_source_chat_message_id_fkey'
  ) THEN
    ALTER TABLE public.n8n_audit_messages
      ADD CONSTRAINT n8n_audit_messages_source_chat_message_id_fkey
      FOREIGN KEY (source_chat_message_id)
      REFERENCES public.chat_messages(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

ALTER TABLE public.retrieval_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.retrieval_runs FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public.retrieval_runs FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.retrieval_runs FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE public.retrieval_runs TO service_role;
  END IF;
END
$$;

COMMENT ON TABLE public.retrieval_runs IS
  'One normalized retrieval record per canonical chat turn. Search evidence no longer depends on n8n request/response blobs.';
COMMENT ON COLUMN public.chat_messages.idempotency_key IS
  'Client or gateway-generated retry key; repeated writes return the existing canonical chat turn.';

NOTIFY pgrst, 'reload schema';
