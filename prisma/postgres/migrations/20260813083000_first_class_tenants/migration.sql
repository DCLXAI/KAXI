-- First-class tenant aggregate and tenant-scoped identity/idempotency keys.
-- Expand -> backfill -> switch -> constrain is kept in one transactional
-- migration so no implicit tenant write can enter between those phases.

CREATE TABLE public.tenants (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  key_version INTEGER NOT NULL DEFAULT 1,
  retention_days INTEGER NOT NULL DEFAULT 90,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tenants_status_check CHECK (status IN ('active', 'suspended', 'deleting')),
  CONSTRAINT tenants_retention_days_check CHECK (retention_days BETWEEN 1 AND 3650)
);

INSERT INTO public.tenants (id, slug, name)
VALUES ('platform', 'platform', 'KAXI Platform')
ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name;

ALTER TABLE "Organization" ADD COLUMN "tenant_id" TEXT;
ALTER TABLE public.handoff_consent_evidence ADD COLUMN tenant_id TEXT;
ALTER TABLE public.retrieval_runs ADD COLUMN tenant_id TEXT;
ALTER TABLE public.chat_attachments ADD COLUMN tenant_id TEXT;
ALTER TABLE public.worker_jobs ADD COLUMN tenant_claim TEXT;
ALTER TABLE public.chat_attachment_jobs ADD COLUMN tenant_id TEXT;
ALTER TABLE public.chat_attachment_jobs ADD COLUMN tenant_claim TEXT;

UPDATE "Organization" SET "tenant_id" = 'platform' WHERE "tenant_id" IS NULL;

UPDATE public.chat_sessions SET tenant_id = 'platform' WHERE tenant_id IS NULL OR tenant_id = 'default';
UPDATE public.chat_messages SET tenant_id = 'platform' WHERE tenant_id IS NULL OR tenant_id = 'default';
UPDATE public.handoff_tasks SET tenant_id = 'platform' WHERE tenant_id IS NULL OR tenant_id = 'default';
UPDATE public.leads SET tenant_id = 'platform' WHERE tenant_id IS NULL OR tenant_id = 'default';
UPDATE public.n8n_audit_messages SET tenant_id = 'platform' WHERE tenant_id IS NULL OR tenant_id = 'default';
UPDATE public.outbox_events SET tenant_id = 'platform' WHERE tenant_id IS NULL OR tenant_id = 'default';
UPDATE public.worker_jobs SET tenant_id = 'platform' WHERE tenant_id IS NULL OR tenant_id = 'default';
UPDATE public.handoff_updates SET tenant_id = 'platform' WHERE tenant_id IS NULL OR tenant_id = 'default';

UPDATE public.handoff_consent_evidence evidence
SET tenant_id = session.tenant_id
FROM public.chat_sessions session
WHERE evidence.session_id = session.session_key AND evidence.tenant_id IS NULL;

UPDATE public.retrieval_runs run
SET tenant_id = message.tenant_id
FROM public.chat_messages message
WHERE run.message_id = message.id AND run.tenant_id IS NULL;

UPDATE public.chat_attachments attachment
SET tenant_id = session.tenant_id
FROM public.chat_sessions session
WHERE attachment.session_id = session.session_key AND attachment.tenant_id IS NULL;

UPDATE public.chat_attachment_jobs job
SET tenant_id = attachment.tenant_id
FROM public.chat_attachments attachment
WHERE job.attachment_id = attachment.id AND job.tenant_id IS NULL;

UPDATE public.handoff_consent_evidence SET tenant_id = 'platform' WHERE tenant_id IS NULL;
UPDATE public.retrieval_runs SET tenant_id = 'platform' WHERE tenant_id IS NULL;
UPDATE public.chat_attachments SET tenant_id = 'platform' WHERE tenant_id IS NULL;
UPDATE public.chat_attachment_jobs SET tenant_id = 'platform' WHERE tenant_id IS NULL;

UPDATE public.knowledge_chunks
SET metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{tenant_id}', '"platform"'::jsonb, true)
WHERE coalesce(nullif(metadata->>'tenant_id', ''), 'default') = 'default';

ALTER TABLE "Organization" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE public.handoff_consent_evidence ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.retrieval_runs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.chat_attachments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.chat_attachment_jobs ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.chat_sessions ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.chat_messages ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.handoff_tasks ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.leads ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.n8n_audit_messages ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.outbox_events ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.worker_jobs ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.handoff_updates ALTER COLUMN tenant_id DROP DEFAULT;

ALTER TABLE "Organization"
  ADD CONSTRAINT "Organization_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES public.tenants(id) ON DELETE RESTRICT;
ALTER TABLE public.chat_sessions
  ADD CONSTRAINT chat_sessions_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;
ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;
ALTER TABLE public.handoff_tasks
  ADD CONSTRAINT handoff_tasks_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;
