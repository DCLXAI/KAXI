-- KAXI owns canonical conversation persistence, including the handoff task.
-- n8n may classify risk but no longer needs to duplicate raw chat content.

ALTER TABLE public.handoff_tasks
  ADD COLUMN IF NOT EXISTS source_chat_message_id BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'handoff_tasks_source_chat_message_id_fkey'
  ) THEN
    ALTER TABLE public.handoff_tasks
      ADD CONSTRAINT handoff_tasks_source_chat_message_id_fkey
      FOREIGN KEY (source_chat_message_id)
      REFERENCES public.chat_messages(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS handoff_tasks_source_message_idx
  ON public.handoff_tasks (source_chat_message_id)
  WHERE source_chat_message_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.kaxi_dedupe_handoff_task()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing_id BIGINT;
BEGIN
  NEW.dedupe_key := coalesce(
    nullif(NEW.dedupe_key, ''),
    encode(
      digest(
        lower(coalesce(NEW.tenant_id, 'default')) || E'\n' ||
        lower(trim(NEW.session_id)) || E'\n' ||
        lower(regexp_replace(trim(NEW.question), '\s+', ' ', 'g')),
        'sha256'
      ),
      'hex'
    )
  );

  SELECT id
  INTO v_existing_id
  FROM public.handoff_tasks
  WHERE dedupe_key = NEW.dedupe_key
    AND status IN ('open', 'review', 'contact_requested', 'contact_received')
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.handoff_tasks
    SET
      source_chat_message_id = coalesce(NEW.source_chat_message_id, source_chat_message_id),
      question = coalesce(nullif(NEW.question, ''), question),
      question_ciphertext = coalesce(NEW.question_ciphertext, question_ciphertext),
      question_hash = coalesce(NEW.question_hash, question_hash),
      question_redacted = NEW.question_redacted OR question_redacted,
      answer = coalesce(nullif(NEW.answer, ''), answer),
      answer_ciphertext = coalesce(NEW.answer_ciphertext, answer_ciphertext),
      answer_hash = coalesce(NEW.answer_hash, answer_hash),
      answer_redacted = NEW.answer_redacted OR answer_redacted,
      notes = coalesce(nullif(NEW.notes, ''), notes),
      notes_ciphertext = coalesce(NEW.notes_ciphertext, notes_ciphertext),
      notes_hash = coalesce(NEW.notes_hash, notes_hash),
      notes_redacted = NEW.notes_redacted OR notes_redacted,
      risk_level = CASE
        WHEN NEW.risk_level = 'high' OR risk_level = 'high' THEN 'high'
        WHEN NEW.risk_level = 'medium' OR risk_level = 'medium' THEN 'medium'
        ELSE 'low'
      END,
      lead_stage = CASE
        WHEN NEW.lead_stage = 'urgent' OR lead_stage = 'urgent' THEN 'urgent'
        ELSE coalesce(nullif(NEW.lead_stage, ''), lead_stage)
      END,
      updated_at = now()
    WHERE id = v_existing_id;
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON COLUMN public.handoff_tasks.source_chat_message_id IS
  'Canonical KAXI chat message that created or most recently refreshed this task.';

NOTIFY pgrst, 'reload schema';
