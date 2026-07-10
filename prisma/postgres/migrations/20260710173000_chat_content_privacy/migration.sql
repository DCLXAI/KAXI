-- Encrypt recoverable conversation text in KAXI. Existing text columns remain
-- redacted display/search previews so older readers keep working safely.

ALTER TABLE public.chat_sessions
  ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '90 days'),
  ADD COLUMN IF NOT EXISTS delete_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS chat_sessions_retention_idx
  ON public.chat_sessions (retention_until)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS chat_sessions_delete_requested_idx
  ON public.chat_sessions (delete_requested_at)
  WHERE delete_requested_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.kaxi_extend_chat_session_retention()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.last_message_at IS DISTINCT FROM OLD.last_message_at THEN
    NEW.retention_until := greatest(
      coalesce(NEW.retention_until, NEW.last_message_at),
      NEW.last_message_at + interval '90 days'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_sessions_extend_retention ON public.chat_sessions;
CREATE TRIGGER chat_sessions_extend_retention
BEFORE UPDATE OF last_message_at ON public.chat_sessions
FOR EACH ROW EXECUTE FUNCTION public.kaxi_extend_chat_session_retention();

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS question_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS question_hash TEXT,
  ADD COLUMN IF NOT EXISTS question_redacted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS answer_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS answer_hash TEXT,
  ADD COLUMN IF NOT EXISTS answer_redacted BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS chat_messages_question_hash_idx
  ON public.chat_messages (question_hash)
  WHERE question_hash IS NOT NULL;

ALTER TABLE public.retrieval_runs
  ADD COLUMN IF NOT EXISTS query_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS query_hash TEXT,
  ADD COLUMN IF NOT EXISTS query_redacted BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS retrieval_runs_query_hash_idx
  ON public.retrieval_runs (query_hash)
  WHERE query_hash IS NOT NULL;

ALTER TABLE public.n8n_audit_messages
  ADD COLUMN IF NOT EXISTS question_hash TEXT,
  ADD COLUMN IF NOT EXISTS answer_hash TEXT,
  ADD COLUMN IF NOT EXISTS question_redacted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS answer_redacted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.handoff_updates
  ADD COLUMN IF NOT EXISTS lead_note_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS lead_note_hash TEXT,
  ADD COLUMN IF NOT EXISTS lead_note_redacted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS question_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS question_hash TEXT,
  ADD COLUMN IF NOT EXISTS question_redacted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS answer_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS answer_hash TEXT,
  ADD COLUMN IF NOT EXISTS answer_redacted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS question_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS question_hash TEXT,
  ADD COLUMN IF NOT EXISTS question_redacted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS answer_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS answer_hash TEXT,
  ADD COLUMN IF NOT EXISTS answer_redacted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS notes_hash TEXT,
  ADD COLUMN IF NOT EXISTS notes_redacted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.handoff_tasks
  ADD COLUMN IF NOT EXISTS question_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS question_hash TEXT,
  ADD COLUMN IF NOT EXISTS question_redacted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS answer_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS answer_hash TEXT,
  ADD COLUMN IF NOT EXISTS answer_redacted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS notes_hash TEXT,
  ADD COLUMN IF NOT EXISTS notes_redacted BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.chat_messages.question IS
  'Redacted display copy. Recoverable original is stored in question_ciphertext.';
COMMENT ON COLUMN public.chat_messages.answer IS
  'Redacted display copy. Recoverable original is stored in answer_ciphertext.';
COMMENT ON COLUMN public.retrieval_runs.query IS
  'Redacted query copy. Recoverable original is stored in query_ciphertext.';
COMMENT ON COLUMN public.n8n_audit_messages.question IS
  'Redacted audit copy only; canonical encrypted content belongs to chat_messages.';

NOTIFY pgrst, 'reload schema';
