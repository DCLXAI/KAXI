-- Split n8n runtime audit logs from canonical user chat messages.
--
-- Canonical model:
-- - public.chat_messages: one user-visible conversation exchange.
-- - public.n8n_audit_messages: n8n runtime/logging trail for webhook executions.

CREATE TABLE IF NOT EXISTS public.n8n_audit_messages (
  id BIGSERIAL PRIMARY KEY,
  execution_id TEXT,
  workflow_id TEXT,
  source_chat_message_id BIGINT,
  session_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  locale TEXT NOT NULL DEFAULT 'ko',
  source TEXT NOT NULL DEFAULT 'typebot',
  channel TEXT NOT NULL DEFAULT 'typebot',
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'low',
  needs_human BOOLEAN NOT NULL DEFAULT false,
  lead_stage TEXT,
  next_step TEXT,
  sources_json TEXT NOT NULL DEFAULT '[]',
  audit_source TEXT NOT NULL DEFAULT 'n8n-runtime',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS n8n_audit_messages_execution_id_key
  ON public.n8n_audit_messages (execution_id)
  WHERE execution_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS n8n_audit_messages_source_chat_message_id_key
  ON public.n8n_audit_messages (source_chat_message_id)
  WHERE source_chat_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS n8n_audit_messages_session_idx
  ON public.n8n_audit_messages (session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS n8n_audit_messages_tenant_created_idx
  ON public.n8n_audit_messages (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS n8n_audit_messages_source_idx
  ON public.n8n_audit_messages (source);

CREATE INDEX IF NOT EXISTS n8n_audit_messages_channel_idx
  ON public.n8n_audit_messages (channel);

CREATE INDEX IF NOT EXISTS n8n_audit_messages_risk_idx
  ON public.n8n_audit_messages (risk_level, needs_human);

DROP TRIGGER IF EXISTS n8n_audit_messages_touch_updated_at ON public.n8n_audit_messages;
CREATE TRIGGER n8n_audit_messages_touch_updated_at
BEFORE UPDATE ON public.n8n_audit_messages
FOR EACH ROW
EXECUTE FUNCTION public.kaxi_touch_updated_at();

-- Backfill likely n8n-written historical rows into the audit table. App-written
-- canonical rows have n8n_request populated and stay out of the audit backfill.
INSERT INTO public.n8n_audit_messages (
  source_chat_message_id,
  session_id,
  tenant_id,
  locale,
  source,
  channel,
  question,
  answer,
  risk_level,
  needs_human,
  lead_stage,
  next_step,
  sources_json,
  audit_source,
  created_at,
  updated_at
)
SELECT
  cm.id,
  cm.session_id,
  cm.tenant_id,
  coalesce(nullif(cm.locale, ''), 'ko'),
  coalesce(nullif(cm.source, ''), 'n8n-typebot'),
  CASE
    WHEN coalesce(nullif(cm.source, ''), 'n8n-typebot') = 'kaxi-site' THEN 'kaxi-site'
    ELSE 'typebot'
  END,
  cm.question,
  cm.answer,
  cm.risk_level,
  cm.needs_human,
  cm.lead_stage,
  cm.next_step,
  cm.sources_json,
  'chat_messages_backfill',
  cm.created_at,
  now()
FROM public.chat_messages cm
WHERE cm.n8n_request IS NULL
ON CONFLICT (source_chat_message_id) WHERE source_chat_message_id IS NOT NULL DO NOTHING;

-- Remove only confirmed KAXI website duplicates from the canonical table.
-- The app row is identified by n8n_request IS NOT NULL; the n8n duplicate has
-- the same visible exchange and was written near the app row.
WITH duplicate_kaxi_n8n_rows AS (
  SELECT n8n_row.id
  FROM public.chat_messages n8n_row
  WHERE n8n_row.source = 'kaxi-site'
    AND n8n_row.n8n_request IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.chat_messages app_row
      WHERE app_row.id <> n8n_row.id
        AND app_row.session_id = n8n_row.session_id
        AND app_row.source = 'kaxi-site'
        AND app_row.n8n_request IS NOT NULL
        AND app_row.question = n8n_row.question
        AND app_row.answer = n8n_row.answer
        AND abs(extract(epoch FROM (app_row.created_at - n8n_row.created_at))) <= 120
    )
)
DELETE FROM public.chat_messages cm
USING duplicate_kaxi_n8n_rows d
WHERE cm.id = d.id;

-- Recalculate session windows from the remaining canonical messages.
WITH bounds AS (
  SELECT
    session_id,
    min(created_at) AS started_at,
    max(created_at) AS last_message_at,
    count(*) AS message_count,
    max(id) AS last_message_id
  FROM public.chat_messages
  GROUP BY session_id
)
UPDATE public.chat_sessions cs
SET
  started_at = bounds.started_at,
  last_message_at = bounds.last_message_at,
  metadata = coalesce(cs.metadata, '{}'::jsonb)
    || jsonb_build_object(
      'canonical_message_count', bounds.message_count,
      'last_canonical_message_id', bounds.last_message_id,
      'deduped_at', now()
    ),
  updated_at = now()
FROM bounds
WHERE cs.session_key = bounds.session_id;

COMMENT ON TABLE public.chat_messages IS
  'Canonical KAXI/Typebot user-visible chat exchanges. n8n runtime audit rows live in public.n8n_audit_messages.';

COMMENT ON TABLE public.n8n_audit_messages IS
  'n8n RAG runtime audit trail for Typebot/KAXI webhook executions. Not the canonical conversation log.';

NOTIFY pgrst, 'reload schema';
