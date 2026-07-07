-- Curated per-document keywords get their own column and dominate the keyword
-- axis via tsvector weight A (content stays weight D). ts_rank's default
-- weight array {0.1,0.2,0.4,1.0} then scores a curated-keyword match ~10x a
-- plain content match, matching the legacy in-memory store's behavior.

ALTER TABLE "KnowledgeChunk"
  ADD COLUMN IF NOT EXISTS keywords text NOT NULL DEFAULT '';

ALTER TABLE "KnowledgeChunk" DROP COLUMN IF EXISTS tsv;

ALTER TABLE "KnowledgeChunk"
  ADD COLUMN tsv tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(keywords, '')), 'A') ||
    setweight(to_tsvector('simple', content), 'D')
  ) STORED;

CREATE INDEX IF NOT EXISTS knowledge_chunk_tsv
  ON "KnowledgeChunk" USING gin (tsv);
