CREATE OR REPLACE FUNCTION public.kaxi_finalize_legacy_rag_cutover(
  expected_ready_count integer DEFAULT 201
)
RETURNS TABLE (ready_count bigint, quarantined_legacy_count bigint, removed_legacy_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ready_count bigint;
  v_citation_ready_count bigint;
  v_removed_count bigint;
BEGIN
  SELECT count(*)
  INTO v_ready_count
  FROM public.rag_serving_chunks serving
  JOIN public."KnowledgeChunk" chunk
    ON chunk.id = serving.canonical_chunk_id
    AND chunk."contentHash" = serving.content_hash
  JOIN public."KnowledgeDocument" document
    ON document.id = serving.canonical_document_id
    AND document.id = chunk."documentId"
    AND document."docId" = serving.doc_id
  WHERE serving.status = 'ready'
    AND serving.embedding IS NOT NULL
    AND serving.embedding_model = 'text-embedding-3-small'
    AND document."reviewStatus" = 'APPROVED'::public."LegalReviewStatus"
    AND document."supersededBy" IS NULL
    AND document."validFrom" <= now()
    AND (document."validTo" IS NULL OR document."validTo" > now())
    AND document."lastCheckedAt" >= now() - interval '180 days';

  SELECT count(*)
  INTO v_citation_ready_count
  FROM public."KnowledgeChunk" chunk
  JOIN public."KnowledgeDocument" document ON document.id = chunk."documentId"
  WHERE document."reviewStatus" = 'APPROVED'::public."LegalReviewStatus"
    AND document."supersededBy" IS NULL
    AND document."validFrom" <= now()
    AND (document."validTo" IS NULL OR document."validTo" > now())
    AND document."lastCheckedAt" >= now() - interval '180 days'
    AND document."sourceUrl" ~ '^https://'
    AND nullif(trim(document."checkedBy"), '') IS NOT NULL;

  IF v_ready_count < expected_ready_count THEN
    RAISE EXCEPTION 'RAG cutover blocked: ready % is below expected %', v_ready_count, expected_ready_count;
  END IF;
  IF v_citation_ready_count < expected_ready_count THEN
    RAISE EXCEPTION 'RAG cutover blocked: citation-ready % is below expected %', v_citation_ready_count, expected_ready_count;
  END IF;

  INSERT INTO public.legacy_rag_chunks_quarantine (
    original_id,
    content,
    metadata,
    embedding,
    original_created_at,
    original_updated_at
  )
  SELECT id, content, metadata, embedding, created_at, updated_at
  FROM public.knowledge_chunks
  ON CONFLICT (original_id) DO UPDATE
  SET
    content = excluded.content,
    metadata = excluded.metadata,
    embedding = excluded.embedding,
    original_created_at = excluded.original_created_at,
    original_updated_at = excluded.original_updated_at,
    quarantined_at = now();

  DELETE FROM public.knowledge_chunks legacy
  USING public.legacy_rag_chunks_quarantine quarantine
  WHERE quarantine.original_id = legacy.id;
  GET DIAGNOSTICS v_removed_count = ROW_COUNT;

  RETURN QUERY
  SELECT
    v_ready_count,
    (SELECT count(*) FROM public.legacy_rag_chunks_quarantine),
    v_removed_count;
END;
$$;

REVOKE ALL ON FUNCTION public.kaxi_finalize_legacy_rag_cutover(integer) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.kaxi_finalize_legacy_rag_cutover(integer) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION public.kaxi_finalize_legacy_rag_cutover(integer) FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.kaxi_finalize_legacy_rag_cutover(integer) TO service_role;
  END IF;
END
$$;

COMMENT ON FUNCTION public.kaxi_finalize_legacy_rag_cutover(integer) IS
  'Quarantines and removes deprecated knowledge_chunks only after governed embeddings and citations reach the expected count.';

NOTIFY pgrst, 'reload schema';
