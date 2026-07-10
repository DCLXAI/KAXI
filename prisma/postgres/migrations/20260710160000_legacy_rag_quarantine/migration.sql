-- Preserve the deprecated n8n vector store for audit/recovery. Keep the live
-- rows until the governed serving projection is fully ready; the next
-- migration installs an explicit, readiness-gated cutover function.

CREATE TABLE IF NOT EXISTS public.legacy_rag_chunks_quarantine (
  original_id BIGINT PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding vector(1536),
  original_created_at TIMESTAMPTZ,
  original_updated_at TIMESTAMPTZ,
  quarantined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  quarantine_reason TEXT NOT NULL DEFAULT 'superseded_by_governed_rag_serving_projection'
);

INSERT INTO public.legacy_rag_chunks_quarantine (
  original_id,
  content,
  metadata,
  embedding,
  original_created_at,
  original_updated_at
)
SELECT
  id,
  content,
  metadata,
  embedding,
  created_at,
  updated_at
FROM public.knowledge_chunks
ON CONFLICT (original_id) DO NOTHING;

-- Internal KAXI guidance remains an internal source, but citations must resolve
-- to a public, human-readable review page instead of an internal:// URI.
UPDATE "KnowledgeDocument"
SET "sourceUrl" = 'https://kaxi.vercel.app/sources/cost-analysis'
WHERE "docId" = 'cost-breakdown'
  AND "sourceUrl" = 'internal://kaxi/cost-analysis';

UPDATE "KnowledgeDocument"
SET "sourceUrl" = 'https://kaxi.vercel.app/sources/safety-guideline'
WHERE "docId" IN ('visa-guarantee-warning', 'broker-redflags')
  AND "sourceUrl" = 'internal://kaxi/safety-guideline';

ALTER TABLE public.legacy_rag_chunks_quarantine ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.legacy_rag_chunks_quarantine FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public.legacy_rag_chunks_quarantine FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.legacy_rag_chunks_quarantine FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.legacy_rag_chunks_quarantine TO service_role;
  END IF;
END
$$;

COMMENT ON TABLE public.legacy_rag_chunks_quarantine IS
  'Audit-only quarantine of the deprecated public.knowledge_chunks store. Never use for retrieval.';

NOTIFY pgrst, 'reload schema';
