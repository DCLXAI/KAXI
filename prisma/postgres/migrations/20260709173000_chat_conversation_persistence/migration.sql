-- KAXI site chat persistence.
-- public.chat_messages already exists as the n8n runtime audit table; extend it
-- instead of replacing it so existing n8n inserts keep working.

CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id TEXT PRIMARY KEY,
  session_key TEXT NOT NULL UNIQUE,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  locale TEXT NOT NULL DEFAULT 'ko',
  source TEXT NOT NULL DEFAULT 'kaxi-site',
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_sessions_tenant_id_idx
  ON public.chat_sessions (tenant_id);

CREATE INDEX IF NOT EXISTS chat_sessions_locale_idx
  ON public.chat_sessions (locale);

CREATE INDEX IF NOT EXISTS chat_sessions_source_idx
  ON public.chat_sessions (source);

CREATE INDEX IF NOT EXISTS chat_sessions_status_idx
  ON public.chat_sessions (status);

CREATE INDEX IF NOT EXISTS chat_sessions_last_message_at_idx
  ON public.chat_sessions (last_message_at);

CREATE INDEX IF NOT EXISTS chat_sessions_created_at_idx
  ON public.chat_sessions (created_at);

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'ko',
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'n8n-typebot',
  ADD COLUMN IF NOT EXISTS n8n_request JSONB,
  ADD COLUMN IF NOT EXISTS n8n_response JSONB,
  ADD COLUMN IF NOT EXISTS sources JSONB,
  ADD COLUMN IF NOT EXISTS search_meta JSONB,
  ADD COLUMN IF NOT EXISTS lead_stage TEXT,
  ADD COLUMN IF NOT EXISTS next_step TEXT,
  ADD COLUMN IF NOT EXISTS latency_ms INTEGER;

CREATE INDEX IF NOT EXISTS chat_messages_locale_idx
  ON public.chat_messages (locale);

CREATE INDEX IF NOT EXISTS chat_messages_source_idx
  ON public.chat_messages (source);

CREATE TABLE IF NOT EXISTS public.chat_attachments (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  message_id BIGINT,
  bucket TEXT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chat_attachments_session_id_fkey
    FOREIGN KEY (session_id)
    REFERENCES public.chat_sessions(session_key)
    ON DELETE CASCADE,
  CONSTRAINT chat_attachments_message_id_fkey
    FOREIGN KEY (message_id)
    REFERENCES public.chat_messages(id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS chat_attachments_session_id_idx
  ON public.chat_attachments (session_id);

CREATE INDEX IF NOT EXISTS chat_attachments_message_id_idx
  ON public.chat_attachments (message_id);

CREATE INDEX IF NOT EXISTS chat_attachments_sha256_idx
  ON public.chat_attachments (sha256);

CREATE INDEX IF NOT EXISTS chat_attachments_mime_type_idx
  ON public.chat_attachments (mime_type);

CREATE INDEX IF NOT EXISTS chat_attachments_status_idx
  ON public.chat_attachments (status);

CREATE INDEX IF NOT EXISTS chat_attachments_created_at_idx
  ON public.chat_attachments (created_at);

CREATE OR REPLACE FUNCTION public.kaxi_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_sessions_touch_updated_at ON public.chat_sessions;
CREATE TRIGGER chat_sessions_touch_updated_at
BEFORE UPDATE ON public.chat_sessions
FOR EACH ROW
EXECUTE FUNCTION public.kaxi_touch_updated_at();

DROP TRIGGER IF EXISTS chat_attachments_touch_updated_at ON public.chat_attachments;
CREATE TRIGGER chat_attachments_touch_updated_at
BEFORE UPDATE ON public.chat_attachments
FOR EACH ROW
EXECUTE FUNCTION public.kaxi_touch_updated_at();

COMMENT ON TABLE public.chat_sessions IS
  'KAXI website chat sessions for Typebot/n8n/Supabase RAG conversations.';

COMMENT ON TABLE public.chat_messages IS
  'KAXI/n8n chat exchanges, including question, answer, RAG sources, and runtime metadata.';

COMMENT ON TABLE public.chat_attachments IS
  'Supabase Storage-backed attachments linked to KAXI chat sessions and messages.';