ALTER TABLE public.leads
  ADD CONSTRAINT leads_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;
ALTER TABLE public.n8n_audit_messages
  ADD CONSTRAINT n8n_audit_messages_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;
ALTER TABLE public.outbox_events
  ADD CONSTRAINT outbox_events_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;
ALTER TABLE public.worker_jobs
  ADD CONSTRAINT worker_jobs_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;
ALTER TABLE public.handoff_updates
  ADD CONSTRAINT handoff_updates_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;
ALTER TABLE public.handoff_consent_evidence
  ADD CONSTRAINT handoff_consent_evidence_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;
ALTER TABLE public.retrieval_runs
  ADD CONSTRAINT retrieval_runs_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;
ALTER TABLE public.chat_attachments
  ADD CONSTRAINT chat_attachments_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;
ALTER TABLE public.chat_attachment_jobs
  ADD CONSTRAINT chat_attachment_jobs_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;

ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_session_id_fkey;
ALTER TABLE public.chat_attachments DROP CONSTRAINT IF EXISTS chat_attachments_session_id_fkey;
ALTER TABLE public.retrieval_runs DROP CONSTRAINT IF EXISTS retrieval_runs_session_id_fkey;
ALTER TABLE public.handoff_consent_evidence DROP CONSTRAINT IF EXISTS handoff_consent_evidence_session_fkey;

ALTER TABLE public.chat_sessions DROP CONSTRAINT IF EXISTS chat_sessions_session_key_key;
DROP INDEX IF EXISTS public.chat_sessions_typebot_result_id_key;
ALTER TABLE public.handoff_consent_evidence
  DROP CONSTRAINT IF EXISTS handoff_consent_evidence_session_scope_version_key;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_session_id_key;

CREATE UNIQUE INDEX chat_sessions_tenant_session_key
  ON public.chat_sessions (tenant_id, session_key);
CREATE UNIQUE INDEX chat_sessions_tenant_typebot_result_key
  ON public.chat_sessions (tenant_id, typebot_result_id);
CREATE UNIQUE INDEX handoff_consent_tenant_session_scope_version_key
  ON public.handoff_consent_evidence (tenant_id, session_id, scope, notice_version);
CREATE UNIQUE INDEX leads_tenant_session_key
  ON public.leads (tenant_id, session_id);

-- The legacy webhook trigger pre-dates tenant identity. Patch the final function
-- definition (including later privacy additions) instead of copying an older
-- body and accidentally dropping those protections.
DO $$
DECLARE
  function_definition TEXT;
BEGIN
  SELECT pg_get_functiondef('public.kaxi_apply_handoff_update()'::regprocedure)
  INTO function_definition;

  function_definition := replace(
    function_definition,
    'v_tenant_id TEXT := coalesce(nullif(trim(NEW.tenant_id), ''''), ''default'')',
    'v_tenant_id TEXT := nullif(trim(NEW.tenant_id), '''')'
  );
  function_definition := replace(
    function_definition,
    'IF v_session_id IS NULL THEN',
    'IF v_session_id IS NULL OR v_tenant_id IS NULL THEN'
  );
  function_definition := replace(
    function_definition,
    'WHERE session_id = v_session_id',
    'WHERE session_id = v_session_id
    AND tenant_id = v_tenant_id'
  );
  function_definition := replace(
    function_definition,
    'v_lead_id := ''lead_'' || md5(v_session_id)',
    'v_lead_id := ''lead_'' || md5(v_tenant_id || '':'' || v_session_id)'
  );
  function_definition := replace(
    function_definition,
    'ON CONFLICT (session_id) DO UPDATE',
    'ON CONFLICT (tenant_id, session_id) DO UPDATE'
  );

  IF function_definition LIKE '%''default''%'
    OR function_definition NOT LIKE '%tenant_id = v_tenant_id%'
    OR function_definition NOT LIKE '%ON CONFLICT (tenant_id, session_id)%'
  THEN
    RAISE EXCEPTION 'Unable to tenant-scope kaxi_apply_handoff_update';
  END IF;

  EXECUTE function_definition;
END
$$;

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_tenant_session_fkey
  FOREIGN KEY (tenant_id, session_id)
  REFERENCES public.chat_sessions(tenant_id, session_key) ON DELETE CASCADE;
ALTER TABLE public.chat_attachments
  ADD CONSTRAINT chat_attachments_tenant_session_fkey
  FOREIGN KEY (tenant_id, session_id)
  REFERENCES public.chat_sessions(tenant_id, session_key) ON DELETE CASCADE;
ALTER TABLE public.retrieval_runs
  ADD CONSTRAINT retrieval_runs_tenant_session_fkey
  FOREIGN KEY (tenant_id, session_id)
  REFERENCES public.chat_sessions(tenant_id, session_key) ON DELETE CASCADE;
