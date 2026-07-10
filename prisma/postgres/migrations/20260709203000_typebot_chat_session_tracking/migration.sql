-- Keep Typebot/n8n chat messages and chat_sessions in sync.
-- The KAXI site already creates sessions directly, but direct Typebot traffic
-- arrives through n8n and only writes chat_messages.

CREATE OR REPLACE FUNCTION public.kaxi_chat_session_source(
  message_source TEXT,
  session_key TEXT
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN nullif(trim(coalesce(message_source, '')), '') = 'kaxi-site'
      THEN 'kaxi-site'
    WHEN nullif(trim(coalesce(message_source, '')), '') = 'typebot'
      THEN 'typebot'
    WHEN nullif(trim(coalesce(message_source, '')), '') = 'n8n-typebot'
      AND trim(coalesce(session_key, '')) LIKE 'typebot-%'
      THEN 'typebot'
    WHEN nullif(trim(coalesce(message_source, '')), '') = 'n8n-typebot'
      THEN 'n8n-typebot'
    ELSE coalesce(nullif(trim(coalesce(message_source, '')), ''), 'n8n-typebot')
  END;
$$;

-- Normalize old direct Typebot result IDs before creating sessions for them.
UPDATE public.chat_messages
SET
  session_id = 'typebot-' || session_id,
  source = 'typebot'
WHERE source IN ('typebot', 'n8n-typebot')
  AND session_id !~ '^(typebot|kaxi-site|kaxi|n8n)-'
  AND session_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

UPDATE public.handoff_tasks
SET session_id = 'typebot-' || session_id
WHERE session_id !~ '^(typebot|kaxi-site|kaxi|n8n)-'
  AND session_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

CREATE OR REPLACE FUNCTION public.kaxi_upsert_chat_session_from_message()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_session_key TEXT := nullif(trim(NEW.session_id), '');
  v_tenant_id TEXT := coalesce(nullif(trim(NEW.tenant_id), ''), 'default');
  v_locale TEXT := coalesce(nullif(trim(NEW.locale), ''), 'ko');
  v_source TEXT := public.kaxi_chat_session_source(NEW.source, NEW.session_id);
BEGIN
  IF v_session_key IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.chat_sessions (
    id,
    session_key,
    tenant_id,
    locale,
    source,
    status,
    started_at,
    last_message_at,
    metadata
  )
  VALUES (
    'chat_' || md5(v_session_key),
    v_session_key,
    v_tenant_id,
    v_locale,
    v_source,
    'active',
    coalesce(NEW.created_at, now()),
    coalesce(NEW.created_at, now()),
    jsonb_build_object(
      'created_from', 'chat_messages_trigger',
      'last_message_id', NEW.id
    )
  )
  ON CONFLICT (session_key) DO UPDATE
  SET
    tenant_id = EXCLUDED.tenant_id,
    locale = EXCLUDED.locale,
    source = CASE
      WHEN public.chat_sessions.source = 'kaxi-site'
        AND EXCLUDED.source = 'n8n-typebot'
        THEN public.chat_sessions.source
      WHEN EXCLUDED.source <> 'n8n-typebot'
        THEN EXCLUDED.source
      ELSE public.chat_sessions.source
    END,
    status = 'active',
    last_message_at = greatest(public.chat_sessions.last_message_at, EXCLUDED.last_message_at),
    metadata = coalesce(public.chat_sessions.metadata, '{}'::jsonb)
      || jsonb_build_object(
        'updated_from', 'chat_messages_trigger',
        'last_message_id', NEW.id
      ),
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_messages_upsert_session ON public.chat_messages;
CREATE TRIGGER chat_messages_upsert_session
AFTER INSERT OR UPDATE OF session_id, tenant_id, locale, source ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.kaxi_upsert_chat_session_from_message();

WITH message_sessions AS (
  SELECT
    session_id AS session_key,
    coalesce(nullif(max(tenant_id), ''), 'default') AS tenant_id,
    coalesce(nullif(max(locale), ''), 'ko') AS locale,
    CASE
      WHEN bool_or(source = 'kaxi-site') THEN 'kaxi-site'
      WHEN bool_or(source = 'typebot') THEN 'typebot'
      WHEN bool_or(source = 'n8n-typebot' AND session_id LIKE 'typebot-%') THEN 'typebot'
      WHEN bool_or(source = 'n8n-typebot') THEN 'n8n-typebot'
      ELSE coalesce(nullif(max(source), ''), 'n8n-typebot')
    END AS source,
    min(created_at) AS started_at,
    max(created_at) AS last_message_at,
    count(*) AS message_count,
    max(id) AS last_message_id
  FROM public.chat_messages
  WHERE nullif(trim(session_id), '') IS NOT NULL
  GROUP BY session_id
)
INSERT INTO public.chat_sessions (
  id,
  session_key,
  tenant_id,
  locale,
  source,
  status,
  started_at,
  last_message_at,
  metadata
)
SELECT
  'chat_' || md5(session_key),
  session_key,
  tenant_id,
  locale,
  source,
  'active',
  started_at,
  last_message_at,
  jsonb_build_object(
    'created_from', 'chat_messages_backfill',
    'message_count', message_count,
    'last_message_id', last_message_id
  )
FROM message_sessions
ON CONFLICT (session_key) DO UPDATE
SET
  tenant_id = EXCLUDED.tenant_id,
  locale = EXCLUDED.locale,
  source = CASE
    WHEN public.chat_sessions.source = 'kaxi-site'
      AND EXCLUDED.source = 'n8n-typebot'
      THEN public.chat_sessions.source
    WHEN EXCLUDED.source <> 'n8n-typebot'
      THEN EXCLUDED.source
    ELSE public.chat_sessions.source
  END,
  started_at = least(public.chat_sessions.started_at, EXCLUDED.started_at),
  last_message_at = greatest(public.chat_sessions.last_message_at, EXCLUDED.last_message_at),
  metadata = coalesce(public.chat_sessions.metadata, '{}'::jsonb)
    || EXCLUDED.metadata
    || jsonb_build_object('updated_from', 'chat_messages_backfill'),
  updated_at = now();

COMMENT ON FUNCTION public.kaxi_upsert_chat_session_from_message() IS
  'Creates or updates chat_sessions whenever n8n/Typebot writes chat_messages.';
