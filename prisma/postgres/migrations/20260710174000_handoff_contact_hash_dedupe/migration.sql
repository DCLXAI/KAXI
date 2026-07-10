-- Use the KAXI-provided keyed contact hash for handoff deduplication. The
-- existing trigger previously re-hashed the redacted display value, which can
-- collide and can fail a repeat handoff after ciphertext propagation.

DO $migration$
DECLARE
  function_sql TEXT;
  patched_sql TEXT;
BEGIN
  SELECT pg_get_functiondef('public.kaxi_apply_handoff_update()'::regprocedure)
  INTO function_sql;

  patched_sql := replace(
    function_sql,
    'v_contact_hash := encode(digest(lower(v_contact), ''sha256''), ''hex'');',
    'v_contact_hash := coalesce(nullif(NEW.lead_contact_hash, ''''), encode(digest(lower(v_contact), ''sha256''), ''hex''));'
  );

  IF patched_sql = function_sql THEN
    RAISE EXCEPTION 'Unable to patch kaxi_apply_handoff_update contact hash assignment';
  END IF;

  EXECUTE patched_sql;
END
$migration$;

CREATE OR REPLACE FUNCTION public.kaxi_propagate_handoff_content_privacy()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL THEN
    UPDATE public.leads
    SET
      question = coalesce(NEW.question, question),
      question_ciphertext = coalesce(NEW.question_ciphertext, question_ciphertext),
      question_hash = coalesce(NEW.question_hash, question_hash),
      question_redacted = NEW.question_redacted OR question_redacted,
      answer = coalesce(NEW.answer, answer),
      answer_ciphertext = coalesce(NEW.answer_ciphertext, answer_ciphertext),
      answer_hash = coalesce(NEW.answer_hash, answer_hash),
      answer_redacted = NEW.answer_redacted OR answer_redacted,
      notes = coalesce(NEW.lead_note, notes),
      notes_ciphertext = coalesce(NEW.lead_note_ciphertext, notes_ciphertext),
      notes_hash = coalesce(NEW.lead_note_hash, notes_hash),
      notes_redacted = NEW.lead_note_redacted OR notes_redacted,
      updated_at = now()
    WHERE id = NEW.lead_id;
  END IF;

  IF NEW.handoff_task_id IS NOT NULL THEN
    UPDATE public.handoff_tasks
    SET
      question = coalesce(NEW.question, question),
      question_ciphertext = coalesce(NEW.question_ciphertext, question_ciphertext),
      question_hash = coalesce(NEW.question_hash, question_hash),
      question_redacted = NEW.question_redacted OR question_redacted,
      answer = coalesce(NEW.answer, answer),
      answer_ciphertext = coalesce(NEW.answer_ciphertext, answer_ciphertext),
      answer_hash = coalesce(NEW.answer_hash, answer_hash),
      answer_redacted = NEW.answer_redacted OR answer_redacted,
      notes = coalesce(NEW.lead_note, notes),
      notes_ciphertext = coalesce(NEW.lead_note_ciphertext, notes_ciphertext),
      notes_hash = coalesce(NEW.lead_note_hash, notes_hash),
      notes_redacted = NEW.lead_note_redacted OR notes_redacted,
      updated_at = now()
    WHERE id = NEW.handoff_task_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handoff_updates_propagate_content_privacy ON public.handoff_updates;
CREATE TRIGGER handoff_updates_propagate_content_privacy
AFTER INSERT OR UPDATE ON public.handoff_updates
FOR EACH ROW EXECUTE FUNCTION public.kaxi_propagate_handoff_content_privacy();

NOTIFY pgrst, 'reload schema';
