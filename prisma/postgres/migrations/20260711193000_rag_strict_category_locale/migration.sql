-- Enforce strict category retrieval and return only the requested locale's
-- Markdown sections. The governed corpus stores multiple localized sections
-- in a single canonical chunk, so document.language alone is not sufficient.

CREATE OR REPLACE FUNCTION public.kaxi_normalize_rag_locale(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE lower(trim(coalesce(value, '')))
    WHEN 'ko' THEN 'ko'
    WHEN 'kr' THEN 'ko'
    WHEN 'ko-kr' THEN 'ko'
    WHEN 'en' THEN 'en'
    WHEN 'en-us' THEN 'en'
    WHEN 'en-gb' THEN 'en'
    WHEN 'vi' THEN 'vi'
    WHEN 'vn' THEN 'vi'
    WHEN 'vi-vn' THEN 'vi'
    WHEN 'mn' THEN 'mn'
    WHEN 'mn-mn' THEN 'mn'
    ELSE NULL
  END
$$;

CREATE OR REPLACE FUNCTION public.kaxi_detect_rag_text_locale(value text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  candidate text := trim(coalesce(value, ''));
BEGIN
  IF candidate = '' THEN
    RETURN NULL;
  END IF;
  IF candidate ~ '[가-힣ㄱ-ㅎㅏ-ㅣ]' THEN
    RETURN 'ko';
  END IF;
  IF candidate ~* '[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]' THEN
    RETURN 'vi';
  END IF;
  IF candidate ~ '[А-Яа-яЁёӨөҮү]' THEN
    RETURN 'mn';
  END IF;
  IF candidate ~* '[a-z]' THEN
    RETURN 'en';
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.kaxi_rag_category_allowed(requested_category text, candidate_category text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE lower(trim(coalesce(requested_category, '')))
    WHEN '' THEN true
    WHEN 'general' THEN true
    WHEN 'cost' THEN lower(trim(coalesce(candidate_category, ''))) = 'cost'
    WHEN 'visa' THEN lower(trim(coalesce(candidate_category, ''))) IN ('visa', 'legal', 'process', 'warning')
    WHEN 'documents' THEN lower(trim(coalesce(candidate_category, ''))) IN ('documents', 'legal', 'process', 'warning')
    WHEN 'school' THEN lower(trim(coalesce(candidate_category, ''))) IN ('school', 'documents', 'process')
    WHEN 'warning' THEN lower(trim(coalesce(candidate_category, ''))) IN ('warning', 'legal')
    WHEN 'process' THEN lower(trim(coalesce(candidate_category, ''))) IN ('process', 'warning', 'legal')
    WHEN 'legal' THEN lower(trim(coalesce(candidate_category, ''))) = 'legal'
    ELSE false
  END
$$;

CREATE OR REPLACE FUNCTION public.kaxi_extract_rag_locale_sections(value text, requested_locale text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  normalized_locale text := public.kaxi_normalize_rag_locale(requested_locale);
  line text;
  section_text text := '';
  section_heading text := '';
  section_locale text;
  extracted text := '';
BEGIN
  IF normalized_locale IS NULL THEN
    RETURN nullif(trim(coalesce(value, '')), '');
  END IF;

  FOREACH line IN ARRAY regexp_split_to_array(coalesce(value, ''), E'\r?\n')
  LOOP
    IF line ~ '^#{1,6}[[:space:]]+' THEN
      IF trim(section_text) <> '' THEN
        section_locale := coalesce(
          public.kaxi_detect_rag_text_locale(section_heading),
          public.kaxi_detect_rag_text_locale(section_text)
        );
        IF section_locale = normalized_locale THEN
          extracted := concat_ws(E'\n\n', nullif(extracted, ''), trim(section_text));
        END IF;
      END IF;
      section_text := line;
      section_heading := regexp_replace(line, '^#{1,6}[[:space:]]+', '');
    ELSE
      section_text := CASE
        WHEN section_text = '' THEN line
        ELSE section_text || E'\n' || line
      END;
    END IF;
  END LOOP;

  IF trim(section_text) <> '' THEN
    section_locale := coalesce(
      public.kaxi_detect_rag_text_locale(section_heading),
      public.kaxi_detect_rag_text_locale(section_text)
    );
    IF section_locale = normalized_locale THEN
      extracted := concat_ws(E'\n\n', nullif(extracted, ''), trim(section_text));
    END IF;
  END IF;

  RETURN nullif(trim(extracted), '');
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
  v_filter jsonb := coalesce(filter, '{}'::jsonb);
  v_metadata_filter jsonb := coalesce(filter, '{}'::jsonb)
    - 'query_text' - 'similarity_threshold' - 'vector_candidate_count'
    - 'keyword_candidate_count' - 'category' - 'category_mode' - 'tenant_id'
    - 'locale' - 'language';
  v_query_text text := nullif(trim(coalesce(filter->>'query_text', '')), '');
  v_category text := lower(nullif(trim(coalesce(filter->>'category', '')), ''));
  v_category_mode text := lower(coalesce(nullif(trim(filter->>'category_mode'), ''), 'strict'));
  v_tenant_id text := coalesce(nullif(trim(coalesce(filter->>'tenant_id', '')), ''), 'default');
  v_locale text := public.kaxi_normalize_rag_locale(coalesce(filter->>'locale', filter->>'language'));
  v_similarity_threshold double precision := 0.72;
  v_match_count integer := greatest(coalesce(match_count, 6), 0);
  v_vector_candidate_count integer := greatest(coalesce(match_count, 6) * 6, 36);
  v_keyword_candidate_count integer := greatest(coalesce(match_count, 6) * 6, 36);
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

  v_similarity_threshold := CASE v_category
    WHEN 'documents' THEN 0.68
    WHEN 'school' THEN 0.70
    WHEN 'cost' THEN 0.70
    WHEN 'visa' THEN 0.72
    ELSE 0.72
  END;

  IF coalesce(v_filter->>'similarity_threshold', '') ~ '^[0-9]+(\.[0-9]+)?$' THEN
    v_similarity_threshold := least(greatest((v_filter->>'similarity_threshold')::double precision, 0), 1);
  END IF;
  IF coalesce(v_filter->>'vector_candidate_count', '') ~ '^[0-9]+$' THEN
    v_vector_candidate_count := greatest((v_filter->>'vector_candidate_count')::integer, v_match_count);
  END IF;
  IF coalesce(v_filter->>'keyword_candidate_count', '') ~ '^[0-9]+$' THEN
    v_keyword_candidate_count := greatest((v_filter->>'keyword_candidate_count')::integer, v_match_count);
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
      row_number() OVER (
        ORDER BY ts_rank_cd(
          to_tsvector('simple', concat_ws(' ',
            eligible.localized_title,
            eligible.metadata->>'keywords',
            eligible.category,
            eligible.localized_content
          )),
          q.tsq
        ) DESC
      ) AS keyword_rank,
      ts_rank_cd(
        to_tsvector('simple', concat_ws(' ',
          eligible.localized_title,
          eligible.metadata->>'keywords',
          eligible.category,
          eligible.localized_content
        )),
        q.tsq
      ) AS keyword_score
    FROM eligible, q
    WHERE q.tsq IS NOT NULL
      AND to_tsvector('simple', concat_ws(' ',
        eligible.localized_title,
        eligible.metadata->>'keywords',
        eligible.category,
        eligible.localized_content
      )) @@ q.tsq
    ORDER BY keyword_score DESC
    LIMIT v_keyword_candidate_count
  ),
  kw AS (
    SELECT
      kw_raw.id,
      kw_raw.keyword_rank,
      kw_raw.keyword_score,
      kw_raw.keyword_score / nullif(max(kw_raw.keyword_score) OVER (), 0) AS normalized_keyword_score
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
            WHEN v_category IS NULL OR v_category = 'general' OR v_category_mode = 'off' THEN 0
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
      'retrieval_type', 'hybrid',
      'category_mode', v_category_mode,
      'locale_filter', v_locale,
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

REVOKE ALL ON FUNCTION public.kaxi_normalize_rag_locale(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.kaxi_detect_rag_text_locale(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.kaxi_rag_category_allowed(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.kaxi_extract_rag_locale_sections(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.match_rag_documents(vector, integer, jsonb) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.kaxi_normalize_rag_locale(text) FROM anon;
    REVOKE ALL ON FUNCTION public.kaxi_detect_rag_text_locale(text) FROM anon;
    REVOKE ALL ON FUNCTION public.kaxi_rag_category_allowed(text, text) FROM anon;
    REVOKE ALL ON FUNCTION public.kaxi_extract_rag_locale_sections(text, text) FROM anon;
    REVOKE ALL ON FUNCTION public.match_rag_documents(vector, integer, jsonb) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION public.kaxi_normalize_rag_locale(text) FROM authenticated;
    REVOKE ALL ON FUNCTION public.kaxi_detect_rag_text_locale(text) FROM authenticated;
    REVOKE ALL ON FUNCTION public.kaxi_rag_category_allowed(text, text) FROM authenticated;
    REVOKE ALL ON FUNCTION public.kaxi_extract_rag_locale_sections(text, text) FROM authenticated;
    REVOKE ALL ON FUNCTION public.match_rag_documents(vector, integer, jsonb) FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.kaxi_normalize_rag_locale(text) TO service_role;
    GRANT EXECUTE ON FUNCTION public.kaxi_detect_rag_text_locale(text) TO service_role;
    GRANT EXECUTE ON FUNCTION public.kaxi_rag_category_allowed(text, text) TO service_role;
    GRANT EXECUTE ON FUNCTION public.kaxi_extract_rag_locale_sections(text, text) TO service_role;
    GRANT EXECUTE ON FUNCTION public.match_rag_documents(vector, integer, jsonb) TO service_role;
  END IF;
END
$$;

COMMENT ON FUNCTION public.kaxi_extract_rag_locale_sections(text, text) IS
  'Returns only Markdown sections matching ko, en, vi, or mn for locale-safe RAG context.';
COMMENT ON FUNCTION public.kaxi_rag_category_allowed(text, text) IS
  'Maps user-facing strict categories to approved cross-cutting legal, process, and warning topics.';
COMMENT ON FUNCTION public.match_rag_documents(vector, integer, jsonb) IS
  'Governed hybrid RAG search with strict category matching by default and locale-projected context. Empty strict results must route to noContext.';

NOTIFY pgrst, 'reload schema';