ALTER TABLE public.handoff_consent_evidence
  ADD CONSTRAINT handoff_consent_evidence_tenant_session_fkey
  FOREIGN KEY (tenant_id, session_id)
  REFERENCES public.chat_sessions(tenant_id, session_key) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.kaxi_upsert_chat_session_from_message()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_session_key TEXT := nullif(trim(NEW.session_id), '');
  v_tenant_id TEXT := nullif(trim(NEW.tenant_id), '');
  v_locale TEXT := coalesce(nullif(trim(NEW.locale), ''), 'ko');
  v_source TEXT := public.kaxi_chat_session_source(NEW.source, NEW.session_id);
BEGIN
  IF v_session_key IS NULL OR v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id and session_id are required';
  END IF;

  INSERT INTO public.chat_sessions (
    id, session_key, tenant_id, locale, source, channel, status,
    started_at, last_message_at, metadata
  )
  VALUES (
    'chat_' || md5(v_tenant_id || ':' || v_session_key),
    v_session_key,
    v_tenant_id,
    v_locale,
    v_source,
    CASE WHEN v_source = 'typebot' THEN 'typebot' ELSE 'kaxi-site' END,
    'active',
    coalesce(NEW.created_at, now()),
    coalesce(NEW.created_at, now()),
    jsonb_build_object('created_from', 'chat_messages_trigger', 'last_message_id', NEW.id)
  )
  ON CONFLICT (tenant_id, session_key) DO UPDATE
  SET
    locale = EXCLUDED.locale,
    source = CASE
      WHEN public.chat_sessions.source = 'kaxi-site' AND EXCLUDED.source = 'n8n-typebot'
        THEN public.chat_sessions.source
      WHEN EXCLUDED.source <> 'n8n-typebot' THEN EXCLUDED.source
      ELSE public.chat_sessions.source
    END,
    status = 'active',
    last_message_at = greatest(public.chat_sessions.last_message_at, EXCLUDED.last_message_at),
    metadata = coalesce(public.chat_sessions.metadata, '{}'::jsonb)
      || jsonb_build_object('updated_from', 'chat_messages_trigger', 'last_message_id', NEW.id),
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP INDEX IF EXISTS public.chat_messages_idempotency_key_key;
CREATE UNIQUE INDEX chat_messages_tenant_idempotency_key
  ON public.chat_messages (tenant_id, idempotency_key);

DROP INDEX IF EXISTS public.outbox_events_event_idempotency_key;
CREATE UNIQUE INDEX outbox_events_tenant_event_idempotency_key
  ON public.outbox_events (tenant_id, event_type, idempotency_key);

DROP INDEX IF EXISTS public.n8n_audit_messages_execution_id_key;
DROP INDEX IF EXISTS public.n8n_audit_messages_request_id_key;
CREATE UNIQUE INDEX n8n_audit_messages_tenant_execution_key
  ON public.n8n_audit_messages (tenant_id, execution_id);
CREATE UNIQUE INDEX n8n_audit_messages_tenant_request_key
  ON public.n8n_audit_messages (tenant_id, request_id);
CREATE UNIQUE INDEX n8n_audit_messages_tenant_idempotency_key
  ON public.n8n_audit_messages (tenant_id, idempotency_key);

CREATE INDEX "Organization_tenant_id_idx" ON "Organization" ("tenant_id");
CREATE INDEX handoff_consent_evidence_tenant_idx ON public.handoff_consent_evidence (tenant_id);
CREATE INDEX retrieval_runs_tenant_created_idx ON public.retrieval_runs (tenant_id, created_at DESC);
CREATE INDEX chat_attachments_tenant_session_idx ON public.chat_attachments (tenant_id, session_id);
CREATE INDEX chat_attachment_jobs_tenant_status_idx ON public.chat_attachment_jobs (tenant_id, status);

CREATE OR REPLACE FUNCTION public.kaxi_current_tenant_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claim.tenant_id', true), ''),
    (
      SELECT organization.tenant_id
      FROM "User" app_user
      JOIN "Organization" organization ON organization.id = app_user."organizationId"
      WHERE app_user."authUserId" = public.kaxi_auth_uid()
      LIMIT 1
    ),
    CASE WHEN public.kaxi_is_platform_admin() THEN 'platform' END
  );
$$;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_attachment_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retrieval_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handoff_consent_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handoff_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n8n_audit_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handoff_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kaxi_tenant_self_read ON public.tenants;
CREATE POLICY kaxi_tenant_self_read ON public.tenants FOR SELECT
  USING (id = public.kaxi_current_tenant_id());

DROP POLICY IF EXISTS kaxi_organization_member_read ON "Organization";
CREATE POLICY kaxi_organization_member_read ON "Organization" FOR SELECT
  USING ("tenant_id" = public.kaxi_current_tenant_id());

