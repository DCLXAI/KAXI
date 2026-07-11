-- Make workflow, model, and prompt provenance queryable for every RAG response
-- and operational log. Historical rows remain explicitly unversioned instead
-- of being incorrectly attributed to the current release.

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS workflow_id TEXT,
  ADD COLUMN IF NOT EXISTS workflow_version_id TEXT,
  ADD COLUMN IF NOT EXISTS model_version TEXT,
  ADD COLUMN IF NOT EXISTS prompt_version TEXT;

ALTER TABLE public.retrieval_runs
  ADD COLUMN IF NOT EXISTS workflow_id TEXT,
  ADD COLUMN IF NOT EXISTS workflow_version_id TEXT,
  ADD COLUMN IF NOT EXISTS model_version TEXT,
  ADD COLUMN IF NOT EXISTS prompt_version TEXT;

ALTER TABLE public.n8n_audit_messages
  ADD COLUMN IF NOT EXISTS workflow_id TEXT,
  ADD COLUMN IF NOT EXISTS workflow_version_id TEXT,
  ADD COLUMN IF NOT EXISTS model_version TEXT,
  ADD COLUMN IF NOT EXISTS prompt_version TEXT;

ALTER TABLE public.ops_events
  ADD COLUMN IF NOT EXISTS workflow_id TEXT,
  ADD COLUMN IF NOT EXISTS workflow_version_id TEXT,
  ADD COLUMN IF NOT EXISTS model_version TEXT,
  ADD COLUMN IF NOT EXISTS prompt_version TEXT;

ALTER TABLE public.system_health_runs
  ADD COLUMN IF NOT EXISTS workflow_id TEXT,
  ADD COLUMN IF NOT EXISTS workflow_version_id TEXT,
  ADD COLUMN IF NOT EXISTS model_version TEXT,
  ADD COLUMN IF NOT EXISTS prompt_version TEXT;

ALTER TABLE public.rag_evaluation_runs
  ADD COLUMN IF NOT EXISTS workflow_id TEXT,
  ADD COLUMN IF NOT EXISTS workflow_version_id TEXT,
  ADD COLUMN IF NOT EXISTS model_version TEXT,
  ADD COLUMN IF NOT EXISTS prompt_version TEXT;

UPDATE public.chat_messages
SET workflow_id = coalesce(nullif(trim(workflow_id), ''), 'legacy-unversioned'),
    workflow_version_id = coalesce(nullif(trim(workflow_version_id), ''), 'legacy-unversioned'),
    model_version = coalesce(nullif(trim(model_version), ''), 'legacy-unversioned'),
    prompt_version = coalesce(nullif(trim(prompt_version), ''), 'legacy-unversioned');

UPDATE public.retrieval_runs
SET workflow_id = coalesce(nullif(trim(workflow_id), ''), 'legacy-unversioned'),
    workflow_version_id = coalesce(nullif(trim(workflow_version_id), ''), 'legacy-unversioned'),
    model_version = coalesce(nullif(trim(model_version), ''), 'legacy-unversioned'),
    prompt_version = coalesce(nullif(trim(prompt_version), ''), 'legacy-unversioned');

UPDATE public.n8n_audit_messages
SET workflow_id = coalesce(nullif(trim(workflow_id), ''), 'legacy-unversioned'),
    workflow_version_id = coalesce(nullif(trim(workflow_version_id), ''), 'legacy-unversioned'),
    model_version = coalesce(nullif(trim(model_version), ''), 'legacy-unversioned'),
    prompt_version = coalesce(nullif(trim(prompt_version), ''), 'legacy-unversioned');

UPDATE public.ops_events
SET workflow_id = coalesce(nullif(trim(workflow_id), ''), 'legacy-unversioned'),
    workflow_version_id = coalesce(nullif(trim(workflow_version_id), ''), 'legacy-unversioned'),
    model_version = coalesce(nullif(trim(model_version), ''), 'legacy-unversioned'),
    prompt_version = coalesce(nullif(trim(prompt_version), ''), 'legacy-unversioned');

UPDATE public.system_health_runs
SET workflow_id = coalesce(nullif(trim(workflow_id), ''), 'legacy-unversioned'),
    workflow_version_id = coalesce(nullif(trim(workflow_version_id), ''), 'legacy-unversioned'),
    model_version = coalesce(nullif(trim(model_version), ''), 'legacy-unversioned'),
    prompt_version = coalesce(nullif(trim(prompt_version), ''), 'legacy-unversioned');

UPDATE public.rag_evaluation_runs
SET workflow_id = coalesce(nullif(trim(workflow_id), ''), 'legacy-unversioned'),
    workflow_version_id = coalesce(nullif(trim(workflow_version_id), ''), 'legacy-unversioned'),
    model_version = coalesce(nullif(trim(model_version), ''), 'legacy-unversioned'),
    prompt_version = coalesce(nullif(trim(prompt_version), ''), 'legacy-unversioned');

