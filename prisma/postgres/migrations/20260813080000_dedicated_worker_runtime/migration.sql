-- Durable work ledger for the dedicated KAXI Worker runtime.

CREATE TABLE public.worker_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  job_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB,
  trace_id TEXT NOT NULL,
  traceparent TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 8,
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  lock_token UUID,
  heartbeat_at TIMESTAMPTZ,
  timeout_ms INTEGER NOT NULL DEFAULT 300000,
  deadline_at TIMESTAMPTZ,
  last_error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT worker_jobs_status_check
    CHECK (status IN ('queued', 'processing', 'retry', 'completed', 'dead_letter', 'cancelled')),
  CONSTRAINT worker_jobs_attempts_check CHECK (attempts >= 0),
  CONSTRAINT worker_jobs_max_attempts_check CHECK (max_attempts BETWEEN 1 AND 50),
  CONSTRAINT worker_jobs_timeout_check CHECK (timeout_ms BETWEEN 1000 AND 3600000),
  CONSTRAINT worker_jobs_traceparent_check CHECK (
    traceparent IS NULL OR traceparent ~ '^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$'
  )
);

CREATE UNIQUE INDEX worker_jobs_tenant_type_idempotency_key
  ON public.worker_jobs (tenant_id, job_type, idempotency_key);
CREATE INDEX worker_jobs_delivery_idx
  ON public.worker_jobs (status, available_at, created_at);
CREATE INDEX worker_jobs_locked_idx
  ON public.worker_jobs (locked_at) WHERE locked_at IS NOT NULL;
CREATE INDEX worker_jobs_tenant_created_idx
  ON public.worker_jobs (tenant_id, created_at DESC);
CREATE INDEX worker_jobs_type_status_idx
  ON public.worker_jobs (job_type, status);

CREATE TABLE public.worker_source_checkpoints (
  job_id UUID NOT NULL REFERENCES public.worker_jobs(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  content_hash TEXT,
  last_error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (job_id, source_id),
  CONSTRAINT worker_source_checkpoints_status_check
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT worker_source_checkpoints_ordinal_check CHECK (ordinal >= 0)
);

CREATE INDEX worker_source_checkpoints_source_completed_idx
  ON public.worker_source_checkpoints (source_id, completed_at DESC);
CREATE INDEX worker_source_checkpoints_job_ordinal_idx
  ON public.worker_source_checkpoints (job_id, ordinal);

CREATE TRIGGER worker_jobs_touch_updated_at
BEFORE UPDATE ON public.worker_jobs
FOR EACH ROW EXECUTE FUNCTION public.kaxi_touch_updated_at();

CREATE TRIGGER worker_source_checkpoints_touch_updated_at
BEFORE UPDATE ON public.worker_source_checkpoints
FOR EACH ROW EXECUTE FUNCTION public.kaxi_touch_updated_at();

ALTER TABLE public.worker_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_source_checkpoints ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.worker_jobs FROM PUBLIC;
REVOKE ALL ON TABLE public.worker_source_checkpoints FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public.worker_jobs FROM anon;
    REVOKE ALL ON TABLE public.worker_source_checkpoints FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.worker_jobs FROM authenticated;
    REVOKE ALL ON TABLE public.worker_source_checkpoints FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.worker_jobs TO service_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.worker_source_checkpoints TO service_role;
  END IF;
END
$$;

COMMENT ON TABLE public.worker_jobs IS
  'Durable run ledger and leased queue for KAXI heavy/background work.';
COMMENT ON TABLE public.worker_source_checkpoints IS
  'Per-source durable cursor allowing an interrupted official-source monitor run to resume.';
COMMENT ON COLUMN public.worker_jobs.payload IS
  'Validated job parameters only; user conversation and contact PII are forbidden.';

NOTIFY pgrst, 'reload schema';
