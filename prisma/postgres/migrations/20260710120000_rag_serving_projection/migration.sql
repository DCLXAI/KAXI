-- 1536d OpenAI serving projection derived only from governed KnowledgeChunk rows.
-- The canonical 384d corpus remains the source of truth; this table is disposable.

CREATE TABLE IF NOT EXISTS public.rag_serving_chunks (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding vector(1536),
  canonical_chunk_id TEXT GENERATED ALWAYS AS (nullif(metadata->>'canonical_chunk_id', '')) STORED,
  canonical_document_id TEXT GENERATED ALWAYS AS (nullif(metadata->>'canonical_document_id', '')) STORED,
  doc_id TEXT GENERATED ALWAYS AS (nullif(metadata->>'doc_id', '')) STORED,
  content_hash TEXT GENERATED ALWAYS AS (nullif(metadata->>'content_hash', '')) STORED,
  embedding_model TEXT GENERATED ALWAYS AS (coalesce(nullif(metadata->>'embedding_model', ''), 'text-embedding-3-small')) STORED,
  tenant_id TEXT GENERATED ALWAYS AS (coalesce(nullif(metadata->>'tenant_id', ''), 'default')) STORED,
  category TEXT GENERATED ALWAYS AS (coalesce(nullif(metadata->>'category', ''), 'general')) STORED,
  status TEXT NOT NULL DEFAULT 'ready',
  indexed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  quarantined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rag_serving_chunks_metadata_identity_check CHECK (
    canonical_chunk_id IS NOT NULL
    AND canonical_document_id IS NOT NULL
    AND doc_id IS NOT NULL
    AND content_hash IS NOT NULL
  ),
  CONSTRAINT rag_serving_chunks_chunk_fkey
    FOREIGN KEY (canonical_chunk_id) REFERENCES "KnowledgeChunk"(id) ON DELETE CASCADE,
  CONSTRAINT rag_serving_chunks_document_fkey
    FOREIGN KEY (canonical_document_id) REFERENCES "KnowledgeDocument"(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS rag_serving_chunks_identity_key
  ON public.rag_serving_chunks (canonical_chunk_id, content_hash, embedding_model);

CREATE INDEX IF NOT EXISTS rag_serving_chunks_embedding_hnsw
  ON public.rag_serving_chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS rag_serving_chunks_metadata_gin
  ON public.rag_serving_chunks USING gin (metadata jsonb_path_ops);

CREATE INDEX IF NOT EXISTS rag_serving_chunks_tenant_category_idx
  ON public.rag_serving_chunks (tenant_id, category, status);

ALTER TABLE public.rag_serving_chunks
  ADD COLUMN IF NOT EXISTS search_tsv tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(metadata->>'title', '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(metadata->>'keywords', '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(metadata->>'doc_id', '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(metadata->>'category', '')), 'B') ||
    setweight(to_tsvector('simple', content), 'D')
  ) STORED;

CREATE INDEX IF NOT EXISTS rag_serving_chunks_search_tsv_gin
  ON public.rag_serving_chunks USING gin (search_tsv);

DROP TRIGGER IF EXISTS rag_serving_chunks_touch_updated_at ON public.rag_serving_chunks;
CREATE TRIGGER rag_serving_chunks_touch_updated_at
BEFORE UPDATE ON public.rag_serving_chunks
FOR EACH ROW
EXECUTE FUNCTION public.kaxi_touch_updated_at();

CREATE OR REPLACE FUNCTION public.kaxi_refresh_rag_serving_status()
RETURNS TABLE (ready_count bigint, quarantined_count bigint)
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.rag_serving_chunks serving
  SET status = 'quarantined', quarantined_at = coalesce(serving.quarantined_at, now())
  WHERE NOT EXISTS (
    SELECT 1
    FROM "KnowledgeChunk" chunk
    JOIN "KnowledgeDocument" document ON document.id = chunk."documentId"
    WHERE chunk.id = serving.canonical_chunk_id
      AND document.id = serving.canonical_document_id
      AND document."docId" = serving.doc_id
      AND chunk."contentHash" = serving.content_hash
      AND document."reviewStatus" = 'APPROVED'::"LegalReviewStatus"
      AND document."supersededBy" IS NULL
      AND document."validFrom" <= now()
      AND (document."validTo" IS NULL OR document."validTo" > now())
      AND document."lastCheckedAt" >= now() - interval '180 days'
  );

  UPDATE public.rag_serving_chunks serving
  SET status = 'ready', quarantined_at = NULL
  WHERE EXISTS (
    SELECT 1
    FROM "KnowledgeChunk" chunk
    JOIN "KnowledgeDocument" document ON document.id = chunk."documentId"
    WHERE chunk.id = serving.canonical_chunk_id
      AND document.id = serving.canonical_document_id
      AND document."docId" = serving.doc_id
      AND chunk."contentHash" = serving.content_hash
      AND document."reviewStatus" = 'APPROVED'::"LegalReviewStatus"
      AND document."supersededBy" IS NULL
      AND document."validFrom" <= now()
      AND (document."validTo" IS NULL OR document."validTo" > now())
      AND document."lastCheckedAt" >= now() - interval '180 days'
  );

  RETURN QUERY
  SELECT
    count(*) FILTER (WHERE status = 'ready'),
    count(*) FILTER (WHERE status = 'quarantined')
  FROM public.rag_serving_chunks;
END;
$$;

CREATE OR REPLACE FUNCTION public.match_rag_documents(
  query_embedding vector(1536),
  match_count integer DEFAULT 6,
  filter jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity double precision
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_filter JSONB := coalesce(filter, '{}'::jsonb);
  v_metadata_filter JSONB := coalesce(filter, '{}'::jsonb)
    - 'query_text' - 'similarity_threshold' - 'vector_candidate_count'
    - 'keyword_candidate_count' - 'category' - 'category_mode' - 'tenant_id';
  v_query_text TEXT := nullif(trim(coalesce(filter->>'query_text', '')), '');
  v_category TEXT := lower(nullif(trim(coalesce(filter->>'category', '')), ''));
  v_tenant_id TEXT := coalesce(nullif(trim(coalesce(filter->>'tenant_id', '')), ''), 'default');
  v_similarity_threshold DOUBLE PRECISION := 0.72;
  v_match_count INTEGER := greatest(coalesce(match_count, 6), 0);
  v_vector_candidate_count INTEGER := greatest(coalesce(match_count, 6) * 6, 36);
  v_keyword_candidate_count INTEGER := greatest(coalesce(match_count, 6) * 6, 36);
BEGIN
  IF v_category IN ('', 'all', 'undefined', 'null', '{{category}}') THEN
    v_category := NULL;
  END IF;

  v_similarity_threshold := CASE v_category
    WHEN 'documents' THEN 0.68
    WHEN 'school' THEN 0.70
    WHEN 'cost' THEN 0.70
    WHEN 'visa' THEN 0.72
    ELSE 0.72
  END;

  IF coalesce(v_filter->>'similarity_threshold', '') ~ '^[0-9]+(\.[0-9]+)?$' THEN
    v_similarity_threshold := least(greatest((v_filter->>'similarity_threshold')::DOUBLE PRECISION, 0), 1);
  END IF;
  IF coalesce(v_filter->>'vector_candidate_count', '') ~ '^[0-9]+$' THEN
    v_vector_candidate_count := greatest((v_filter->>'vector_candidate_count')::INTEGER, v_match_count);
  END IF;
  IF coalesce(v_filter->>'keyword_candidate_count', '') ~ '^[0-9]+$' THEN
    v_keyword_candidate_count := greatest((v_filter->>'keyword_candidate_count')::INTEGER, v_match_count);
  END IF;

  RETURN QUERY
  WITH q AS (
    SELECT public.kaxi_or_prefix_tsquery(v_query_text) AS tsq
  ),
  eligible AS (
    SELECT
      serving.*,
      document.title AS canonical_title,
      document."sourceUrl" AS canonical_source_url,
      document."sourceType" AS canonical_source_type,
      document.language AS canonical_language,
      document.topic AS canonical_topic,
      document."lastCheckedAt" AS canonical_checked_at,
      document."checkedBy" AS canonical_checked_by
    FROM public.rag_serving_chunks serving
    JOIN "KnowledgeChunk" chunk
      ON chunk.id = serving.canonical_chunk_id
      AND chunk."contentHash" = serving.content_hash
    JOIN "KnowledgeDocument" document
      ON document.id = serving.canonical_document_id
      AND document.id = chunk."documentId"
      AND document."docId" = serving.doc_id
    WHERE serving.embedding IS NOT NULL
      AND serving.status = 'ready'
      AND serving.tenant_id = v_tenant_id
      AND serving.metadata @> v_metadata_filter
      AND document."reviewStatus" = 'APPROVED'::"LegalReviewStatus"
      AND document."supersededBy" IS NULL
      AND document."validFrom" <= now()
      AND (document."validTo" IS NULL OR document."validTo" > now())
      AND document."lastCheckedAt" >= now() - interval '180 days'
  ),
  vec AS (
    SELECT
      eligible.id,
      row_number() OVER (ORDER BY eligible.embedding <=> query_embedding) AS vector_rank,
      1 - (eligible.embedding <=> query_embedding) AS vector_score
    FROM eligible
    WHERE 1 - (eligible.embedding <=> query_embedding) >= v_similarity_threshold
    ORDER BY eligible.embedding <=> query_embedding
    LIMIT v_vector_candidate_count
  ),
  kw_raw AS (
    SELECT
      eligible.id,
      row_number() OVER (ORDER BY ts_rank_cd(eligible.search_tsv, q.tsq) DESC) AS keyword_rank,
      ts_rank_cd(eligible.search_tsv, q.tsq) AS keyword_score
    FROM eligible, q
    WHERE q.tsq IS NOT NULL AND eligible.search_tsv @@ q.tsq
    ORDER BY ts_rank_cd(eligible.search_tsv, q.tsq) DESC
    LIMIT v_keyword_candidate_count
  ),
  kw AS (
    SELECT
      kw_raw.id,
      kw_raw.keyword_rank,
      kw_raw.keyword_score,
      kw_raw.keyword_score / NULLIF(max(kw_raw.keyword_score) OVER (), 0) AS normalized_keyword_score
    FROM kw_raw
  ),
  fused AS (
    SELECT
      coalesce(vec.id, kw.id) AS id,
      vec.vector_rank,
      kw.keyword_rank,
      vec.vector_score,
      kw.keyword_score,
      kw.normalized_keyword_score
    FROM vec
    FULL OUTER JOIN kw ON kw.id = vec.id
  ),
  ranked AS (
    SELECT
      fused.*,
      1.2 * coalesce(fused.vector_score, 0)
        + 0.6 * coalesce(fused.normalized_keyword_score, 0)
        + CASE
            WHEN v_category IS NULL OR v_category = 'general' THEN 0
            WHEN lower(eligible.canonical_topic) = v_category THEN 0.08
            WHEN lower(eligible.category) = v_category THEN 0.05
            ELSE 0
          END AS hybrid_score
    FROM fused
    JOIN eligible ON eligible.id = fused.id
    WHERE coalesce(fused.vector_score, 0) >= v_similarity_threshold
      OR coalesce(fused.normalized_keyword_score, 0) >= 0.55
    ORDER BY hybrid_score DESC
    LIMIT v_match_count
  )
  SELECT
    eligible.id,
    eligible.content,
    eligible.metadata || jsonb_build_object(
      'doc_id', eligible.doc_id,
      'title', eligible.canonical_title,
      'source_url', eligible.canonical_source_url,
      'source_type', eligible.canonical_source_type,
      'language', eligible.canonical_language,
      'category', eligible.canonical_topic,
      'last_checked_at', eligible.canonical_checked_at,
      'checked_by', eligible.canonical_checked_by,
      'review_status', 'approved',
      'citation_valid', eligible.canonical_source_url ~ '^https://',
      'retrieval_type', 'hybrid',
      'similarity_threshold', v_similarity_threshold,
      'hybrid_score', ranked.hybrid_score,
      'vector_score', ranked.vector_score,
      'keyword_score', ranked.keyword_score,
      'vector_rank', ranked.vector_rank,
      'keyword_rank', ranked.keyword_rank
    ) AS metadata,
    coalesce(ranked.vector_score, 0) AS similarity
  FROM ranked
  JOIN eligible ON eligible.id = ranked.id
  ORDER BY ranked.hybrid_score DESC;
END;
$$;

ALTER TABLE public.rag_serving_chunks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rag_serving_chunks FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.match_rag_documents(vector, integer, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.kaxi_refresh_rag_serving_status() FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public.rag_serving_chunks FROM anon;
    REVOKE EXECUTE ON FUNCTION public.match_rag_documents(vector, integer, jsonb) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.kaxi_refresh_rag_serving_status() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.rag_serving_chunks FROM authenticated;
    REVOKE EXECUTE ON FUNCTION public.match_rag_documents(vector, integer, jsonb) FROM authenticated;
    REVOKE EXECUTE ON FUNCTION public.kaxi_refresh_rag_serving_status() FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE public.rag_serving_chunks TO service_role;
    GRANT USAGE, SELECT ON SEQUENCE public.rag_serving_chunks_id_seq TO service_role;
    GRANT EXECUTE ON FUNCTION public.match_rag_documents(vector, integer, jsonb) TO service_role;
    GRANT EXECUTE ON FUNCTION public.kaxi_refresh_rag_serving_status() TO service_role;
  END IF;
END
$$;

COMMENT ON TABLE public.rag_serving_chunks IS
  'Disposable OpenAI 1536d serving projection. Eligibility is always joined back to governed KnowledgeDocument/KnowledgeChunk rows.';
COMMENT ON FUNCTION public.match_rag_documents(vector, integer, jsonb) IS
  'Canonical-only hybrid RAG retrieval with soft category boosts, per-category thresholds, and verified citation metadata.';

NOTIFY pgrst, 'reload schema';
