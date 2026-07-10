-- Preserve an auditable, versioned consent receipt before Typebot contact data
-- can enter the human handoff pipeline. The receipt follows the chat session's
-- lifecycle and is removed automatically when the session is deleted.

CREATE TABLE IF NOT EXISTS public.handoff_consent_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  typebot_result_id TEXT,
  scope TEXT NOT NULL DEFAULT 'HANDOFF_CONTACT_COLLECTION',
  notice_version TEXT NOT NULL,
  accepted BOOLEAN NOT NULL,
  accepted_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'typebot',
  locale TEXT NOT NULL DEFAULT 'ko',
  request_ip_hash TEXT,
  request_ua_hash TEXT,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  retention_until TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '90 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT handoff_consent_evidence_session_fkey
    FOREIGN KEY (session_id)
    REFERENCES public.chat_sessions(session_key)
    ON DELETE CASCADE,
  CONSTRAINT handoff_consent_evidence_acceptance_check
    CHECK (
      (accepted = true AND accepted_at IS NOT NULL)
      OR (accepted = false AND accepted_at IS NULL)
    ),
  CONSTRAINT handoff_consent_evidence_session_scope_version_key
    UNIQUE (session_id, scope, notice_version)
);

CREATE INDEX IF NOT EXISTS handoff_consent_evidence_result_idx
  ON public.handoff_consent_evidence (typebot_result_id)
  WHERE typebot_result_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS handoff_consent_evidence_accepted_idx
  ON public.handoff_consent_evidence (accepted_at DESC)
  WHERE accepted = true;
CREATE INDEX IF NOT EXISTS handoff_consent_evidence_retention_idx
  ON public.handoff_consent_evidence (retention_until);

ALTER TABLE public.handoff_consent_evidence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.handoff_consent_evidence FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public.handoff_consent_evidence FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.handoff_consent_evidence FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.handoff_consent_evidence TO service_role;
  END IF;
END
$$;

COMMENT ON TABLE public.handoff_consent_evidence IS
  'Versioned Typebot consent receipts required before human-handoff contact collection.';

NOTIFY pgrst, 'reload schema';
