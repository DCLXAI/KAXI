-- Queryable, PII-safe distributed trace ledger shared by Web and Worker.

CREATE TABLE public.trace_spans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id TEXT NOT NULL,
  span_id TEXT NOT NULL UNIQUE,
  parent_span_id TEXT,
  request_id TEXT,
  service TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  duration_ms DOUBLE PRECISION NOT NULL,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT trace_spans_trace_id_check CHECK (trace_id ~ '^[0-9a-f]{32}$'),
  CONSTRAINT trace_spans_span_id_check CHECK (span_id ~ '^[0-9a-f]{16}$'),
  CONSTRAINT trace_spans_parent_span_id_check CHECK (
    parent_span_id IS NULL OR parent_span_id ~ '^[0-9a-f]{16}$'
  ),
  CONSTRAINT trace_spans_status_check CHECK (status IN ('ok', 'error')),
  CONSTRAINT trace_spans_duration_check CHECK (duration_ms >= 0)
);

CREATE INDEX trace_spans_trace_started_idx ON public.trace_spans (trace_id, started_at);
CREATE INDEX trace_spans_request_started_idx ON public.trace_spans (request_id, started_at)
  WHERE request_id IS NOT NULL;
CREATE INDEX trace_spans_service_name_started_idx ON public.trace_spans (service, name, started_at DESC);
CREATE INDEX trace_spans_status_started_idx ON public.trace_spans (status, started_at DESC);

ALTER TABLE public.trace_spans ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.trace_spans FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public.trace_spans FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.trace_spans FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT SELECT, INSERT, DELETE ON TABLE public.trace_spans TO service_role;
  END IF;
END
$$;

COMMENT ON TABLE public.trace_spans IS
  'PII-safe Web and Worker span ledger, queryable by trace_id or request_id.';
COMMENT ON COLUMN public.trace_spans.attributes IS
  'Redacted operational metadata only; prompts, answers, contact data, credentials, and ciphertext are forbidden.';

NOTIFY pgrst, 'reload schema';
