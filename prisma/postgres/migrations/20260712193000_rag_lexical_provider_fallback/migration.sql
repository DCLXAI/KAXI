CREATE OR REPLACE FUNCTION public.match_rag_documents_lexical(
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
  v_filter jsonb := coalesce(filter, '{}'::jsonb);
  v_metadata_filter jsonb := coalesce(filter, '{}'::jsonb)
    - 'query_text' - 'category' - 'category_mode' - 'tenant_id'
    - 'locale' - 'language';
  v_query_text text := nullif(trim(coalesce(filter->>'query_text', '')), '');
  v_category text := lower(nullif(trim(coalesce(filter->>'category', '')), ''));
  v_category_mode text := lower(coalesce(nullif(trim(filter->>'category_mode'), ''), 'strict'));
  v_tenant_id text := coalesce(nullif(trim(coalesce(filter->>'tenant_id', '')), ''), 'default');
  v_locale text := public.kaxi_normalize_rag_locale(coalesce(filter->>'locale', filter->>'language'));
  v_match_count integer := greatest(coalesce(match_count, 6), 0);
BEGIN
  IF v_category IN ('', 'all', 'undefined', 'null', '{{category}}') THEN
    v_category := NULL;
  END IF;
  IF v_category_mode NOT IN ('strict', 'soft', 'off') THEN
    v_category_mode := 'strict';
  END IF;
  IF v_locale IS NULL THEN
    v_locale := public.kaxi_detect_rag_text_locale(v_query_text);
  END IF;

  RETURN QUERY
  WITH q AS (
    SELECT public.kaxi_or_prefix_tsquery(v_query_text) AS tsq
  ),
  eligible AS (
    SELECT
      serving.*,
      localized.localized_content,
      coalesce(
        nullif(
          trim(regexp_replace(split_part(localized.localized_content, E'\n', 1), '^#{1,6}[[:space:]]+', '')),
          ''
        ),
        document.title
      ) AS localized_title,
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
  keyword_raw AS (
    SELECT
      eligible.id,
      ts_rank_cd(
        to_tsvector('simple', concat_ws(' ',
          eligible.doc_id,
          eligible.localized_title,
          eligible.metadata->>'keywords',
          eligible.category,
          eligible.localized_content
        )),
        q.tsq
      ) AS keyword_score,
      CASE
        WHEN position(lower(eligible.doc_id) IN lower(coalesce(v_query_text, ''))) > 0 THEN 1.0
        ELSE 0.0
      END AS exact_doc_id_score
    FROM eligible, q
    WHERE q.tsq IS NOT NULL
      AND to_tsvector('simple', concat_ws(' ',
        eligible.doc_id,
        eligible.localized_title,
        eligible.metadata->>'keywords',
        eligible.category,
        eligible.localized_content
      )) @@ q.tsq
  ),
  keyword_normalized AS (
    SELECT
      keyword_raw.*,
      keyword_raw.keyword_score
        / nullif(max(keyword_raw.keyword_score) OVER (), 0) AS normalized_keyword_score
    FROM keyword_raw
  ),
  ranked AS (
    SELECT
      keyword_normalized.id,
      keyword_normalized.keyword_score,
      keyword_normalized.normalized_keyword_score,
      keyword_normalized.exact_doc_id_score,
      keyword_normalized.exact_doc_id_score
        + coalesce(keyword_normalized.normalized_keyword_score, 0)
        + CASE
            WHEN v_category IS NULL OR v_category = 'general' OR v_category_mode = 'off' THEN 0
            WHEN lower(eligible.canonical_topic) = v_category THEN 0.08
            WHEN lower(eligible.category) = v_category THEN 0.05
            ELSE 0
          END AS lexical_score
    FROM keyword_normalized
    JOIN eligible ON eligible.id = keyword_normalized.id
    ORDER BY lexical_score DESC, keyword_normalized.keyword_score DESC, keyword_normalized.id
    LIMIT v_match_count
  )
  SELECT
    eligible.id,
    eligible.localized_content AS content,
    eligible.metadata || jsonb_build_object(
      'doc_id', eligible.doc_id,
      'title', eligible.localized_title,
      'source_url', eligible.canonical_source_url,
      'source_type', eligible.canonical_source_type,
      'language', coalesce(v_locale, eligible.canonical_language),
      'category', eligible.canonical_topic,
      'last_checked_at', eligible.canonical_checked_at,
      'checked_by', eligible.canonical_checked_by,
      'review_status', 'approved',
      'citation_valid', eligible.canonical_source_url ~ '^https://',
      'retrieval_type', 'lexical-provider-fallback',
      'category_mode', v_category_mode,
      'locale_filter', v_locale,
      'similarity_threshold', 0,
      'hybrid_score', ranked.lexical_score,
      'vector_score', 0,
      'keyword_score', ranked.keyword_score,
      'exact_doc_id_score', ranked.exact_doc_id_score
    ) AS metadata,
    0::double precision AS similarity
  FROM ranked
  JOIN eligible ON eligible.id = ranked.id
  ORDER BY ranked.lexical_score DESC, ranked.keyword_score DESC, ranked.id;
END;
$$;

REVOKE ALL ON FUNCTION public.match_rag_documents_lexical(integer, jsonb) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.match_rag_documents_lexical(integer, jsonb) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION public.match_rag_documents_lexical(integer, jsonb) FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.match_rag_documents_lexical(integer, jsonb) TO service_role;
  END IF;
END
$$;

COMMENT ON FUNCTION public.match_rag_documents_lexical(integer, jsonb) IS
  'Credential-independent lexical RAG fallback with canonical doc-id hints, strict category filtering, and locale-projected approved content.';

NOTIFY pgrst, 'reload schema';
