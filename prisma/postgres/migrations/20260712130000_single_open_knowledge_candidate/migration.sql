WITH ranked_candidates AS (
  SELECT
    id,
    "docId",
    first_value("docId") OVER (
      PARTITION BY regexp_replace("docId", '__candidate__.*$', '')
      ORDER BY "lastCheckedAt" DESC, "updatedAt" DESC, "docId" ASC
    ) AS keeper_doc_id,
    row_number() OVER (
      PARTITION BY regexp_replace("docId", '__candidate__.*$', '')
      ORDER BY "lastCheckedAt" DESC, "updatedAt" DESC, "docId" ASC
    ) AS candidate_rank
  FROM "KnowledgeDocument"
  WHERE "reviewStatus" = 'PENDING'
    AND "docId" LIKE '%__candidate__%'
)
UPDATE "KnowledgeDocument" AS document
SET
  "reviewStatus" = 'REJECTED',
  "supersededBy" = ranked.keeper_doc_id,
  "checkedBy" = CASE
    WHEN nullif(trim(document."checkedBy"), '') IS NULL THEN 'system:candidate-dedupe'
    ELSE document."checkedBy"
  END,
  "updatedAt" = now()
FROM ranked_candidates AS ranked
WHERE document.id = ranked.id
  AND ranked.candidate_rank > 1;

CREATE UNIQUE INDEX "KnowledgeDocument_one_open_candidate_per_source_key"
ON "KnowledgeDocument" ((regexp_replace("docId", '__candidate__.*$', '')))
WHERE "reviewStatus" = 'PENDING'
  AND "docId" LIKE '%__candidate__%';

COMMENT ON INDEX "KnowledgeDocument_one_open_candidate_per_source_key" IS
  'Allows only one PENDING review candidate per canonical knowledge source.';
