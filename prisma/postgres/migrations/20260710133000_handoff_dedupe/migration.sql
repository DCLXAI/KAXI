-- Prevent repeated retries or repeated n8n branches from flooding the handoff queue.

ALTER TABLE public.handoff_tasks
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

UPDATE public.handoff_tasks
SET dedupe_key = encode(
  digest(
    lower(coalesce(tenant_id, 'default')) || E'\n' ||
    lower(trim(session_id)) || E'\n' ||
    lower(regexp_replace(trim(question), '\s+', ' ', 'g')),
    'sha256'
  ),
  'hex'
)
WHERE dedupe_key IS NULL;

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY dedupe_key
      ORDER BY created_at ASC, id ASC
    ) AS duplicate_rank
  FROM public.handoff_tasks
  WHERE status IN ('open', 'review', 'contact_requested', 'contact_received')
)
UPDATE public.handoff_tasks task
SET
  status = 'duplicate',
  closed_at = coalesce(task.closed_at, now()),
  notes = concat_ws(E'\n', nullif(task.notes, ''), 'Automatically closed as a duplicate handoff task.'),
  updated_at = now()
FROM ranked
WHERE task.id = ranked.id
  AND ranked.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS handoff_tasks_open_dedupe_key
  ON public.handoff_tasks (dedupe_key)
  WHERE status IN ('open', 'review', 'contact_requested', 'contact_received');

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
      answer = coalesce(nullif(NEW.answer, ''), answer),
      risk_level = CASE
        WHEN NEW.risk_level = 'high' OR risk_level = 'high' THEN 'high'
        WHEN NEW.risk_level = 'medium' OR risk_level = 'medium' THEN 'medium'
        ELSE 'low'
      END,
      lead_stage = CASE
        WHEN NEW.lead_stage = 'urgent' OR lead_stage = 'urgent' THEN 'urgent'
        ELSE lead_stage
      END,
      updated_at = now()
    WHERE id = v_existing_id;
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handoff_tasks_dedupe_before_insert ON public.handoff_tasks;
CREATE TRIGGER handoff_tasks_dedupe_before_insert
BEFORE INSERT ON public.handoff_tasks
FOR EACH ROW
EXECUTE FUNCTION public.kaxi_dedupe_handoff_task();

COMMENT ON COLUMN public.handoff_tasks.dedupe_key IS
  'SHA-256 of tenant, session, and normalized question. Only one open task is allowed per key.';

NOTIFY pgrst, 'reload schema';
