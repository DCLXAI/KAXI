CREATE TABLE IF NOT EXISTS public.ops_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'error',
  event_type TEXT NOT NULL,
  workflow_id TEXT,
  execution_id TEXT,
  message TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ops_events_execution_type_key
  ON public.ops_events(source, execution_id, event_type)
  WHERE execution_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ops_events_open_idx
  ON public.ops_events(severity, created_at DESC)
  WHERE acknowledged_at IS NULL;

CREATE TABLE IF NOT EXISTS public.system_health_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL,
  trigger_source TEXT NOT NULL DEFAULT 'daily-cron',
  checks JSONB NOT NULL DEFAULT '[]'::jsonb,
  failed_checks INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS system_health_runs_created_idx
  ON public.system_health_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS system_health_runs_status_idx
  ON public.system_health_runs(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.rag_evaluation_cases (
  id TEXT PRIMARY KEY,
  locale TEXT NOT NULL DEFAULT 'ko',
  category TEXT NOT NULL DEFAULT 'general',
  question TEXT NOT NULL,
  expected_doc_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  expected_risk_level TEXT,
  expected_handoff BOOLEAN,
  active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rag_evaluation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'running',
  workflow_id TEXT,
  workflow_version_id TEXT,
  corpus_version TEXT,
  case_count INTEGER NOT NULL DEFAULT 0,
  passed_count INTEGER NOT NULL DEFAULT 0,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.rag_evaluation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.rag_evaluation_runs(id) ON DELETE CASCADE,
  case_id TEXT NOT NULL REFERENCES public.rag_evaluation_cases(id) ON DELETE CASCADE,
  passed BOOLEAN NOT NULL,
  latency_ms INTEGER,
  top_score DOUBLE PRECISION,
  retrieved_doc_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_level TEXT,
  needs_human BOOLEAN,
  failure_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  response_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(run_id, case_id)
);
CREATE INDEX IF NOT EXISTS rag_evaluation_results_run_idx
  ON public.rag_evaluation_results(run_id, passed);

DROP TRIGGER IF EXISTS rag_evaluation_cases_touch_updated_at ON public.rag_evaluation_cases;
CREATE TRIGGER rag_evaluation_cases_touch_updated_at
BEFORE UPDATE ON public.rag_evaluation_cases
FOR EACH ROW EXECUTE FUNCTION public.kaxi_touch_updated_at();

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'ops_events', 'system_health_runs', 'rag_evaluation_cases',
    'rag_evaluation_runs', 'rag_evaluation_results'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', table_name);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', table_name);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated', table_name);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role', table_name);
    END IF;
  END LOOP;
END
$$;

COMMENT ON TABLE public.ops_events IS 'Server-only operational failures and alerts from n8n, KAXI, Typebot, and scheduled checks.';
COMMENT ON TABLE public.system_health_runs IS 'Daily end-to-end health snapshots for the RAG serving chain.';
COMMENT ON TABLE public.rag_evaluation_cases IS 'Governed regression cases for retrieval, answer grounding, risk, and handoff behavior.';

NOTIFY pgrst, 'reload schema';
