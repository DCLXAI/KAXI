import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  CANONICAL_QUERY_EMBEDDING_DIMENSIONS,
  createRagQueryEmbedding,
  isOpenAiQueryEmbedding,
  RAG_QUERY_EMBEDDING_DIMENSIONS,
  RAG_QUERY_EMBEDDING_MODEL,
} from "@/lib/chat/query-embedding";
import { signN8nPayload } from "@/lib/n8n/signature";

type CanonicalDocument = {
  id: string;
  docId: string;
  title: string;
  sourceUrl: string;
  sourceType: string;
  language: string;
  topic: string;
  validFrom: string;
  validTo: string | null;
  lastCheckedAt: string;
  checkedBy: string;
  reviewStatus: string;
  supersededBy: string | null;
};

type CanonicalChunk = {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  contentHash: string;
  keywords: string;
  embedding?: unknown;
};

type ServingRow = {
  id?: number;
  embedding?: unknown;
  canonical_chunk_id: string | null;
  content_hash: string | null;
  embedding_model: string | null;
  status: string;
};

type ProjectionWriteResult = {
  chunkId: string;
  ok: boolean;
  status?: number;
  writer?: "n8n" | "kaxi-direct-recovery";
  embeddingStatus?: "ready";
  error?: string;
};

export interface RagServingProjectionStatus {
  checkedAt: string;
  eligibleDocuments: number;
  eligibleChunks: number;
  readyChunks: number;
  vectorReadyChunks: number;
  canonicalVectorReadyChunks: number;
  lexicalOnlyReadyChunks: number;
  pendingChunks: number;
  quarantinedChunks: number;
  legacyChunks: number;
  citationReadyChunks: number;
  expectedEmbeddingModel: string;
  expectedEmbeddingDimensions: number;
  fallbackEmbeddingDimensions: number;
  vectorCoverage: number;
  cutoverReady: boolean;
  dualIndexReady: boolean;
}

function configured(value: string | undefined) {
  const result = value?.trim() || "";
  return !result || /^(replace-with-|change_me)/i.test(result) ? "" : result;
}

