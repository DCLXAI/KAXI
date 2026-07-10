CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.chat_attachment_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attachment_id TEXT NOT NULL UNIQUE REFERENCES public.chat_attachments(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  lock_token UUID,
  last_error TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chat_attachment_jobs_status_check
    CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  CONSTRAINT chat_attachment_jobs_attempts_check
    CHECK (attempts >= 0 AND max_attempts BETWEEN 1 AND 20)
);

CREATE INDEX IF NOT EXISTS chat_attachment_jobs_status_available_idx
  ON public.chat_attachment_jobs(status, available_at);
CREATE INDEX IF NOT EXISTS chat_attachment_jobs_locked_idx
  ON public.chat_attachment_jobs(locked_at)
  WHERE locked_at IS NOT NULL;

DROP TRIGGER IF EXISTS chat_attachment_jobs_touch_updated_at ON public.chat_attachment_jobs;
CREATE TRIGGER chat_attachment_jobs_touch_updated_at
BEFORE UPDATE ON public.chat_attachment_jobs
FOR EACH ROW EXECUTE FUNCTION public.kaxi_touch_updated_at();

CREATE OR REPLACE FUNCTION public.kaxi_claim_chat_attachment_jobs(
  p_limit INTEGER DEFAULT 3,
  p_lease_seconds INTEGER DEFAULT 120
)
RETURNS SETOF public.chat_attachment_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT job.id
    FROM public.chat_attachment_jobs AS job
    WHERE job.attempts < job.max_attempts
      AND (
        (job.status = 'queued' AND job.available_at <= now())
        OR (
          job.status = 'processing'
          AND job.locked_at < now() - make_interval(secs => GREATEST(p_lease_seconds, 30))
        )
      )
    ORDER BY job.available_at ASC, job.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(p_limit, 1), 20)
  )
  UPDATE public.chat_attachment_jobs AS job
  SET status = 'processing',
      attempts = job.attempts + 1,
      locked_at = now(),
      lock_token = gen_random_uuid(),
      last_error = NULL,
      updated_at = now()
  FROM candidates
  WHERE job.id = candidates.id
  RETURNING job.*;
END;
$$;

ALTER TABLE public.chat_attachment_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.chat_attachment_jobs FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.kaxi_claim_chat_attachment_jobs(INTEGER, INTEGER) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public.chat_attachment_jobs FROM anon;
    REVOKE EXECUTE ON FUNCTION public.kaxi_claim_chat_attachment_jobs(INTEGER, INTEGER) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.chat_attachment_jobs FROM authenticated;
    REVOKE EXECUTE ON FUNCTION public.kaxi_claim_chat_attachment_jobs(INTEGER, INTEGER) FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.chat_attachment_jobs TO service_role;
    GRANT EXECUTE ON FUNCTION public.kaxi_claim_chat_attachment_jobs(INTEGER, INTEGER) TO service_role;
  END IF;
END
$$;

COMMENT ON TABLE public.chat_attachment_jobs IS
  'Durable, leased retry queue for private chat attachment extraction jobs.';

NOTIFY pgrst, 'reload schema';
