ALTER TABLE public.chat_attachments
  ADD COLUMN IF NOT EXISTS detected_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS processing_status TEXT NOT NULL DEFAULT 'quarantined',
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.chat_attachments ALTER COLUMN status SET DEFAULT 'quarantined';
UPDATE public.chat_attachments
SET status = 'quarantined', processing_status = 'quarantined'
WHERE status = 'uploaded';

CREATE INDEX IF NOT EXISTS chat_attachments_processing_status_idx
  ON public.chat_attachments(processing_status, created_at);
CREATE INDEX IF NOT EXISTS chat_attachments_retention_until_idx
  ON public.chat_attachments(retention_until) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.chat_attachment_extractions (
  attachment_id TEXT PRIMARY KEY REFERENCES public.chat_attachments(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  text_ciphertext TEXT,
  text_sha256 TEXT,
  redacted_preview TEXT,
  document_type TEXT,
  language TEXT,
  confidence DOUBLE PRECISION,
  page_count INTEGER,
  provider TEXT,
  model TEXT,
  error_code TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chat_attachment_extractions_confidence_check
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1))
);

DROP TRIGGER IF EXISTS chat_attachment_extractions_touch_updated_at ON public.chat_attachment_extractions;
CREATE TRIGGER chat_attachment_extractions_touch_updated_at
BEFORE UPDATE ON public.chat_attachment_extractions
FOR EACH ROW EXECUTE FUNCTION public.kaxi_touch_updated_at();

ALTER TABLE public.chat_attachment_extractions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.chat_attachment_extractions FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public.chat_attachment_extractions FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.chat_attachment_extractions FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.chat_attachment_extractions TO service_role;
  END IF;
END
$$;

COMMENT ON TABLE public.chat_attachment_extractions IS
  'Encrypted OCR/PDF extraction results for quarantined chat attachments; server-only.';
