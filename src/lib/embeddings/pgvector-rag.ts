import { createHash } from "crypto";
import { LegalReviewStatus, Prisma } from "@prisma/client";
import { db, getRuntimeDatabaseInfo } from "../db";
import {
  getKnowledgeDocsWithMetadata,
  getRagDocumentMetadata,
  pickLangText,
  type KnowledgeDoc,
  type RagDocumentMetadata,
} from "../data/knowledge";
import type { Lang } from "../i18n/translations";
import { embedBatch, embedText, getEmbedDim, getTransformerRuntimeInfo, type EmbeddingVector } from "./transformer-embedder";
import { knowledgeReviewAfterDate, knowledgeReviewMaxAgeDays } from "@/lib/knowledge/freshness";
import { isOfficialKnowledgeSource } from "@/lib/knowledge/official-source";

export const PGVECTOR_EMBEDDING_MODEL = "Xenova/multilingual-e5-small";
export const PGVECTOR_EMBEDDING_DIM = 384;

export interface PgvectorIngestResult {
  documentsCreated: number;
  documentsUpdated: number;
  chunksCreated: number;
  chunksUpdated: number;
  chunksDeleted: number;
}

export interface PgvectorEmbeddingResult {
  totalChunks: number;
  embeddedChunks: number;
  skippedChunks: number;
  failedChunks: number;
}

export interface PgvectorEmbeddingOptions {
  force?: boolean;
  batchSize?: number;
  reviewStatuses?: LegalReviewStatus[];
  candidateOnly?: boolean;
}

export interface PgvectorSearchResult {
  doc: KnowledgeDoc;
  score: number;
  vectorScore: number;
  keywordScore: number;
  matchedKeywords: string[];
  method: "pgvector";
  chunkId: string;
  rrf: number;
  vectorRank: number | null;
  keywordRank: number | null;
}

type SearchRow = {
  chunk_id: string;
  doc_id: string;
  title: string;
  content: string;
  source_url: string;
  source_type: string;
  language: string;
  topic: KnowledgeDoc["category"];
  valid_from: Date;
  valid_to: Date | null;
  last_checked_at: Date;
  checked_by: string;
  review_status: "APPROVED" | "PENDING" | "REJECTED";
  superseded_by: string | null;
  chunk_index: number;
  content_hash: string;
  embedding_model_out: string | null;
  embedding_dim_out: number | null;
  rrf: number;
  vector_rank: number | null;
  keyword_rank: number | null;
  vector_score: number | null;
  keyword_score: number | null;
};

type ChunkForEmbedding = {
  id: string;
  content: string;
  contentHash: string;
  document: {
    title: string;
    sourceUrl: string;
    docId: string;
  };
};

export function shouldUsePgvector(): boolean {
  return getRuntimeDatabaseInfo().postgresqlConfigured;
}

