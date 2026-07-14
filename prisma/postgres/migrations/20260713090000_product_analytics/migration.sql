-- Privacy-minimized product analytics for diagnosis, chat, citation, and handoff funnels.
CREATE TABLE IF NOT EXISTS public.product_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL UNIQUE,
  event_name TEXT NOT NULL,
  anonymous_id UUID NOT NULL,
  session_id TEXT,
  locale TEXT NOT NULL DEFAULT 'ko',
  surface TEXT NOT NULL,
  path TEXT,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT product_events_name_check CHECK (event_name IN (
    'page_view',
    'diagnosis_viewed',
    'diagnosis_card_selected',
    'diagnosis_completed',
    'chatbot_opened',
    'chatbot_question_sent',
    'chatbot_answer_succeeded',
    'chatbot_answer_failed',
    'chatbot_no_context',
    'chatbot_retry',
    'citation_clicked',
    'handoff_created',
    'handoff_assigned',
    'handoff_response_completed'
  )),
  CONSTRAINT product_events_locale_check CHECK (locale IN ('ko', 'en', 'vi', 'mn')),
  CONSTRAINT product_events_surface_length CHECK (char_length(surface) BETWEEN 1 AND 80),
  CONSTRAINT product_events_path_length CHECK (path IS NULL OR char_length(path) <= 240),
  CONSTRAINT product_events_session_length CHECK (session_id IS NULL OR char_length(session_id) <= 160),
  CONSTRAINT product_events_properties_object CHECK (jsonb_typeof(properties) = 'object')
);

CREATE INDEX IF NOT EXISTS product_events_name_time_idx
  ON public.product_events (event_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS product_events_locale_time_idx
  ON public.product_events (locale, occurred_at DESC);
CREATE INDEX IF NOT EXISTS product_events_anonymous_time_idx
  ON public.product_events (anonymous_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS product_events_session_time_idx
  ON public.product_events (session_id, occurred_at DESC)
  WHERE session_id IS NOT NULL;

ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.product_events FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public.product_events FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.product_events FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.product_events TO service_role;
  END IF;
END
$$;

COMMENT ON TABLE public.product_events IS
  'Server-owned, privacy-minimized product funnel events. Never store question, answer, contact, or raw document URL values.';
