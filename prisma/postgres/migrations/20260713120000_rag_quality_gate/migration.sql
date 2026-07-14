-- Preserve calibrated low-confidence semantics while suppressing ungrounded answers.
CREATE OR REPLACE FUNCTION public.kaxi_queue_retrieval_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message public.chat_messages%ROWTYPE;
  v_reason TEXT;
BEGIN
  IF NEW.session_id LIKE 'kaxi-eval-%'
    OR NEW.session_id LIKE 'kaxi-health-%'
    OR lower(coalesce(NEW.search_meta ->> 'evaluation', 'false')) = 'true'
    OR lower(coalesce(NEW.search_meta ->> 'healthCheck', 'false')) = 'true'
  THEN
    RETURN NEW;
  END IF;

  IF NEW.no_context_reason = 'below_calibrated_threshold'
    OR (
      NOT NEW.no_context
      AND NEW.retrieved_count > 0
      AND NEW.top_score IS NOT NULL
      AND NEW.similarity_threshold IS NOT NULL
      AND NEW.top_score < NEW.similarity_threshold + 0.05
    )
  THEN
    v_reason := 'low_confidence';
  ELSIF NEW.no_context OR NEW.retrieved_count = 0 THEN
    v_reason := 'no_context';
  ELSE
    RETURN NEW;
  END IF;

  SELECT * INTO v_message
  FROM public.chat_messages
  WHERE id = NEW.message_id;
  IF NOT FOUND OR v_message.status <> 'completed' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.handoff_tasks
    WHERE source_chat_message_id = NEW.message_id
      AND status IN ('open', 'review', 'contact_requested', 'contact_received', 'assigned', 'in_progress')
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.handoff_tasks (
    source_chat_message_id,
    session_id,
    tenant_id,
    question,
    question_ciphertext,
    question_hash,
    question_redacted,
    answer,
    answer_ciphertext,
    answer_hash,
    answer_redacted,
    risk_level,
    lead_stage,
    status,
    notes,
    queue_reason,
    dedupe_key
  ) VALUES (
    v_message.id,
    v_message.session_id,
    v_message.tenant_id,
    coalesce(nullif(v_message.question, ''), '[redacted-chat-question]'),
    v_message.question_ciphertext,
    v_message.question_hash,
    v_message.question_redacted,
    coalesce(v_message.answer, ''),
    v_message.answer_ciphertext,
    v_message.answer_hash,
    v_message.answer_redacted,
    coalesce(nullif(v_message.risk_level, ''), 'low'),
    coalesce(nullif(v_message.lead_stage, ''), 'review'),
    'open',
    CASE
      WHEN v_reason = 'no_context' THEN 'Automatic quality review: no grounded context was retrieved.'
      ELSE 'Automatic quality review: retrieval score was below the calibrated serving threshold.'
    END,
    v_reason,
    encode(digest(
      lower(coalesce(v_message.tenant_id, 'default')) || E'\n' ||
      lower(trim(v_message.session_id)) || E'\n' ||
      lower(regexp_replace(trim(v_message.question), '\s+', ' ', 'g')),
      'sha256'
    ), 'hex')
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.kaxi_queue_retrieval_review() IS
  'Queues no-context and calibrated low-confidence retrievals separately while excluding health and evaluation probes.';
