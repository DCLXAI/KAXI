-- Improve n8n/Typebot RAG retrieval quality while preserving the LangChain
-- Supabase Vector Store RPC contract: match_documents(vector, integer, jsonb).
--
-- New filter control keys accepted through the existing JSONB filter:
-- - query_text: original user question for keyword/hybrid search
-- - similarity_threshold: minimum vector similarity for vector candidates
-- - category: optional category filter; "general"/"all" means no restriction

ALTER TABLE public.knowledge_chunks
  ADD COLUMN IF NOT EXISTS search_tsv tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(metadata->>'title', '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(metadata->>'keywords', '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(metadata->>'category', '')), 'B') ||
    setweight(to_tsvector('simple', content), 'D')
  ) STORED;

CREATE INDEX IF NOT EXISTS knowledge_chunks_search_tsv_gin
  ON public.knowledge_chunks USING gin (search_tsv);

CREATE INDEX IF NOT EXISTS knowledge_chunks_category_idx
  ON public.knowledge_chunks ((coalesce(metadata->>'category', 'general')));

CREATE INDEX IF NOT EXISTS knowledge_chunks_source_checked_idx
  ON public.knowledge_chunks (
    (coalesce(metadata->>'source_url', metadata->>'sourceUrl', '')),
    (coalesce(metadata->>'last_checked_at', metadata->>'lastCheckedAt', metadata->>'checkedAt', ''))
  );

CREATE OR REPLACE FUNCTION public.kaxi_or_prefix_tsquery(query_text TEXT)
RETURNS tsquery
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_query TEXT;
BEGIN
  SELECT string_agg(token || ':*', ' | ')
  INTO v_query
  FROM (
    SELECT DISTINCT lower(token) AS token
    FROM regexp_split_to_table(coalesce(query_text, ''), '[^0-9A-Za-z가-힣]+') AS token
    WHERE char_length(token) >= 2
    LIMIT 32
  ) tokens;

  IF v_query IS NULL OR v_query = '' THEN
    RETURN NULL;
  END IF;

  RETURN to_tsquery('simple', v_query);
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.match_documents(
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
    - 'query_text'
    - 'similarity_threshold'
    - 'vector_candidate_count'
    - 'keyword_candidate_count'
    - 'category'
    - 'category_mode';
  v_query_text TEXT := nullif(trim(coalesce(filter->>'query_text', '')), '');
  v_category TEXT := lower(nullif(trim(coalesce(filter->>'category', '')), ''));
  v_tenant_id TEXT := nullif(trim(coalesce(filter->>'tenant_id', '')), '');
  v_similarity_threshold DOUBLE PRECISION := 0.72;
  v_match_count INTEGER := greatest(coalesce(match_count, 6), 0);
  v_vector_candidate_count INTEGER := greatest(coalesce(match_count, 6) * 4, 24);
  v_keyword_candidate_count INTEGER := greatest(coalesce(match_count, 6) * 4, 24);
BEGIN
  IF coalesce(v_filter->>'similarity_threshold', '') ~ '^[0-9]+(\.[0-9]+)?$' THEN
    v_similarity_threshold := least(greatest((v_filter->>'similarity_threshold')::DOUBLE PRECISION, 0), 1);
  END IF;

  IF coalesce(v_filter->>'vector_candidate_count', '') ~ '^[0-9]+$' THEN
    v_vector_candidate_count := greatest((v_filter->>'vector_candidate_count')::INTEGER, v_match_count);
  END IF;

  IF coalesce(v_filter->>'keyword_candidate_count', '') ~ '^[0-9]+$' THEN
    v_keyword_candidate_count := greatest((v_filter->>'keyword_candidate_count')::INTEGER, v_match_count);
  END IF;

  IF v_category IN ('', 'all', 'general', 'undefined', 'null', '{{category}}') THEN
    v_category := NULL;
  END IF;

  RETURN QUERY
  WITH q AS (
    SELECT public.kaxi_or_prefix_tsquery(v_query_text) AS tsq
  ),
  eligible AS (
    SELECT kc.*
    FROM public.knowledge_chunks kc
    WHERE kc.embedding IS NOT NULL
      AND kc.metadata @> v_metadata_filter
      AND (v_tenant_id IS NULL OR coalesce(kc.metadata->>'tenant_id', 'default') = v_tenant_id)
      AND (
        v_category IS NULL
        OR lower(coalesce(kc.metadata->>'category', 'general')) IN (v_category, 'general')
      )
  ),
  vec AS (
    SELECT
      e.id,
      row_number() OVER (ORDER BY e.embedding <=> query_embedding) AS vector_rank,
      1 - (e.embedding <=> query_embedding) AS vector_score
    FROM eligible e
    WHERE 1 - (e.embedding <=> query_embedding) >= v_similarity_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT v_vector_candidate_count
  ),
  kw_raw AS (
    SELECT
      e.id,
      row_number() OVER (ORDER BY ts_rank_cd(e.search_tsv, q.tsq) DESC) AS keyword_rank,
      ts_rank_cd(e.search_tsv, q.tsq) AS keyword_score
    FROM eligible e, q
    WHERE q.tsq IS NOT NULL
      AND e.search_tsv @@ q.tsq
    ORDER BY ts_rank_cd(e.search_tsv, q.tsq) DESC
    LIMIT v_keyword_candidate_count
  ),
  kw AS (
    SELECT
      kw_raw.id AS chunk_id,
      kw_raw.keyword_rank,
      kw_raw.keyword_score,
      kw_raw.keyword_score / NULLIF(max(kw_raw.keyword_score) OVER (), 0) AS normalized_keyword_score
    FROM kw_raw
  ),
  fused AS (
    SELECT
      coalesce(v.id, k.chunk_id) AS chunk_id,
      v.vector_rank,
      k.keyword_rank,
      v.vector_score,
      k.keyword_score,
      1.2 * coalesce(v.vector_score, 0)
        + 0.6 * coalesce(k.normalized_keyword_score, 0) AS hybrid_score
    FROM vec v
    FULL OUTER JOIN kw k ON k.chunk_id = v.id
    ORDER BY
      1.2 * coalesce(v.vector_score, 0)
        + 0.6 * coalesce(k.normalized_keyword_score, 0) DESC
    LIMIT v_match_count
  )
  SELECT
    kc.id,
    kc.content,
    kc.metadata || jsonb_build_object(
      'retrieval_type', 'hybrid',
      'similarity_threshold', v_similarity_threshold,
      'hybrid_score', f.hybrid_score,
      'vector_score', f.vector_score,
      'keyword_score', f.keyword_score,
      'vector_rank', f.vector_rank,
      'keyword_rank', f.keyword_rank,
      'source_url', nullif(coalesce(kc.metadata->>'source_url', kc.metadata->>'sourceUrl', ''), ''),
      'last_checked_at', nullif(coalesce(kc.metadata->>'last_checked_at', kc.metadata->>'lastCheckedAt', kc.metadata->>'checkedAt', ''), ''),
      'checked_by', nullif(coalesce(kc.metadata->>'checked_by', kc.metadata->>'checkedBy', ''), '')
    ) AS metadata,
    coalesce(f.vector_score, 0) AS similarity
  FROM fused f
  JOIN public.knowledge_chunks kc ON kc.id = f.chunk_id
  ORDER BY f.hybrid_score DESC;
END;
$$;

COMMENT ON FUNCTION public.match_documents(vector, integer, jsonb) IS
  'n8n/LangChain RAG hybrid search over public.knowledge_chunks. Supports query_text, similarity_threshold, category, source URL and checked-date metadata.';

NOTIFY pgrst, 'reload schema';
