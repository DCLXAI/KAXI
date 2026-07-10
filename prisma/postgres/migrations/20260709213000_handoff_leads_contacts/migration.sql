-- Complete the Typebot/n8n human handoff loop.
--
-- Canonical flow:
-- Typebot lead form -> n8n handoff update webhook -> handoff_updates insert
-- -> trigger creates/updates leads + lead_contacts and marks handoff_tasks.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.leads (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  locale TEXT NOT NULL DEFAULT 'ko',
  source TEXT NOT NULL DEFAULT 'typebot',
  status TEXT NOT NULL DEFAULT 'contact_received',
  lead_stage TEXT NOT NULL DEFAULT 'review',
  risk_level TEXT NOT NULL DEFAULT 'medium',
  name TEXT,
  question TEXT,
  answer TEXT,
  notes TEXT,
  last_handoff_task_id BIGINT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_tenant_status_idx
  ON public.leads (tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS leads_session_idx
  ON public.leads (session_id);

CREATE INDEX IF NOT EXISTS leads_source_idx
  ON public.leads (source);

CREATE INDEX IF NOT EXISTS leads_stage_risk_idx
  ON public.leads (lead_stage, risk_level);

DROP TRIGGER IF EXISTS leads_touch_updated_at ON public.leads;
CREATE TRIGGER leads_touch_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.kaxi_touch_updated_at();

CREATE TABLE IF NOT EXISTS public.lead_contacts (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  name TEXT,
  contact_type TEXT NOT NULL DEFAULT 'unknown',
  contact_value TEXT NOT NULL,
  contact_hash TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'received',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lead_contacts_lead_id_fkey
    FOREIGN KEY (lead_id)
    REFERENCES public.leads(id)
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS lead_contacts_lead_hash_key
  ON public.lead_contacts (lead_id, contact_hash);

CREATE INDEX IF NOT EXISTS lead_contacts_session_idx
  ON public.lead_contacts (session_id);

CREATE INDEX IF NOT EXISTS lead_contacts_contact_hash_idx
  ON public.lead_contacts (contact_hash);

CREATE INDEX IF NOT EXISTS lead_contacts_status_idx
  ON public.lead_contacts (status);

DROP TRIGGER IF EXISTS lead_contacts_touch_updated_at ON public.lead_contacts;
CREATE TRIGGER lead_contacts_touch_updated_at
BEFORE UPDATE ON public.lead_contacts
FOR EACH ROW
EXECUTE FUNCTION public.kaxi_touch_updated_at();

ALTER TABLE public.handoff_tasks
  ADD COLUMN IF NOT EXISTS lead_id TEXT,
  ADD COLUMN IF NOT EXISTS lead_contact_id TEXT,
  ADD COLUMN IF NOT EXISTS contact_received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_handoff_update_id BIGINT,
  ADD COLUMN IF NOT EXISTS handoff_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS handoff_tasks_lead_id_idx
  ON public.handoff_tasks (lead_id);

CREATE INDEX IF NOT EXISTS handoff_tasks_contact_received_idx
  ON public.handoff_tasks (contact_received_at);

CREATE TABLE IF NOT EXISTS public.handoff_updates (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  locale TEXT NOT NULL DEFAULT 'ko',
  source TEXT NOT NULL DEFAULT 'typebot',
  lead_name TEXT,
  lead_contact TEXT,
  lead_contact_type TEXT,
  lead_note TEXT,
  question TEXT,
  answer TEXT,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  lead_stage TEXT NOT NULL DEFAULT 'review',
  lead_id TEXT,
  lead_contact_id TEXT,
  handoff_task_id BIGINT,
  update_status TEXT NOT NULL DEFAULT 'received',
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS handoff_updates_session_idx
  ON public.handoff_updates (session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS handoff_updates_lead_id_idx
  ON public.handoff_updates (lead_id);

CREATE INDEX IF NOT EXISTS handoff_updates_task_id_idx
  ON public.handoff_updates (handoff_task_id);

CREATE INDEX IF NOT EXISTS handoff_updates_status_idx
  ON public.handoff_updates (update_status);

DROP TRIGGER IF EXISTS handoff_updates_touch_updated_at ON public.handoff_updates;
CREATE TRIGGER handoff_updates_touch_updated_at
BEFORE UPDATE ON public.handoff_updates
FOR EACH ROW
EXECUTE FUNCTION public.kaxi_touch_updated_at();

CREATE OR REPLACE FUNCTION public.kaxi_infer_contact_type(contact_value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN nullif(trim(coalesce(contact_value, '')), '') IS NULL THEN 'unknown'
    WHEN trim(contact_value) ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN 'email'
    WHEN regexp_replace(trim(contact_value), '[^0-9+]', '', 'g') ~ '^\+?[0-9]{7,15}$' THEN 'phone'
    WHEN trim(contact_value) ~* 'kakao|카카오' THEN 'kakao'
    WHEN trim(contact_value) ~* 'telegram|텔레그램' THEN 'telegram'
    ELSE 'unknown'
  END;
$$;

CREATE OR REPLACE FUNCTION public.kaxi_apply_handoff_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_session_id TEXT := nullif(trim(NEW.session_id), '');
  v_tenant_id TEXT := coalesce(nullif(trim(NEW.tenant_id), ''), 'default');
  v_locale TEXT := coalesce(nullif(trim(NEW.locale), ''), 'ko');
  v_source TEXT := coalesce(nullif(trim(NEW.source), ''), 'typebot');
  v_name TEXT := nullif(trim(coalesce(NEW.lead_name, '')), '');
  v_contact TEXT := nullif(trim(coalesce(NEW.lead_contact, '')), '');
  v_contact_type TEXT := coalesce(nullif(trim(NEW.lead_contact_type), ''), public.kaxi_infer_contact_type(NEW.lead_contact));
  v_note TEXT := nullif(trim(coalesce(NEW.lead_note, '')), '');
  v_question TEXT := nullif(trim(coalesce(NEW.question, '')), '');
  v_answer TEXT := nullif(trim(coalesce(NEW.answer, '')), '');
  v_risk_level TEXT := coalesce(nullif(trim(NEW.risk_level), ''), 'medium');
  v_lead_stage TEXT := coalesce(nullif(trim(NEW.lead_stage), ''), 'review');
  v_task public.handoff_tasks%ROWTYPE;
  v_lead_id TEXT;
  v_contact_id TEXT;
  v_contact_hash TEXT;
BEGIN
  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'session_id is required';
  END IF;

  SELECT *
  INTO v_task
  FROM public.handoff_tasks
  WHERE session_id = v_session_id
    AND status IN ('open', 'review', 'contact_requested', 'contact_received')
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.handoff_tasks (
      session_id,
      tenant_id,
      question,
      answer,
      risk_level,
      lead_stage,
      status,
      notes
    )
    VALUES (
      v_session_id,
      v_tenant_id,
      coalesce(v_question, 'Typebot handoff contact received'),
      coalesce(v_answer, ''),
      v_risk_level,
      v_lead_stage,
      'contact_received',
      v_note
    )
    RETURNING * INTO v_task;
  END IF;

  v_lead_id := 'lead_' || md5(v_session_id);

  INSERT INTO public.leads (
    id,
    session_id,
    tenant_id,
    locale,
    source,
    status,
    lead_stage,
    risk_level,
    name,
    question,
    answer,
    notes,
    last_handoff_task_id,
    metadata
  )
  VALUES (
    v_lead_id,
    v_session_id,
    v_tenant_id,
    v_locale,
    v_source,
    'contact_received',
    v_lead_stage,
    v_risk_level,
    v_name,
    coalesce(v_question, v_task.question),
    coalesce(v_answer, v_task.answer),
    v_note,
    v_task.id,
    jsonb_build_object(
      'created_from', 'handoff_updates_trigger',
      'last_handoff_update_id', NEW.id
    )
  )
  ON CONFLICT (session_id) DO UPDATE
  SET
    tenant_id = EXCLUDED.tenant_id,
    locale = EXCLUDED.locale,
    source = EXCLUDED.source,
    status = 'contact_received',
    lead_stage = EXCLUDED.lead_stage,
    risk_level = EXCLUDED.risk_level,
    name = coalesce(EXCLUDED.name, public.leads.name),
    question = coalesce(EXCLUDED.question, public.leads.question),
    answer = coalesce(EXCLUDED.answer, public.leads.answer),
    notes = coalesce(EXCLUDED.notes, public.leads.notes),
    last_handoff_task_id = EXCLUDED.last_handoff_task_id,
    metadata = coalesce(public.leads.metadata, '{}'::jsonb)
      || jsonb_build_object(
        'updated_from', 'handoff_updates_trigger',
        'last_handoff_update_id', NEW.id
      ),
    updated_at = now()
  RETURNING id INTO v_lead_id;

  IF v_contact IS NOT NULL THEN
    v_contact_hash := encode(digest(lower(v_contact), 'sha256'), 'hex');
    v_contact_id := 'lead_contact_' || md5(v_lead_id || ':' || v_contact_hash);

    INSERT INTO public.lead_contacts (
      id,
      lead_id,
      session_id,
      name,
      contact_type,
      contact_value,
      contact_hash,
      is_primary,
      status,
      metadata
    )
    VALUES (
      v_contact_id,
      v_lead_id,
      v_session_id,
      v_name,
      v_contact_type,
      v_contact,
      v_contact_hash,
      true,
      'received',
      jsonb_build_object(
        'created_from', 'handoff_updates_trigger',
        'last_handoff_update_id', NEW.id
      )
    )
    ON CONFLICT (lead_id, contact_hash) DO UPDATE
    SET
      name = coalesce(EXCLUDED.name, public.lead_contacts.name),
      contact_type = EXCLUDED.contact_type,
      contact_value = EXCLUDED.contact_value,
      is_primary = true,
      status = 'received',
      metadata = coalesce(public.lead_contacts.metadata, '{}'::jsonb)
        || jsonb_build_object(
          'updated_from', 'handoff_updates_trigger',
          'last_handoff_update_id', NEW.id
        ),
      updated_at = now()
    RETURNING id INTO v_contact_id;
  END IF;

  UPDATE public.handoff_tasks
  SET
    lead_id = v_lead_id,
    lead_contact_id = v_contact_id,
    status = 'contact_received',
    notes = coalesce(v_note, notes),
    contact_received_at = now(),
    last_handoff_update_id = NEW.id,
    handoff_metadata = coalesce(handoff_metadata, '{}'::jsonb)
      || jsonb_build_object(
        'leadName', v_name,
        'contactType', v_contact_type,
        'hasContact', v_contact IS NOT NULL,
        'updatedFrom', 'handoff_updates_trigger'
      ),
    updated_at = now()
  WHERE id = v_task.id;

  NEW.lead_id := v_lead_id;
  NEW.lead_contact_id := v_contact_id;
  NEW.handoff_task_id := v_task.id;
  NEW.update_status := 'applied';
  NEW.response_payload := jsonb_build_object(
    'ok', true,
    'leadId', v_lead_id,
    'leadContactId', v_contact_id,
    'handoffTaskId', v_task.id,
    'status', 'contact_received'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handoff_updates_apply ON public.handoff_updates;
CREATE TRIGGER handoff_updates_apply
BEFORE INSERT ON public.handoff_updates
FOR EACH ROW
EXECUTE FUNCTION public.kaxi_apply_handoff_update();

COMMENT ON TABLE public.leads IS
  'RAG/Typebot consultation leads created from human-handoff contact collection.';

COMMENT ON TABLE public.lead_contacts IS
  'Contact details supplied during Typebot/KAXI human handoff.';

COMMENT ON TABLE public.handoff_updates IS
  'n8n webhook inbox for Typebot handoff contact updates. Insert trigger updates leads, lead_contacts, and handoff_tasks.';

NOTIFY pgrst, 'reload schema';
