-- Replace rank-based RRF with the legacy score-based hybrid fusion

CREATE OR REPLACE FUNCTION kaxi_hybrid_knowledge_search(
  query_embedding vector(384),
  query_text text,
  query_languages text[] DEFAULT ARRAY['ko'],
  match_count integer DEFAULT 5,
  vector_candidate_count integer DEFAULT 40,
  keyword_candidate_count integer DEFAULT 40,
  embedding_model text DEFAULT NULL,
  embedding_dim integer DEFAULT 384
)
RETURNS TABLE (
  chunk_id text,
  document_id text,
  doc_id text,
  title text,
  content text,
  source_url text,
  source_type text,
  language text,
  topic text,
  valid_from timestamp(3),
  valid_to timestamp(3),
  last_checked_at timestamp(3),
  checked_by text,
  review_status "LegalReviewStatus",
  superseded_by text,
  chunk_index integer,
  content_hash text,
  embedding_model_out text,
  embedding_dim_out integer,
  rrf double precision,
  vector_rank integer,
  keyword_rank integer,
  vector_score double precision,
  keyword_score double precision
)
LANGUAGE sql
STABLE
AS $$
  -- query_text is a prebuilt OR/prefix tsquery string ("tok1:* | tok2:*")
  -- produced by the application layer; AND semantics over raw prose matched
  -- almost nothing, which disabled the keyword axis of the hybrid search.
  WITH q AS (
    SELECT CASE
      WHEN coalesce(nullif(query_text, ''), '') = '' THEN to_tsquery('simple', '__kaxi_empty_query__:*')
      ELSE to_tsquery('simple', query_text)
    END AS tsq
  ),
  eligible AS (
    SELECT c.*, d."docId", d.title, d."sourceUrl", d."sourceType", d.language, d.topic,
           d."validFrom", d."validTo", d."lastCheckedAt", d."checkedBy",
           d."reviewStatus", d."supersededBy"
    FROM "KnowledgeChunk" c
    JOIN "KnowledgeDocument" d ON d.id = c."documentId"
    WHERE d."reviewStatus" = 'APPROVED'
      AND d."supersededBy" IS NULL
      AND d."validFrom" <= now()
      AND (d."validTo" IS NULL OR d."validTo" > now())
      AND d.language = ANY(query_languages)
  ),
  vec AS (
    SELECT e.id, row_number() OVER (ORDER BY e.embedding <=> query_embedding) AS rank,
           1 - (e.embedding <=> query_embedding) AS score
    FROM eligible e
    WHERE e.embedding IS NOT NULL
      AND e."embeddingDim" = embedding_dim
      AND (embedding_model IS NULL OR e."embeddingModel" = embedding_model)
    ORDER BY e.embedding <=> query_embedding
    LIMIT vector_candidate_count
  ),
  kw AS (
    SELECT e.id, row_number() OVER (ORDER BY ts_rank(e.tsv, q.tsq) DESC) AS rank,
           ts_rank(e.tsv, q.tsq) AS score,
           ts_rank(e.tsv, q.tsq) / NULLIF(max(ts_rank(e.tsv, q.tsq)) OVER (), 0) AS norm_score
    FROM eligible e, q
    WHERE e.tsv @@ q.tsq
    ORDER BY ts_rank(e.tsv, q.tsq) DESC
    LIMIT keyword_candidate_count
  ),
  -- Score-based fusion ported from the legacy in-memory store
  -- (vScore * 1.2 + normalizedKeywordScore * 0.6). Rank-based RRF discarded
  -- score magnitude, so a dominant curated-keyword match could lose to
  -- mediocre dual-axis matches.
  fused AS (
    SELECT coalesce(v.id, k.id) AS id,
           1.2 * coalesce(v.score, 0) + 0.6 * coalesce(k.norm_score, 0) AS rrf,
           v.rank AS vector_rank,
           k.rank AS keyword_rank,
           v.score AS vector_score,
           k.score AS keyword_score
    FROM vec v
    FULL OUTER JOIN kw k ON k.id = v.id
    ORDER BY 1.2 * coalesce(v.score, 0) + 0.6 * coalesce(k.norm_score, 0) DESC
    LIMIT match_count
  )
  SELECT e.id AS chunk_id,
         e."documentId" AS document_id,
         e."docId" AS doc_id,
         e.title,
         e.content,
         e."sourceUrl" AS source_url,
         e."sourceType" AS source_type,
         e.language,
         e.topic,
         e."validFrom" AS valid_from,
         e."validTo" AS valid_to,
         e."lastCheckedAt" AS last_checked_at,
         e."checkedBy" AS checked_by,
         e."reviewStatus" AS review_status,
         e."supersededBy" AS superseded_by,
         e."chunkIndex" AS chunk_index,
         e."contentHash" AS content_hash,
         e."embeddingModel" AS embedding_model_out,
         e."embeddingDim" AS embedding_dim_out,
         f.rrf,
         f.vector_rank,
         f.keyword_rank,
         f.vector_score,
         f.keyword_score
  FROM fused f
  JOIN eligible e ON e.id = f.id
  ORDER BY f.rrf DESC;
$$;