function serviceClient() {
  const url = configured(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = configured(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_NOT_CONFIGURED");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function findServingRow(
  supabase: SupabaseClient,
  chunk: Pick<CanonicalChunk, "id" | "contentHash">,
) {
  const result = await supabase
    .from("rag_serving_chunks")
    .select("id,status,canonical_chunk_id,content_hash,embedding_model,embedding")
    .eq("canonical_chunk_id", chunk.id)
    .eq("content_hash", chunk.contentHash)
    .eq("embedding_model", RAG_QUERY_EMBEDDING_MODEL)
    .maybeSingle();
  if (result.error) throw result.error;
  return result.data as ServingRow | null;
}

async function waitForServingRow(
  supabase: SupabaseClient,
  chunk: Pick<CanonicalChunk, "id" | "contentHash">,
) {
  for (const waitMs of [0, 500, 1_000]) {
    if (waitMs) await delay(waitMs);
    const row = await findServingRow(supabase, chunk);
    if (row?.status === "ready" && row.embedding) return row;
  }
  return null;
}

async function writeDirectRecoveryProjection(input: {
  supabase: SupabaseClient;
  document: CanonicalDocument;
  chunk: CanonicalChunk;
  payload: Record<string, unknown>;
}) {
  const embedding = await createRagQueryEmbedding(input.chunk.content);
  const vectorReady = isOpenAiQueryEmbedding(embedding);
  if (!vectorReady) {
    throw new Error(`OPENAI_SERVING_EMBEDDING_UNAVAILABLE: ${embedding.failureReason || embedding.status}`);
  }

  const metadata = {
    ...input.payload,
    language: input.document.language,
    projection_writer: "kaxi-direct-recovery",
    projected_at: new Date().toISOString(),
    embedding_provider: embedding.provider,
    embedding_status: "ready",
    embedding_failure_reason: null,
  };
  const vector = `[${(embedding.vector as number[]).join(",")}]`;
  const existing = await findServingRow(input.supabase, input.chunk);
  const write = existing?.id
    ? input.supabase
        .from("rag_serving_chunks")
        .update({
          content: input.chunk.content,
          metadata,
          embedding: vector,
          status: "ready",
          indexed_at: new Date().toISOString(),
          quarantined_at: null,
        })
        .eq("id", existing.id)
    : input.supabase.from("rag_serving_chunks").insert({
        content: input.chunk.content,
        metadata,
        embedding: vector,
        status: "ready",
      });
  const result = await write;
  if (result.error) throw result.error;

  const persisted = await findServingRow(input.supabase, input.chunk);
  if (persisted?.status !== "ready") throw new Error("direct_projection_not_persisted");
  return "ready" as const;
}

async function loadAllRows<T>(supabase: SupabaseClient, table: string, columns: string): Promise<T[]> {
  const pageSize = 1_000;
  const rows: T[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const result = await supabase.from(table).select(columns).range(offset, offset + pageSize - 1);
    if (result.error) throw result.error;
    const page = (result.data || []) as T[];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

function eligibleDocument(document: CanonicalDocument, now: Date) {
  const validFrom = new Date(document.validFrom);
  const validTo = document.validTo ? new Date(document.validTo) : null;
  const checkedAt = new Date(document.lastCheckedAt);
  const cutoff = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  return (
    document.reviewStatus === "APPROVED" &&
    !document.supersededBy &&
    validFrom <= now &&
    (!validTo || validTo > now) &&
    checkedAt >= cutoff
  );
}

async function loadProjectionData() {
  const supabase = serviceClient();
  const [documents, chunks, servingRows, legacyResult] = await Promise.all([
    loadAllRows<CanonicalDocument>(
      supabase,
      "KnowledgeDocument",
      "id,docId,title,sourceUrl,sourceType,language,topic,validFrom,validTo,lastCheckedAt,checkedBy,reviewStatus,supersededBy",
    ),
    loadAllRows<CanonicalChunk>(
      supabase,
      "KnowledgeChunk",
      "id,documentId,chunkIndex,content,contentHash,keywords,embedding",
    ),
    loadAllRows<ServingRow>(
      supabase,
      "rag_serving_chunks",
      "canonical_chunk_id,content_hash,embedding_model,embedding,status",
    ),
    supabase.from("knowledge_chunks").select("id", { count: "exact", head: true }),
  ]);
  if (legacyResult.error) throw legacyResult.error;

  const now = new Date();
  const eligibleDocuments = documents.filter((document) => eligibleDocument(document, now));
  const eligibleDocumentIds = new Set(eligibleDocuments.map((document) => document.id));
  const eligibleChunks = chunks.filter((chunk) =>
    eligibleDocumentIds.has(chunk.documentId),
  );
  return {
    supabase,
    eligibleDocuments,
    chunks: eligibleChunks,
    servingRows,
    legacyChunks: legacyResult.count || 0,
  };
}

export async function getRagServingProjectionStatus(): Promise<RagServingProjectionStatus> {
  const data = await loadProjectionData();
  const readyKeys = new Set(
    data.servingRows
      .filter((row) => row.status === "ready" && row.embedding_model === RAG_QUERY_EMBEDDING_MODEL)
      .map((row) => `${row.canonical_chunk_id}:${row.content_hash}`),
  );
  const eligibleDocumentById = new Map(data.eligibleDocuments.map((document) => [document.id, document]));
  const readyChunks = data.chunks.filter((chunk) => readyKeys.has(`${chunk.id}:${chunk.contentHash}`)).length;
  const vectorReadyKeys = new Set(
    data.servingRows
      .filter((row) => row.status === "ready" && row.embedding_model === RAG_QUERY_EMBEDDING_MODEL && row.embedding)
      .map((row) => `${row.canonical_chunk_id}:${row.content_hash}`),
  );
  const vectorReadyChunks = data.chunks.filter((chunk) => vectorReadyKeys.has(`${chunk.id}:${chunk.contentHash}`)).length;
  const canonicalVectorReadyChunks = data.chunks.filter((chunk) => Boolean(chunk.embedding)).length;
  const citationReadyChunks = data.chunks.filter((chunk) => {
    const document = eligibleDocumentById.get(chunk.documentId);
    return Boolean(document?.sourceUrl.startsWith("https://") && document.lastCheckedAt && document.checkedBy);
  }).length;

  const cutoverReady = data.chunks.length > 0
    && vectorReadyChunks === data.chunks.length
    && citationReadyChunks === data.chunks.length
    && data.legacyChunks === 0;
  const dualIndexReady = cutoverReady && canonicalVectorReadyChunks === data.chunks.length;

  return {
    checkedAt: new Date().toISOString(),
    eligibleDocuments: data.eligibleDocuments.length,
    eligibleChunks: data.chunks.length,
    readyChunks,
    vectorReadyChunks,
    canonicalVectorReadyChunks,
    lexicalOnlyReadyChunks: Math.max(0, readyChunks - vectorReadyChunks),
    pendingChunks: Math.max(0, data.chunks.length - readyChunks),
    quarantinedChunks: data.servingRows.filter((row) => row.status === "quarantined").length,
    legacyChunks: data.legacyChunks,
    citationReadyChunks,
    expectedEmbeddingModel: RAG_QUERY_EMBEDDING_MODEL,
    expectedEmbeddingDimensions: RAG_QUERY_EMBEDDING_DIMENSIONS,
    fallbackEmbeddingDimensions: CANONICAL_QUERY_EMBEDDING_DIMENSIONS,
    vectorCoverage: data.chunks.length > 0 ? vectorReadyChunks / data.chunks.length : 0,
    cutoverReady,
    dualIndexReady,
  };
}

export async function syncRagServingProjection(options: { limit?: number; force?: boolean } = {}) {
  const data = await loadProjectionData();
  const limit = Math.min(Math.max(options.limit || 10, 1), 50);
  const documentById = new Map(data.eligibleDocuments.map((document) => [document.id, document]));
  const vectorReadyKeys = new Set(
    data.servingRows
      .filter((row) => row.status === "ready" && row.embedding_model === RAG_QUERY_EMBEDDING_MODEL && row.embedding)
      .map((row) => `${row.canonical_chunk_id}:${row.content_hash}`),
  );
  const targets = data.chunks
    .filter((chunk) => options.force || !vectorReadyKeys.has(`${chunk.id}:${chunk.contentHash}`))
    .sort((left, right) => left.documentId.localeCompare(right.documentId) || left.chunkIndex - right.chunkIndex)
    .slice(0, limit);

  const results: ProjectionWriteResult[] = [];
  for (const chunk of targets) {
    const document = documentById.get(chunk.documentId);
    if (!document) continue;
    const payload = {
      title: document.title,
      source: document.sourceType,
      source_url: document.sourceUrl,
      category: document.topic,
      language: document.language,
      tenant_id: "default",
      last_checked_at: document.lastCheckedAt,
      checked_by: document.checkedBy,
      keywords: chunk.keywords,
      content: chunk.content,
      canonical_chunk_id: chunk.id,
      canonical_document_id: document.id,
      doc_id: document.docId,
      content_hash: chunk.contentHash,
      embedding_model: RAG_QUERY_EMBEDDING_MODEL,
      review_status: "approved",
    };
    let responseStatus: number | undefined;
    try {
      const signed = signN8nPayload("rag-ingestion", payload);
      const response = await fetch(signed.url, {
        method: "POST",
        headers: signed.headers,
        body: signed.body,
        signal: AbortSignal.timeout(40_000),
      });
      responseStatus = response.status;
      const n8nRow = response.ok ? await waitForServingRow(data.supabase, chunk) : null;
      if (n8nRow) {
        results.push({ chunkId: chunk.id, ok: true, status: response.status, writer: "n8n" });
        continue;
      }

      const embeddingStatus = await writeDirectRecoveryProjection({
        supabase: data.supabase,
        document,
        chunk,
        payload,
      });
      results.push({
        chunkId: chunk.id,
        ok: true,
        status: response.status,
        writer: "kaxi-direct-recovery",
        embeddingStatus,
      });
    } catch (error) {
      results.push({
        chunkId: chunk.id,
        ok: false,
        status: responseStatus,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await data.supabase.rpc("kaxi_refresh_rag_serving_status");
  return {
    attempted: results.length,
    succeeded: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok),
    writers: {
      n8n: results.filter((result) => result.writer === "n8n").length,
      directRecovery: results.filter((result) => result.writer === "kaxi-direct-recovery").length,
    },
    status: await getRagServingProjectionStatus(),
  };
}
