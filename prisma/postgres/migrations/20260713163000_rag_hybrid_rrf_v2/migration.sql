CREATE OR REPLACE FUNCTION public.match_rag_documents_hybrid_v2(
  query_embedding vector(1536) DEFAULT NULL,
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
SET search_path = public, extensions
AS $$
DECLARE
  v_filter jsonb := coalesce(filter, '{}'::jsonb);
  v_metadata_filter jsonb := coalesce(filter, '{}'::jsonb)
    - 'query_text' - 'category' - 'category_mode' - 'tenant_id'
    - 'locale' - 'language' - 'retrieval_mode' - 'shadow_mode'
    - 'embedding_failure_reason';
  v_category text := lower(nullif(trim(coalesce(filter->>'category', '')), ''));
  v_category_mode text := lower(coalesce(nullif(trim(filter->>'category_mode'), ''), 'strict'));
  v_tenant_id text := coalesce(nullif(trim(coalesce(filter->>'tenant_id', '')), ''), 'default');
  v_locale text := public.kaxi_normalize_rag_locale(coalesce(filter->>'locale', filter->>'language'));
  v_match_count integer := greatest(least(coalesce(match_count, 6), 20), 0);
  v_rrf_k double precision := 60;
  v_embedding_available boolean := query_embedding IS NOT NULL;
BEGIN
  IF v_category IN ('', 'all', 'undefined', 'null', '{{category}}') THEN
    v_category := NULL;
  END IF;
  IF v_category_mode NOT IN ('strict', 'soft', 'off') THEN
    v_category_mode := 'strict';
  END IF;
  IF v_locale IS NULL THEN
    v_locale := public.kaxi_detect_rag_text_locale(filter->>'query_text');
  END IF;

  RETURN QUERY
  WITH lexical_candidates AS (
    SELECT
      lexical.id,
      lexical.content,
      lexical.metadata,
      lexical.similarity,
      row_number() OVER (
        ORDER BY coalesce((lexical.metadata->>'lexical_score')::double precision, lexical.similarity) DESC, lexical.id
      ) AS lexical_rank,
      coalesce((lexical.metadata->>'lexical_score')::double precision, lexical.similarity) AS lexical_score
    FROM public.match_rag_documents_lexical(20, v_filter - 'embedding_failure_reason') lexical
  ),
  eligible_vector AS (
    SELECT
      serving.id,
      localized.localized_content,
      coalesce(
        nullif(
          trim(regexp_replace(split_part(localized.localized_content, E'\n', 1), '^#{1,6}[[:space:]]+', '')),
          ''
        ),
        document.title
      ) AS localized_title,
      serving.metadata,
      serving.embedding,
      serving.doc_id,
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
    CROSS JOIN LATERAL (
      SELECT public.kaxi_extract_rag_locale_sections(serving.content, v_locale) AS localized_content
    ) localized
    WHERE v_embedding_available
      AND serving.embedding IS NOT NULL
      AND serving.status = 'ready'
      AND serving.tenant_id = v_tenant_id
      AND serving.metadata @> v_metadata_filter
      AND document."reviewStatus" = 'APPROVED'::"LegalReviewStatus"
      AND document."supersededBy" IS NULL
      AND document."validFrom" <= now()
      AND (document."validTo" IS NULL OR document."validTo" > now())
      AND document."lastCheckedAt" >= now() - interval '180 days'
      AND (v_locale IS NULL OR localized.localized_content IS NOT NULL)
      AND (
        v_category IS NULL
        OR v_category = 'general'
        OR v_category_mode IN ('soft', 'off')
        OR public.kaxi_rag_category_allowed(
          v_category,
          coalesce(nullif(document.topic, ''), serving.category)
        )
      )
  ),
  vector_candidates AS (
    SELECT
      eligible_vector.id,
      eligible_vector.localized_content AS content,
      eligible_vector.metadata || jsonb_build_object(
        'doc_id', eligible_vector.doc_id,
        'title', eligible_vector.localized_title,
        'source_url', eligible_vector.canonical_source_url,
        'source_type', eligible_vector.canonical_source_type,
        'language', coalesce(v_locale, eligible_vector.canonical_language),
        'category', eligible_vector.canonical_topic,
        'last_checked_at', eligible_vector.canonical_checked_at,
        'checked_by', eligible_vector.canonical_checked_by,
        'review_status', 'approved',
        'citation_valid', eligible_vector.canonical_source_url ~ '^https://',
        'category_mode', v_category_mode,
        'locale_filter', v_locale
      ) AS metadata,
      row_number() OVER (ORDER BY eligible_vector.embedding <=> query_embedding, eligible_vector.id) AS vector_rank,
      1 - (eligible_vector.embedding <=> query_embedding) AS vector_score
    FROM eligible_vector
    ORDER BY eligible_vector.embedding <=> query_embedding, eligible_vector.id
    LIMIT 20
  ),
  candidate_ids AS (
    SELECT lexical_candidates.id FROM lexical_candidates
    UNION
    SELECT vector_candidates.id FROM vector_candidates
  ),
  fused AS (
    SELECT
      candidate_ids.id,
      coalesce(lexical_candidates.content, vector_candidates.content) AS content,
      coalesce(lexical_candidates.metadata, vector_candidates.metadata, '{}'::jsonb) AS base_metadata,
      lexical_candidates.lexical_rank,
      vector_candidates.vector_rank,
      lexical_candidates.lexical_score,
      vector_candidates.vector_score,
      coalesce(1.0 / (v_rrf_k + lexical_candidates.lexical_rank), 0)
        + coalesce(1.0 / (v_rrf_k + vector_candidates.vector_rank), 0) AS rrf_score
    FROM candidate_ids
    LEFT JOIN lexical_candidates ON lexical_candidates.id = candidate_ids.id
    LEFT JOIN vector_candidates ON vector_candidates.id = candidate_ids.id
  ),
  ranked AS (
    SELECT fused.*
    FROM fused
    ORDER BY
      fused.rrf_score DESC,
      coalesce(fused.lexical_score, 0) DESC,
      coalesce(fused.vector_score, 0) DESC,
      fused.id
    LIMIT v_match_count
  )
  SELECT
    ranked.id,
    ranked.content,
    ranked.base_metadata || jsonb_build_object(
      'retrieval_type', CASE WHEN v_embedding_available THEN 'hybrid-rrf-v2' ELSE 'lexical-v2' END,
      'retrieval_mode', CASE WHEN v_embedding_available THEN 'hybrid' ELSE 'lexical-only' END,
      'score_version', CASE WHEN v_embedding_available THEN 'rrf-k60-v2' ELSE 'absolute-weighted-v2' END,
      'embedding_available', v_embedding_available,
      'embedding_failure_reason', nullif(v_filter->>'embedding_failure_reason', ''),
      'rrf_k', v_rrf_k,
      'rrf_score', ranked.rrf_score,
      'hybrid_score', ranked.rrf_score,
      'lexical_score', ranked.lexical_score,
      'vector_score', ranked.vector_score,
      'lexical_rank', ranked.lexical_rank,
      'vector_rank', ranked.vector_rank,
      'lexical_candidate_count', (SELECT count(*) FROM lexical_candidates),
      'vector_candidate_count', (SELECT count(*) FROM vector_candidates)
    ) AS metadata,
    coalesce(ranked.vector_score, ranked.lexical_score, ranked.rrf_score)::double precision AS similarity
  FROM ranked
  ORDER BY
    ranked.rrf_score DESC,
    coalesce(ranked.lexical_score, 0) DESC,
    coalesce(ranked.vector_score, 0) DESC,
    ranked.id;
END;
$$;

REVOKE ALL ON FUNCTION public.match_rag_documents_hybrid_v2(vector, integer, jsonb) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.match_rag_documents_hybrid_v2(vector, integer, jsonb) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION public.match_rag_documents_hybrid_v2(vector, integer, jsonb) FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.match_rag_documents_hybrid_v2(vector, integer, jsonb) TO service_role;
  END IF;
END
$$;

COMMENT ON FUNCTION public.match_rag_documents_hybrid_v2(vector, integer, jsonb) IS
  'Retrieves 20 lexical and 20 pgvector candidates, fuses them with RRF k=60, returns the requested final count, and automatically runs lexical-only when query_embedding is null.';

NOTIFY pgrst, 'reload schema';
