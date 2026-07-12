-- Close the operator-review loop from weak retrieval to governed evaluation.

ALTER TABLE public.handoff_tasks
  ADD COLUMN IF NOT EXISTS queue_reason TEXT NOT NULL DEFAULT 'needs_human',
  ADD COLUMN IF NOT EXISTS resolution_code TEXT,
  ADD COLUMN IF NOT EXISTS resolved_by TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS evaluation_case_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'handoff_tasks_queue_reason_check'
  ) THEN
    ALTER TABLE public.handoff_tasks
      ADD CONSTRAINT handoff_tasks_queue_reason_check
      CHECK (queue_reason IN ('needs_human', 'no_context', 'low_confidence'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'handoff_tasks_resolution_code_check'
  ) THEN
    ALTER TABLE public.handoff_tasks
      ADD CONSTRAINT handoff_tasks_resolution_code_check
      CHECK (resolution_code IS NULL OR resolution_code IN ('resolved', 'inaccurate', 'missing_document'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'handoff_tasks_evaluation_case_id_fkey'
  ) THEN
    ALTER TABLE public.handoff_tasks
      ADD CONSTRAINT handoff_tasks_evaluation_case_id_fkey
      FOREIGN KEY (evaluation_case_id)
      REFERENCES public.rag_evaluation_cases(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS handoff_tasks_quality_queue_idx
  ON public.handoff_tasks (queue_reason, status, created_at DESC);
CREATE INDEX IF NOT EXISTS handoff_tasks_resolution_idx
  ON public.handoff_tasks (resolution_code, resolved_at DESC)
  WHERE resolution_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.rag_review_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handoff_task_id BIGINT NOT NULL UNIQUE REFERENCES public.handoff_tasks(id) ON DELETE CASCADE,
  source_chat_message_id BIGINT REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  retrieval_run_id UUID REFERENCES public.retrieval_runs(id) ON DELETE SET NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('resolved', 'inaccurate', 'missing_document')),
  reviewer TEXT NOT NULL,
  expected_doc_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  evaluation_case_id TEXT NOT NULL REFERENCES public.rag_evaluation_cases(id) ON DELETE CASCADE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rag_review_feedback_verdict_idx
  ON public.rag_review_feedback (verdict, created_at DESC);
CREATE INDEX IF NOT EXISTS rag_review_feedback_case_idx
  ON public.rag_review_feedback (evaluation_case_id);

DROP TRIGGER IF EXISTS rag_review_feedback_touch_updated_at ON public.rag_review_feedback;
CREATE TRIGGER rag_review_feedback_touch_updated_at
BEFORE UPDATE ON public.rag_review_feedback
FOR EACH ROW EXECUTE FUNCTION public.kaxi_touch_updated_at();

ALTER TABLE public.rag_review_feedback ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rag_review_feedback FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public.rag_review_feedback FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.rag_review_feedback FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.rag_review_feedback TO service_role;
  END IF;
END
$$;

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

  IF NEW.no_context OR NEW.retrieved_count = 0 THEN
    v_reason := 'no_context';
  ELSIF NEW.top_score IS NOT NULL
    AND NEW.similarity_threshold IS NOT NULL
    AND NEW.top_score < NEW.similarity_threshold + 0.05
  THEN
    v_reason := 'low_confidence';
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
      ELSE 'Automatic quality review: retrieval score was near the serving threshold.'
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

DROP TRIGGER IF EXISTS retrieval_runs_queue_review ON public.retrieval_runs;
CREATE TRIGGER retrieval_runs_queue_review
AFTER INSERT OR UPDATE OF no_context, retrieved_count, top_score, similarity_threshold
ON public.retrieval_runs
FOR EACH ROW EXECUTE FUNCTION public.kaxi_queue_retrieval_review();

-- Bring the recent unresolved quality backlog into the same queue without
-- replaying health/evaluation probes or duplicating existing handoffs.
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
)
SELECT
  message.id,
  message.session_id,
  message.tenant_id,
  coalesce(nullif(message.question, ''), '[redacted-chat-question]'),
  message.question_ciphertext,
  message.question_hash,
  message.question_redacted,
  coalesce(message.answer, ''),
  message.answer_ciphertext,
  message.answer_hash,
  message.answer_redacted,
  coalesce(nullif(message.risk_level, ''), 'low'),
  coalesce(nullif(message.lead_stage, ''), 'review'),
  'open',
  CASE
    WHEN retrieval.no_context OR retrieval.retrieved_count = 0
      THEN 'Backfilled quality review: no grounded context was retrieved.'
    ELSE 'Backfilled quality review: retrieval score was near the serving threshold.'
  END,
  CASE
    WHEN retrieval.no_context OR retrieval.retrieved_count = 0 THEN 'no_context'
    ELSE 'low_confidence'
  END,
  encode(digest(
    lower(coalesce(message.tenant_id, 'default')) || E'\n' ||
    lower(trim(message.session_id)) || E'\n' ||
    lower(regexp_replace(trim(message.question), '\s+', ' ', 'g')),
    'sha256'
  ), 'hex')
FROM public.retrieval_runs retrieval
JOIN public.chat_messages message ON message.id = retrieval.message_id
WHERE retrieval.created_at >= now() - interval '30 days'
  AND message.status = 'completed'
  AND retrieval.session_id NOT LIKE 'kaxi-eval-%'
  AND retrieval.session_id NOT LIKE 'kaxi-health-%'
  AND (
    retrieval.no_context
    OR retrieval.retrieved_count = 0
    OR (
      retrieval.top_score IS NOT NULL
      AND retrieval.similarity_threshold IS NOT NULL
      AND retrieval.top_score < retrieval.similarity_threshold + 0.05
    )
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.handoff_tasks existing
    WHERE existing.source_chat_message_id = message.id
  )
ORDER BY retrieval.created_at DESC
LIMIT 500
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.kaxi_resolve_handoff_review(
  p_handoff_task_id BIGINT,
  p_verdict TEXT,
  p_reviewer TEXT
)
RETURNS TABLE (
  handoff_task_id BIGINT,
  evaluation_case_id TEXT,
  evaluation_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task public.handoff_tasks%ROWTYPE;
  v_message public.chat_messages%ROWTYPE;
  v_retrieval public.retrieval_runs%ROWTYPE;
  v_case_id TEXT;
  v_doc_ids JSONB := '[]'::jsonb;
  v_active BOOLEAN := false;
  v_question TEXT;
BEGIN
  IF p_verdict NOT IN ('resolved', 'inaccurate', 'missing_document') THEN
    RAISE EXCEPTION 'HANDOFF_RESOLUTION_INVALID';
  END IF;
  IF nullif(trim(p_reviewer), '') IS NULL THEN
    RAISE EXCEPTION 'HANDOFF_REVIEWER_REQUIRED';
  END IF;

  SELECT * INTO v_task
  FROM public.handoff_tasks
  WHERE id = p_handoff_task_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'HANDOFF_NOT_FOUND';
  END IF;

  IF v_task.source_chat_message_id IS NOT NULL THEN
    SELECT * INTO v_message FROM public.chat_messages WHERE id = v_task.source_chat_message_id;
    SELECT * INTO v_retrieval FROM public.retrieval_runs WHERE message_id = v_task.source_chat_message_id;
  END IF;

  v_case_id := 'operator-handoff-' || p_handoff_task_id::text;
  v_question := coalesce(nullif(v_message.question, ''), nullif(v_task.question, ''), '[redacted-chat-question]');

  IF v_retrieval.id IS NOT NULL THEN
    SELECT coalesce(jsonb_agg(to_jsonb(doc_id) ORDER BY doc_id), '[]'::jsonb)
    INTO v_doc_ids
    FROM (
      SELECT DISTINCT item ->> 'docId' AS doc_id
      FROM jsonb_array_elements(coalesce(v_retrieval.sources, '[]'::jsonb)) AS item
      WHERE nullif(item ->> 'docId', '') IS NOT NULL
    ) docs;
  END IF;

  v_active := p_verdict = 'resolved'
    AND jsonb_array_length(v_doc_ids) > 0
    AND v_question NOT LIKE '[%';

  INSERT INTO public.rag_evaluation_cases (
    id,
    locale,
    category,
    question,
    expected_doc_ids,
    expected_risk_level,
    expected_handoff,
    active,
    metadata
  ) VALUES (
    v_case_id,
    coalesce(nullif(v_message.locale, ''), 'ko'),
    coalesce(nullif(v_retrieval.category, ''), 'general'),
    v_question,
    v_doc_ids,
    nullif(v_message.risk_level, ''),
    v_message.needs_human,
    v_active,
    jsonb_build_object(
      'source', 'operator-review',
      'reviewStatus', CASE WHEN v_active THEN 'ready' ELSE 'pending_expectation_review' END,
      'operatorVerdict', p_verdict,
      'handoffTaskId', p_handoff_task_id,
      'sourceChatMessageId', v_task.source_chat_message_id,
      'retrievalRunId', v_retrieval.id,
      'queueReason', v_task.queue_reason,
      'noContext', coalesce(v_retrieval.no_context, false),
      'topScore', v_retrieval.top_score,
      'similarityThreshold', v_retrieval.similarity_threshold,
      'workflowId', v_message.workflow_id,
      'workflowVersionId', v_message.workflow_version_id,
      'modelVersion', v_message.model_version,
      'promptVersion', v_message.prompt_version,
      'reviewedBy', left(trim(p_reviewer), 160),
      'reviewedAt', now()
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    locale = EXCLUDED.locale,
    category = EXCLUDED.category,
    question = EXCLUDED.question,
    expected_doc_ids = EXCLUDED.expected_doc_ids,
    expected_risk_level = EXCLUDED.expected_risk_level,
    expected_handoff = EXCLUDED.expected_handoff,
    active = EXCLUDED.active,
    metadata = EXCLUDED.metadata,
    updated_at = now();

  INSERT INTO public.rag_review_feedback (
    handoff_task_id,
    source_chat_message_id,
    retrieval_run_id,
    verdict,
    reviewer,
    expected_doc_ids,
    evaluation_case_id,
    metadata
  ) VALUES (
    p_handoff_task_id,
    v_task.source_chat_message_id,
    v_retrieval.id,
    p_verdict,
    left(trim(p_reviewer), 160),
    v_doc_ids,
    v_case_id,
    jsonb_build_object('queueReason', v_task.queue_reason, 'evaluationActive', v_active)
  )
  ON CONFLICT ON CONSTRAINT rag_review_feedback_handoff_task_id_key DO UPDATE SET
    verdict = EXCLUDED.verdict,
    reviewer = EXCLUDED.reviewer,
    expected_doc_ids = EXCLUDED.expected_doc_ids,
    evaluation_case_id = EXCLUDED.evaluation_case_id,
    metadata = EXCLUDED.metadata,
    updated_at = now();

  UPDATE public.handoff_tasks
  SET
    status = 'resolved',
    resolution_code = p_verdict,
    resolved_by = left(trim(p_reviewer), 160),
    resolved_at = now(),
    evaluation_case_id = v_case_id,
    closed_at = now(),
    updated_at = now()
  WHERE id = p_handoff_task_id;

  RETURN QUERY SELECT p_handoff_task_id, v_case_id, v_active;
END;
$$;

REVOKE ALL ON FUNCTION public.kaxi_queue_retrieval_review() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.kaxi_resolve_handoff_review(BIGINT, TEXT, TEXT) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.kaxi_resolve_handoff_review(BIGINT, TEXT, TEXT) TO service_role;
  END IF;
END
$$;

COMMENT ON COLUMN public.handoff_tasks.queue_reason IS 'Why this item entered the operator queue: explicit handoff, no context, or low retrieval confidence.';
COMMENT ON COLUMN public.handoff_tasks.resolution_code IS 'Structured operator verdict used to generate governed RAG evaluation feedback.';
COMMENT ON TABLE public.rag_review_feedback IS 'Server-only audit link from operator handoff verdicts to governed RAG evaluation cases.';

NOTIFY pgrst, 'reload schema';
