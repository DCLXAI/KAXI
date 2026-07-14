CREATE OR REPLACE FUNCTION public.match_rag_documents_hybrid_v3(
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
    - 'embedding_failure_reason' - 'allow_seeded_vector'
    - 'vector_seed_count' - 'output_mode';
  v_category text := lower(nullif(trim(coalesce(filter->>'category', '')), ''));
  v_category_mode text := lower(coalesce(nullif(trim(filter->>'category_mode'), ''), 'strict'));
  v_tenant_id text := coalesce(nullif(trim(coalesce(filter->>'tenant_id', '')), ''), 'default');
  v_locale text := public.kaxi_normalize_rag_locale(coalesce(filter->>'locale', filter->>'language'));
  v_output_mode text := lower(coalesce(nullif(trim(filter->>'output_mode'), ''), 'hybrid'));
  v_allow_seeded_vector boolean := lower(coalesce(filter->>'allow_seeded_vector', 'false')) IN ('true', '1', 'yes');
  v_seed_count integer := CASE
    WHEN coalesce(filter->>'vector_seed_count', '') ~ '^[0-9]+$'
      THEN greatest(1, least((filter->>'vector_seed_count')::integer, 5))
    ELSE 3
  END;
  v_match_count integer := greatest(least(coalesce(match_count, 6), 20), 0);
  v_rrf_k double precision := 60;
BEGIN
  IF v_category IN ('', 'all', 'undefined', 'null', '{{category}}') THEN
    v_category := NULL;
  END IF;
  IF v_category_mode NOT IN ('strict', 'soft', 'off') THEN
    v_category_mode := 'strict';
  END IF;
  IF v_output_mode NOT IN ('hybrid', 'vector-only') THEN
    v_output_mode := 'hybrid';
  END IF;
  IF v_locale IS NULL THEN
    v_locale := public.kaxi_detect_rag_text_locale(filter->>'query_text');
  END IF;

  RETURN QUERY
  WITH lexical_candidates AS MATERIALIZED (
    SELECT
      lexical.id,
      lexical.content,
      lexical.metadata,
      lexical.similarity,
      row_number() OVER (
        ORDER BY coalesce((lexical.metadata->>'lexical_score')::double precision, lexical.similarity) DESC, lexical.id
      ) AS lexical_rank,
      coalesce((lexical.metadata->>'lexical_score')::double precision, lexical.similarity) AS lexical_score
    FROM public.match_rag_documents_lexical(20, v_filter - 'embedding_failure_reason'
      - 'allow_seeded_vector' - 'vector_seed_count' - 'output_mode') lexical
  ),
  seed_rows AS MATERIALIZED (
    SELECT serving.embedding
    FROM lexical_candidates lexical
    JOIN public.rag_serving_chunks serving ON serving.id = lexical.id
    WHERE query_embedding IS NULL
      AND v_allow_seeded_vector
      AND serving.embedding IS NOT NULL
      AND serving.status = 'ready'
    ORDER BY lexical.lexical_rank
    LIMIT v_seed_count
  ),
  retrieval_embedding AS MATERIALIZED (
    SELECT
      coalesce(query_embedding, (SELECT avg(seed_rows.embedding) FROM seed_rows)) AS embedding,
      CASE
        WHEN query_embedding IS NOT NULL THEN 'provider-query'
        WHEN v_allow_seeded_vector AND EXISTS (SELECT 1 FROM seed_rows) THEN 'lexical-centroid'
        ELSE 'none'
      END AS embedding_source,
      CASE
        WHEN query_embedding IS NOT NULL THEN 0
        ELSE (SELECT count(*)::integer FROM seed_rows)
      END AS seed_count
  ),
  eligible_vector AS MATERIALIZED (
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
    WHERE serving.embedding IS NOT NULL
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
  vector_candidates AS MATERIALIZED (
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
      row_number() OVER (
        ORDER BY eligible_vector.embedding <=> retrieval_embedding.embedding, eligible_vector.id
      ) AS vector_rank,
      1 - (eligible_vector.embedding <=> retrieval_embedding.embedding) AS vector_score
    FROM eligible_vector
    CROSS JOIN retrieval_embedding
    WHERE retrieval_embedding.embedding IS NOT NULL
    ORDER BY eligible_vector.embedding <=> retrieval_embedding.embedding, eligible_vector.id
    LIMIT 20
  ),
  candidate_ids AS (
    SELECT lexical_candidates.id
    FROM lexical_candidates
    WHERE v_output_mode <> 'vector-only'
    UNION
    SELECT vector_candidates.id FROM vector_candidates
  ),
  fused AS (
    SELECT
      candidate_ids.id,
      coalesce(lexical_candidates.content, vector_candidates.content) AS content,
      coalesce(lexical_candidates.metadata, vector_candidates.metadata, '{}'::jsonb) AS base_metadata,
      CASE WHEN v_output_mode = 'vector-only' THEN NULL ELSE lexical_candidates.lexical_rank END AS lexical_rank,
      vector_candidates.vector_rank,
      CASE WHEN v_output_mode = 'vector-only' THEN NULL ELSE lexical_candidates.lexical_score END AS lexical_score,
      vector_candidates.vector_score,
      coalesce(
        CASE
          WHEN v_output_mode = 'vector-only' THEN 0
          ELSE 1.0 / (v_rrf_k + lexical_candidates.lexical_rank)
        END,
        0
      ) + coalesce(1.0 / (v_rrf_k + vector_candidates.vector_rank), 0) AS rrf_score
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
  ),
  retrieval_state AS (
    SELECT
      retrieval_embedding.embedding_source,
      retrieval_embedding.seed_count,
      retrieval_embedding.embedding IS NOT NULL AS vector_search_available,
      (SELECT count(*)::integer FROM vector_candidates) AS vector_candidate_count,
      (SELECT count(*)::integer FROM lexical_candidates) AS lexical_candidate_count
    FROM retrieval_embedding
  )
  SELECT
    ranked.id,
    ranked.content,
    ranked.base_metadata || jsonb_build_object(
      'retrieval_type', CASE
        WHEN v_output_mode = 'vector-only' AND retrieval_state.vector_search_available THEN 'vector-only-v3'
        WHEN retrieval_state.vector_search_available THEN 'hybrid-rrf-v3'
        ELSE 'lexical-v2'
      END,
      'retrieval_mode', CASE
        WHEN v_output_mode = 'vector-only' AND retrieval_state.vector_search_available THEN 'vector-only'
        WHEN retrieval_state.embedding_source = 'provider-query' THEN 'hybrid-provider'
        WHEN retrieval_state.embedding_source = 'lexical-centroid' THEN 'hybrid-seeded'
        ELSE 'lexical-only'
      END,
      'score_version', CASE
        WHEN retrieval_state.embedding_source = 'provider-query' THEN 'rrf-k60-provider-v3'
        WHEN retrieval_state.embedding_source = 'lexical-centroid' THEN 'rrf-k60-seeded-v3'
        ELSE 'absolute-weighted-v2'
      END,
      'embedding_available', query_embedding IS NOT NULL,
      'vector_search_available', retrieval_state.vector_search_available,
      'embedding_source', retrieval_state.embedding_source,
      'stored_vector_search', retrieval_state.embedding_source = 'lexical-centroid',
      'vector_seed_count', retrieval_state.seed_count,
      'embedding_failure_reason', nullif(v_filter->>'embedding_failure_reason', ''),
      'rrf_k', v_rrf_k,
      'rrf_score', ranked.rrf_score,
      'hybrid_score', ranked.rrf_score,
      'lexical_score', ranked.lexical_score,
      'vector_score', ranked.vector_score,
      'lexical_rank', ranked.lexical_rank,
      'vector_rank', ranked.vector_rank,
      'lexical_candidate_count', retrieval_state.lexical_candidate_count,
      'vector_candidate_count', retrieval_state.vector_candidate_count
    ) AS metadata,
    coalesce(ranked.vector_score, ranked.lexical_score, ranked.rrf_score)::double precision AS similarity
  FROM ranked
  CROSS JOIN retrieval_state
  ORDER BY
    ranked.rrf_score DESC,
    coalesce(ranked.lexical_score, 0) DESC,
    coalesce(ranked.vector_score, 0) DESC,
    ranked.id;
END;
$$;

REVOKE ALL ON FUNCTION public.match_rag_documents_hybrid_v3(vector, integer, jsonb) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.match_rag_documents_hybrid_v3(vector, integer, jsonb) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION public.match_rag_documents_hybrid_v3(vector, integer, jsonb) FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.match_rag_documents_hybrid_v3(vector, integer, jsonb) TO service_role;
  END IF;
END
$$;

COMMENT ON FUNCTION public.match_rag_documents_hybrid_v3(vector, integer, jsonb) IS
  'Retrieves 20 lexical and 20 vector candidates with RRF k=60. Uses a provider query embedding when supplied, a strict lexical top-3 stored-vector centroid when explicitly allowed, and lexical-only when a configured provider fails.';

NOTIFY pgrst, 'reload schema';