DROP POLICY IF EXISTS kaxi_chat_sessions_tenant_scope ON public.chat_sessions;
CREATE POLICY kaxi_chat_sessions_tenant_scope ON public.chat_sessions FOR ALL
  USING (tenant_id = public.kaxi_current_tenant_id())
  WITH CHECK (tenant_id = public.kaxi_current_tenant_id());
DROP POLICY IF EXISTS kaxi_chat_messages_tenant_scope ON public.chat_messages;
CREATE POLICY kaxi_chat_messages_tenant_scope ON public.chat_messages FOR ALL
  USING (tenant_id = public.kaxi_current_tenant_id())
  WITH CHECK (tenant_id = public.kaxi_current_tenant_id());
DROP POLICY IF EXISTS kaxi_chat_attachments_tenant_scope ON public.chat_attachments;
CREATE POLICY kaxi_chat_attachments_tenant_scope ON public.chat_attachments FOR ALL
  USING (tenant_id = public.kaxi_current_tenant_id())
  WITH CHECK (tenant_id = public.kaxi_current_tenant_id());
DROP POLICY IF EXISTS kaxi_chat_attachment_jobs_tenant_scope ON public.chat_attachment_jobs;
CREATE POLICY kaxi_chat_attachment_jobs_tenant_scope ON public.chat_attachment_jobs FOR ALL
  USING (tenant_id = public.kaxi_current_tenant_id())
  WITH CHECK (tenant_id = public.kaxi_current_tenant_id());
DROP POLICY IF EXISTS kaxi_retrieval_runs_tenant_scope ON public.retrieval_runs;
CREATE POLICY kaxi_retrieval_runs_tenant_scope ON public.retrieval_runs FOR ALL
  USING (tenant_id = public.kaxi_current_tenant_id())
  WITH CHECK (tenant_id = public.kaxi_current_tenant_id());
DROP POLICY IF EXISTS kaxi_handoff_consent_tenant_scope ON public.handoff_consent_evidence;
CREATE POLICY kaxi_handoff_consent_tenant_scope ON public.handoff_consent_evidence FOR ALL
  USING (tenant_id = public.kaxi_current_tenant_id())
  WITH CHECK (tenant_id = public.kaxi_current_tenant_id());
DROP POLICY IF EXISTS kaxi_handoff_tasks_tenant_scope ON public.handoff_tasks;
CREATE POLICY kaxi_handoff_tasks_tenant_scope ON public.handoff_tasks FOR ALL
  USING (tenant_id = public.kaxi_current_tenant_id())
  WITH CHECK (tenant_id = public.kaxi_current_tenant_id());
DROP POLICY IF EXISTS kaxi_leads_tenant_scope ON public.leads;
CREATE POLICY kaxi_leads_tenant_scope ON public.leads FOR ALL
  USING (tenant_id = public.kaxi_current_tenant_id())
  WITH CHECK (tenant_id = public.kaxi_current_tenant_id());
DROP POLICY IF EXISTS kaxi_n8n_audit_tenant_scope ON public.n8n_audit_messages;
CREATE POLICY kaxi_n8n_audit_tenant_scope ON public.n8n_audit_messages FOR ALL
  USING (tenant_id = public.kaxi_current_tenant_id())
  WITH CHECK (tenant_id = public.kaxi_current_tenant_id());
DROP POLICY IF EXISTS kaxi_outbox_tenant_scope ON public.outbox_events;
CREATE POLICY kaxi_outbox_tenant_scope ON public.outbox_events FOR ALL
  USING (tenant_id = public.kaxi_current_tenant_id())
  WITH CHECK (tenant_id = public.kaxi_current_tenant_id());
DROP POLICY IF EXISTS kaxi_worker_jobs_tenant_scope ON public.worker_jobs;
CREATE POLICY kaxi_worker_jobs_tenant_scope ON public.worker_jobs FOR ALL
  USING (tenant_id = public.kaxi_current_tenant_id())
  WITH CHECK (tenant_id = public.kaxi_current_tenant_id());
DROP POLICY IF EXISTS kaxi_handoff_updates_tenant_scope ON public.handoff_updates;
CREATE POLICY kaxi_handoff_updates_tenant_scope ON public.handoff_updates FOR ALL
  USING (tenant_id = public.kaxi_current_tenant_id())
  WITH CHECK (tenant_id = public.kaxi_current_tenant_id());

COMMENT ON TABLE public.tenants IS
  'Tenant root aggregate for data isolation, retention policy and key rotation.';
COMMENT ON COLUMN public.worker_jobs.tenant_claim IS
  'HMAC-signed tenant execution claim. New jobs without a valid claim are rejected by the Worker.';

NOTIFY pgrst, 'reload schema';
