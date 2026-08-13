CREATE TABLE public.chat_attachment_promotions (
  attachment_id TEXT PRIMARY KEY REFERENCES public.chat_attachments(id) ON DELETE CASCADE,
  source_key TEXT NOT NULL,
  destination_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'promotion_planned',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  object_moved_at TIMESTAMPTZ,
  pointer_committed_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chat_attachment_promotions_status_check CHECK (
    status IN (
      'promotion_planned',
      'object_moved',
      'pointer_committed',
      'ready',
      'reconciliation_failed'
    )
  ),
  CONSTRAINT chat_attachment_promotions_attempts_check CHECK (attempts >= 0)
);

CREATE INDEX chat_attachment_promotions_status_updated_idx
  ON public.chat_attachment_promotions(status, updated_at);

CREATE TRIGGER chat_attachment_promotions_touch_updated_at
BEFORE UPDATE ON public.chat_attachment_promotions
FOR EACH ROW EXECUTE FUNCTION public.kaxi_touch_updated_at();

ALTER TABLE public.chat_attachment_promotions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.chat_attachment_promotions FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public.chat_attachment_promotions FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.chat_attachment_promotions FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.chat_attachment_promotions TO service_role;
  END IF;
END
$$;

COMMENT ON TABLE public.chat_attachment_promotions IS
  'Recoverable storage-promotion saga bridging non-transactional object moves and the canonical attachment pointer.';

NOTIFY pgrst, 'reload schema';
