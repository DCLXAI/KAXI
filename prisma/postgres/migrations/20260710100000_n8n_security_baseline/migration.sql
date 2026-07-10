-- Lock the n8n/Typebot operational surface to trusted server roles.
-- Browser clients must go through KAXI APIs; n8n uses a service-role credential.

CREATE TABLE IF NOT EXISTS public.webhook_nonces (
  nonce TEXT PRIMARY KEY,
  purpose TEXT NOT NULL,
  request_timestamp TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhook_nonces_expires_at_idx
  ON public.webhook_nonces (expires_at);

ALTER TABLE IF EXISTS public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.n8n_audit_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.handoff_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lead_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.handoff_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_nonces ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.knowledge_chunks FROM PUBLIC;
REVOKE ALL ON TABLE public.chat_sessions FROM PUBLIC;
REVOKE ALL ON TABLE public.chat_messages FROM PUBLIC;
REVOKE ALL ON TABLE public.chat_attachments FROM PUBLIC;
REVOKE ALL ON TABLE public.n8n_audit_messages FROM PUBLIC;
REVOKE ALL ON TABLE public.handoff_tasks FROM PUBLIC;
REVOKE ALL ON TABLE public.leads FROM PUBLIC;
REVOKE ALL ON TABLE public.lead_contacts FROM PUBLIC;
REVOKE ALL ON TABLE public.handoff_updates FROM PUBLIC;
REVOKE ALL ON TABLE public.webhook_nonces FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.match_documents(vector, integer, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.kaxi_infer_contact_type(text) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE
      public.knowledge_chunks,
      public.chat_sessions,
      public.chat_messages,
      public.chat_attachments,
      public.n8n_audit_messages,
      public.handoff_tasks,
      public.leads,
      public.lead_contacts,
      public.handoff_updates,
      public.webhook_nonces
    FROM anon;
    REVOKE EXECUTE ON FUNCTION public.match_documents(vector, integer, jsonb) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.kaxi_infer_contact_type(text) FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE
      public.knowledge_chunks,
      public.chat_sessions,
      public.chat_messages,
      public.chat_attachments,
      public.n8n_audit_messages,
      public.handoff_tasks,
      public.leads,
      public.lead_contacts,
      public.handoff_updates,
      public.webhook_nonces
    FROM authenticated;
    REVOKE EXECUTE ON FUNCTION public.match_documents(vector, integer, jsonb) FROM authenticated;
    REVOKE EXECUTE ON FUNCTION public.kaxi_infer_contact_type(text) FROM authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE
      public.knowledge_chunks,
      public.chat_sessions,
      public.chat_messages,
      public.chat_attachments,
      public.n8n_audit_messages,
      public.handoff_tasks,
      public.leads,
      public.lead_contacts,
      public.handoff_updates,
      public.webhook_nonces
    TO service_role;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
    GRANT EXECUTE ON FUNCTION public.match_documents(vector, integer, jsonb) TO service_role;
    GRANT EXECUTE ON FUNCTION public.kaxi_infer_contact_type(text) TO service_role;
  END IF;
END
$$;

COMMENT ON TABLE public.webhook_nonces IS
  'One-time HMAC request nonces used to reject replayed n8n runtime and ingestion calls.';

NOTIFY pgrst, 'reload schema';