function hashText(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function inputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function toDate(value: string | null | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function legalReviewStatusFromRagStatus(status: string): "PENDING" | "APPROVED" | "REJECTED" {
  if (status === "approved") return "APPROVED";
  if (status === "deprecated") return "REJECTED";
  return "PENDING";
}

function reviewFieldsFromMetadata(meta: RagDocumentMetadata, fallbackDate: Date) {
  return {
    lastCheckedAt: toDate(meta.last_checked_at, fallbackDate),
    checkedBy: meta.checked_by,
    reviewStatus: legalReviewStatusFromRagStatus(meta.review_status),
  };
}

function sameLangText(value: string) {
  return { ko: value, vi: value, mn: value, en: value };
}

function staticDocContent(doc: KnowledgeDoc): string {
  return (["ko", "en", "vi", "mn"] as Lang[])
    .map((lang) => `# ${pickLangText(doc.title, lang)}\n${pickLangText(doc.content, lang)}`)
    .join("\n\n");
}

function splitKnowledgeChunks(content: string, maxChars = 1200): string[] {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return [content.trim()].filter(Boolean);

  const chunks: string[] = [];
  let current = "";
  for (const paragraph of paragraphs) {
    const next = [current, paragraph].filter(Boolean).join("\n\n");
    if (next.length > maxChars && current) {
      chunks.push(current.trim());
      current = paragraph;
    } else {
      current = next;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks.flatMap((chunk) => {
    if (chunk.length <= maxChars) return [chunk];
    const parts: string[] = [];
    for (let i = 0; i < chunk.length; i += maxChars) parts.push(chunk.slice(i, i + maxChars));
    return parts;
  });
}

function vectorLiteral(vector: EmbeddingVector | number[]): string {
  const values = Array.from(vector);
  if (values.length !== PGVECTOR_EMBEDDING_DIM) {
    throw new Error(`Expected ${PGVECTOR_EMBEDDING_DIM}d embedding, got ${values.length}`);
  }
  return `[${values.map((value) => Number(value).toFixed(8)).join(",")}]`;
}

function searchableTextForEmbedding(input: { title: string; content: string; docId?: string; sourceUrl?: string }): string {
  // multilingual-e5 expects symmetric "passage: " / "query: " prefixes.
  // Curated keywords live in the tsv-only keywords column, not the vector axis.
  return `passage: ${[input.title, input.content, input.docId || "", input.sourceUrl || ""].filter(Boolean).join("\n\n")}`;
}

async function clearChunkEmbedding(chunkId: string): Promise<void> {
  await db.$executeRaw`
    UPDATE "KnowledgeChunk"
    SET embedding = NULL,
        "embeddingJson" = NULL,
        "embeddingModel" = NULL,
        "embeddingDim" = NULL
    WHERE id = ${chunkId}
  `;
}

async function writeChunkEmbedding(chunk: ChunkForEmbedding, vector: EmbeddingVector): Promise<void> {
  const literal = vectorLiteral(vector);
  await db.$executeRawUnsafe(
    `UPDATE "KnowledgeChunk"
     SET embedding = $1::vector,
         "embeddingJson" = $2::jsonb,
         "embeddingModel" = $3,
         "embeddingDim" = $4
     WHERE id = $5`,
    literal,
    JSON.stringify(Array.from(vector)),
    PGVECTOR_EMBEDDING_MODEL,
    PGVECTOR_EMBEDDING_DIM,
    chunk.id
  );
}

export async function ingestStaticKnowledgeDocsForPgvector(): Promise<PgvectorIngestResult> {
  const result: PgvectorIngestResult = {
    documentsCreated: 0,
    documentsUpdated: 0,
    chunksCreated: 0,
    chunksUpdated: 0,
    chunksDeleted: 0,
  };
  const now = new Date();
  const docs = getKnowledgeDocsWithMetadata({ referenceDate: now });

  for (const doc of docs) {
    const meta = getRagDocumentMetadata(doc, "ko");
    const title = pickLangText(doc.title, "ko");
    const content = staticDocContent(doc);
    const chunks = splitKnowledgeChunks(content);
    const chunkKeywords = doc.keywords.join(", ");
    const existing = await db.knowledgeDocument.findUnique({
      where: { docId: doc.id },
      include: { chunks: { orderBy: { chunkIndex: "asc" } } },
    });
    const metadataReview = reviewFieldsFromMetadata(meta, now);
    const reviewFields =
      existing && existing.checkedBy !== metadataReview.checkedBy
        ? {
            lastCheckedAt: existing.lastCheckedAt,
            checkedBy: existing.checkedBy,
            reviewStatus: existing.reviewStatus,
          }
        : metadataReview;

    const saved = await db.knowledgeDocument.upsert({
      where: { docId: doc.id },
      update: {
        title,
        sourceUrl: meta.source_url,
        sourceType: meta.source_type,
        language: "ko",
        jurisdiction: meta.jurisdiction,
        topic: meta.topic,
        validFrom: toDate(meta.valid_from, now),
        validTo: meta.valid_to ? toDate(meta.valid_to, now) : null,
        ...reviewFields,
        supersedes: inputJson(meta.supersedes),
        supersededBy: meta.superseded_by,
      },
      create: {
        docId: doc.id,
        title,
        sourceUrl: meta.source_url,
        sourceType: meta.source_type,
        language: "ko",
        jurisdiction: meta.jurisdiction,
        topic: meta.topic,
        validFrom: toDate(meta.valid_from, now),
        validTo: meta.valid_to ? toDate(meta.valid_to, now) : null,
        ...metadataReview,
        supersedes: inputJson(meta.supersedes),
        supersededBy: meta.superseded_by,
      },
    });
    if (existing) result.documentsUpdated++;
    else result.documentsCreated++;

    const existingByIndex = new Map((existing?.chunks || []).map((chunk) => [chunk.chunkIndex, chunk]));
    for (const [chunkIndex, chunkContent] of chunks.entries()) {
      const contentHash = hashText(chunkContent);
      const current = existingByIndex.get(chunkIndex);
      if (!current) {
        await db.knowledgeChunk.create({
          data: {
            documentId: saved.id,
            chunkIndex,
            content: chunkContent,
            contentHash,
            keywords: chunkKeywords,
          },
        });
        result.chunksCreated++;
        continue;
      }

      if (current.contentHash !== contentHash || current.content !== chunkContent || current.keywords !== chunkKeywords) {
        await db.knowledgeChunk.update({
          where: { id: current.id },
          data: {
            content: chunkContent,
            contentHash,
            keywords: chunkKeywords,
          },
        });
        await clearChunkEmbedding(current.id);
        result.chunksUpdated++;
      }
    }

    const staleChunks = (existing?.chunks || []).filter((chunk) => chunk.chunkIndex >= chunks.length);
    if (staleChunks.length > 0) {
      await db.knowledgeChunk.deleteMany({ where: { id: { in: staleChunks.map((chunk) => chunk.id) } } });
      result.chunksDeleted += staleChunks.length;
    }
  }

  return result;
}

export async function embedMissingKnowledgeChunksForPgvector(options: PgvectorEmbeddingOptions = {}): Promise<PgvectorEmbeddingResult> {
  const batchSize = options.batchSize ?? 8;
  const reviewStatuses = options.reviewStatuses?.length ? options.reviewStatuses : [LegalReviewStatus.APPROVED];
  const documentWhere = {
    reviewStatus: { in: reviewStatuses },
    ...(options.candidateOnly ? { docId: { contains: "__candidate__" } } : {}),
  };
  const where = options.force
    ? {
        document: documentWhere,
      }
    : {
        document: documentWhere,
        OR: [
          { embeddingModel: null },
          { embeddingDim: null },
          { embeddingModel: { not: PGVECTOR_EMBEDDING_MODEL } },
          { embeddingDim: { not: PGVECTOR_EMBEDDING_DIM } },
        ],
      };

  const chunks = await db.knowledgeChunk.findMany({
    where,
    include: {
      document: {
        select: { title: true, sourceUrl: true, docId: true },
      },
    },
    orderBy: [{ document: { docId: "asc" } }, { chunkIndex: "asc" }],
  });

  const result: PgvectorEmbeddingResult = {
    totalChunks: chunks.length,
    embeddedChunks: 0,
    skippedChunks: 0,
    failedChunks: 0,
  };

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const texts = batch.map((chunk) =>
      searchableTextForEmbedding({
        title: chunk.document.title,
        content: chunk.content,
        docId: chunk.document.docId,
        sourceUrl: chunk.document.sourceUrl,
      })
    );

    try {
      const embedded = await embedBatch(texts);
      if (embedded.method !== "transformer") {
        throw new Error("pgvector ingestion requires transformer embeddings; TF-IDF fallback is not persisted");
      }
      for (const [index, vector] of embedded.vectors.entries()) {
        await writeChunkEmbedding(batch[index], vector);
        result.embeddedChunks++;
      }
    } catch (error) {
      result.failedChunks += batch.length;
      console.error(`[pgvector-rag] embedding batch failed at offset ${i}:`, error);
    }
  }

  return result;
}

async function expandQueryWithSynonyms(query: string): Promise<string> {
  const synonyms = await db.synonym.findMany({
    where: { enabled: true },
    select: { source: true, targets: true },
  });
  const parts = [query];
  for (const synonym of synonyms) {
    if (!query.includes(synonym.source)) continue;
    try {
      const targets = JSON.parse(synonym.targets);
      if (Array.isArray(targets)) parts.push(...targets.filter((item): item is string => typeof item === "string"));
    } catch {
      // Ignore malformed synonym rows; admin validation handles cleanup.
    }
  }
  return Array.from(new Set(parts.flatMap((part) => part.split(/\s+/)).filter(Boolean))).join(" ");
}

// Longest-first so compound particles strip before their single-char suffixes.
const KO_PARTICLES = [
  "에게서", "으로서", "으로써", "에서는", "에서도", "이라는",
  "까지", "부터", "에게", "에서", "으로", "이나", "라도", "조차", "마저", "밖에", "처럼", "보다", "한테", "라는", "하고", "들이", "들을", "들은", "이면", "라면",
  "는", "은", "이", "가", "을", "를", "에", "의", "와", "과", "도", "나", "로", "만", "요",
];

function stripKoreanParticle(token: string): string {
  if (!/[가-힣]$/.test(token)) return token;
  for (const particle of KO_PARTICLES) {
    if (token.length - particle.length >= 2 && token.endsWith(particle)) {
      return token.slice(0, token.length - particle.length);
    }
  }
  return token;
}

// The SQL function expects a prebuilt to_tsquery('simple', ...) string.
// OR + prefix semantics: raw prose under AND semantics matched almost nothing
// (the 'simple' config keeps stopwords), silently disabling the keyword axis.
function buildKeywordTsquery(expandedQuery: string): string {
  const compactVisaCodes = Array.from(
    expandedQuery.toLowerCase().matchAll(/\b([a-z])[-\s]?(\d{1,2})(?:-\d+)?\b/g),
    (match) => `${match[1]}${match[2]}`,
  );
  const tokens = expandedQuery
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 2)
    .map(stripKoreanParticle)
    .filter((token) => token.length >= 2);
  return Array.from(new Set([...tokens, ...compactVisaCodes]))
    .map((token) => `${token}:*`)
    .join(" | ");
}

function dateOnly(value: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function metadataFromRow(row: SearchRow): RagDocumentMetadata {
  return {
    doc_id: row.doc_id,
    title: row.title,
    source_url: row.source_url,
    source_type: row.source_type as RagDocumentMetadata["source_type"],
    language: "ko",
    jurisdiction: "KR",
    topic: row.topic,
    valid_from: dateOnly(row.valid_from) || "1970-01-01",
    valid_to: dateOnly(row.valid_to),
    last_checked_at: dateOnly(row.last_checked_at) || "1970-01-01",
    checked_by: row.checked_by,
    review_status: row.review_status === "APPROVED" ? "approved" : row.review_status === "REJECTED" ? "deprecated" : "needs_review",
    supersedes: [],
    superseded_by: row.superseded_by,
    review_after: dateOnly(knowledgeReviewAfterDate(row.last_checked_at)) || "1970-01-01",
    source_label: row.source_url.includes("law.go.kr")
      ? "국가법령정보센터"
      : row.source_url.includes("hikorea.go.kr")
        ? "하이코리아"
        : row.source_url.includes("studyinkorea")
          ? "Study in Korea"
          : row.title,
    owner: isOfficialKnowledgeSource({
      sourceType: row.source_type,
      sourceUrl: row.source_url,
    }) ? "official" : "internal",
  };
}

function docFromRow(row: SearchRow): KnowledgeDoc {
  const text = row.content || row.title;
  return {
    id: row.doc_id,
    category: row.topic,
    title: sameLangText(row.title),
    keywords: [row.doc_id, row.title, row.topic, row.source_url].flatMap((value) =>
      value
        .toLowerCase()
        .split(/[\s/.:_-]+/)
        .filter((item) => item.length > 1)
    ),
    content: sameLangText(text),
    source: row.source_url,
    ragMeta: metadataFromRow(row),
  };
}

export async function searchPgvectorKnowledge(query: string, options: { topK?: number; languages?: string[] } = {}): Promise<PgvectorSearchResult[]> {
  if (!query.trim()) return [];
  if (getEmbedDim() !== PGVECTOR_EMBEDDING_DIM) {
    throw new Error(`Embedder dim ${getEmbedDim()} does not match pgvector dim ${PGVECTOR_EMBEDDING_DIM}`);
  }

  const expandedQuery = await expandQueryWithSynonyms(query);
  const embedded = await embedText(`query: ${query}`);
  if (embedded.method !== "transformer") {
    throw new Error("pgvector search requires transformer query embedding");
  }

  const topK = options.topK ?? 5;
  const rows = await db.$queryRawUnsafe<SearchRow[]>(
    `SELECT *
     FROM kaxi_hybrid_knowledge_search(
       $1::vector,
       $2,
       $3::text[],
       $4::int,
       40,
       40,
       $5,
       $6::int,
       $7::int
     )`,
    vectorLiteral(embedded.vector),
    buildKeywordTsquery(expandedQuery),
    options.languages || ["ko"],
    topK * 4,
    PGVECTOR_EMBEDDING_MODEL,
    PGVECTOR_EMBEDDING_DIM,
    knowledgeReviewMaxAgeDays()
  );

  // Chunk-level ranking can surface several chunks of the same document;
  // keep only the best-ranked chunk per document so topK spans distinct docs.
  const bestPerDoc = new Map<string, SearchRow>();
  for (const row of rows) {
    const existing = bestPerDoc.get(row.doc_id);
    if (!existing || row.rrf > existing.rrf) bestPerDoc.set(row.doc_id, row);
  }
  const dedupedRows = [...bestPerDoc.values()].sort((a, b) => b.rrf - a.rrf).slice(0, topK);

  return dedupedRows.map((row) => ({
    doc: docFromRow(row),
    score: row.rrf,
    vectorScore: row.vector_score ?? 0,
    keywordScore: row.keyword_score ?? 0,
    matchedKeywords: [],
    method: "pgvector",
    chunkId: row.chunk_id,
    rrf: row.rrf,
    vectorRank: row.vector_rank,
    keywordRank: row.keyword_rank,
  }));
}

export async function getPgvectorStats() {
  const [chunkStats] = await db.$queryRaw<
    Array<{
      total_chunks: bigint;
      embedded_chunks: bigint;
      approved_embedded_chunks: bigint;
      approved_documents: bigint;
    }>
  >`
    SELECT
      count(*)::bigint AS total_chunks,
      count(*) FILTER (WHERE c.embedding IS NOT NULL)::bigint AS embedded_chunks,
      count(*) FILTER (WHERE c.embedding IS NOT NULL AND d."reviewStatus" = 'APPROVED')::bigint AS approved_embedded_chunks,
      count(DISTINCT d.id) FILTER (WHERE d."reviewStatus" = 'APPROVED')::bigint AS approved_documents
    FROM "KnowledgeChunk" c
    JOIN "KnowledgeDocument" d ON d.id = c."documentId"
  `;

  return {
    totalChunks: Number(chunkStats?.total_chunks || 0),
    embeddedChunks: Number(chunkStats?.embedded_chunks || 0),
    approvedEmbeddedChunks: Number(chunkStats?.approved_embedded_chunks || 0),
    approvedDocuments: Number(chunkStats?.approved_documents || 0),
    embeddingModel: PGVECTOR_EMBEDDING_MODEL,
    embeddingDim: PGVECTOR_EMBEDDING_DIM,
    transformerRuntime: getTransformerRuntimeInfo(),
  };
}