ALTER TABLE public.chat_messages
  ALTER COLUMN workflow_id SET DEFAULT 'legacy-unversioned',
  ALTER COLUMN workflow_id SET NOT NULL,
  ALTER COLUMN workflow_version_id SET DEFAULT 'legacy-unversioned',
  ALTER COLUMN workflow_version_id SET NOT NULL,
  ALTER COLUMN model_version SET DEFAULT 'legacy-unversioned',
  ALTER COLUMN model_version SET NOT NULL,
  ALTER COLUMN prompt_version SET DEFAULT 'legacy-unversioned',
  ALTER COLUMN prompt_version SET NOT NULL;

ALTER TABLE public.retrieval_runs
  ALTER COLUMN workflow_id SET DEFAULT 'legacy-unversioned',
  ALTER COLUMN workflow_id SET NOT NULL,
  ALTER COLUMN workflow_version_id SET DEFAULT 'legacy-unversioned',
  ALTER COLUMN workflow_version_id SET NOT NULL,
  ALTER COLUMN model_version SET DEFAULT 'legacy-unversioned',
  ALTER COLUMN model_version SET NOT NULL,
  ALTER COLUMN prompt_version SET DEFAULT 'legacy-unversioned',
  ALTER COLUMN prompt_version SET NOT NULL;

ALTER TABLE public.n8n_audit_messages
  ALTER COLUMN workflow_id SET DEFAULT 'legacy-unversioned',
  ALTER COLUMN workflow_id SET NOT NULL,
  ALTER COLUMN workflow_version_id SET DEFAULT 'legacy-unversioned',
  ALTER COLUMN workflow_version_id SET NOT NULL,
  ALTER COLUMN model_version SET DEFAULT 'legacy-unversioned',
  ALTER COLUMN model_version SET NOT NULL,
  ALTER COLUMN prompt_version SET DEFAULT 'legacy-unversioned',
  ALTER COLUMN prompt_version SET NOT NULL;

ALTER TABLE public.ops_events
  ALTER COLUMN workflow_id SET DEFAULT 'legacy-unversioned',
  ALTER COLUMN workflow_id SET NOT NULL,
  ALTER COLUMN workflow_version_id SET DEFAULT 'legacy-unversioned',
  ALTER COLUMN workflow_version_id SET NOT NULL,
  ALTER COLUMN model_version SET DEFAULT 'legacy-unversioned',
  ALTER COLUMN model_version SET NOT NULL,
  ALTER COLUMN prompt_version SET DEFAULT 'legacy-unversioned',
  ALTER COLUMN prompt_version SET NOT NULL;

ALTER TABLE public.system_health_runs
  ALTER COLUMN workflow_id SET DEFAULT 'legacy-unversioned',
  ALTER COLUMN workflow_id SET NOT NULL,
  ALTER COLUMN workflow_version_id SET DEFAULT 'legacy-unversioned',
  ALTER COLUMN workflow_version_id SET NOT NULL,
  ALTER COLUMN model_version SET DEFAULT 'legacy-unversioned',
  ALTER COLUMN model_version SET NOT NULL,
  ALTER COLUMN prompt_version SET DEFAULT 'legacy-unversioned',
  ALTER COLUMN prompt_version SET NOT NULL;

ALTER TABLE public.rag_evaluation_runs
  ALTER COLUMN workflow_id SET DEFAULT 'legacy-unversioned',
  ALTER COLUMN workflow_id SET NOT NULL,
  ALTER COLUMN workflow_version_id SET DEFAULT 'legacy-unversioned',
  ALTER COLUMN workflow_version_id SET NOT NULL,
  ALTER COLUMN model_version SET DEFAULT 'legacy-unversioned',
  ALTER COLUMN model_version SET NOT NULL,
  ALTER COLUMN prompt_version SET DEFAULT 'legacy-unversioned',
  ALTER COLUMN prompt_version SET NOT NULL;

CREATE INDEX IF NOT EXISTS chat_messages_provenance_idx
  ON public.chat_messages(workflow_id, workflow_version_id, created_at DESC);
CREATE INDEX IF NOT EXISTS retrieval_runs_provenance_idx
  ON public.retrieval_runs(workflow_id, workflow_version_id, created_at DESC);
CREATE INDEX IF NOT EXISTS n8n_audit_messages_provenance_idx
  ON public.n8n_audit_messages(workflow_id, workflow_version_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ops_events_provenance_idx
  ON public.ops_events(workflow_id, workflow_version_id, created_at DESC);
CREATE INDEX IF NOT EXISTS system_health_runs_provenance_idx
  ON public.system_health_runs(workflow_id, workflow_version_id, created_at DESC);
CREATE INDEX IF NOT EXISTS rag_evaluation_runs_provenance_idx
  ON public.rag_evaluation_runs(workflow_id, workflow_version_id, started_at DESC);

COMMENT ON COLUMN public.chat_messages.workflow_version_id IS
  'Immutable KAXI RAG workflow release identifier returned to the caller.';
COMMENT ON COLUMN public.chat_messages.model_version IS
  'Fully qualified retrieval or answer model version used for this turn.';
COMMENT ON COLUMN public.chat_messages.prompt_version IS
  'Version of the grounded-answer policy and prompt contract used for this turn.';

NOTIFY pgrst, 'reload schema';
