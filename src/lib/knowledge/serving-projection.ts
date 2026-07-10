import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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
};

type ServingRow = {
  canonical_chunk_id: string | null;
  content_hash: string | null;
  embedding_model: string | null;
  status: string;
};

export interface RagServingProjectionStatus {
  checkedAt: string;
  eligibleDocuments: number;
  eligibleChunks: number;
  readyChunks: number;
  pendingChunks: number;
  quarantinedChunks: number;
  legacyChunks: number;
  citationReadyChunks: number;
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
      "id,documentId,chunkIndex,content,contentHash,keywords",
    ),
    loadAllRows<ServingRow>(
      supabase,
      "rag_serving_chunks",
      "canonical_chunk_id,content_hash,embedding_model,status",
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
      .filter((row) => row.status === "ready" && row.embedding_model === "text-embedding-3-small")
      .map((row) => `${row.canonical_chunk_id}:${row.content_hash}`),
  );
  const eligibleDocumentById = new Map(data.eligibleDocuments.map((document) => [document.id, document]));
  const readyChunks = data.chunks.filter((chunk) => readyKeys.has(`${chunk.id}:${chunk.contentHash}`)).length;
  const citationReadyChunks = data.chunks.filter((chunk) => {
    const document = eligibleDocumentById.get(chunk.documentId);
    return Boolean(document?.sourceUrl.startsWith("https://") && document.lastCheckedAt && document.checkedBy);
  }).length;

  return {
    checkedAt: new Date().toISOString(),
    eligibleDocuments: data.eligibleDocuments.length,
    eligibleChunks: data.chunks.length,
    readyChunks,
    pendingChunks: Math.max(0, data.chunks.length - readyChunks),
    quarantinedChunks: data.servingRows.filter((row) => row.status === "quarantined").length,
    legacyChunks: data.legacyChunks,
    citationReadyChunks,
  };
}

export async function syncRagServingProjection(options: { limit?: number; force?: boolean } = {}) {
  const data = await loadProjectionData();
  const limit = Math.min(Math.max(options.limit || 10, 1), 50);
  const documentById = new Map(data.eligibleDocuments.map((document) => [document.id, document]));
  const readyKeys = new Set(
    data.servingRows
      .filter((row) => row.status === "ready" && row.embedding_model === "text-embedding-3-small")
      .map((row) => `${row.canonical_chunk_id}:${row.content_hash}`),
  );
  const targets = data.chunks
    .filter((chunk) => options.force || !readyKeys.has(`${chunk.id}:${chunk.contentHash}`))
    .sort((left, right) => left.documentId.localeCompare(right.documentId) || left.chunkIndex - right.chunkIndex)
    .slice(0, limit);

  const results: Array<{ chunkId: string; ok: boolean; status?: number }> = [];
  for (const chunk of targets) {
    const document = documentById.get(chunk.documentId);
    if (!document) continue;
    const payload = {
      title: document.title,
      source: document.sourceType,
      source_url: document.sourceUrl,
      category: document.topic,
      tenant_id: "default",
      last_checked_at: document.lastCheckedAt,
      checked_by: document.checkedBy,
      keywords: chunk.keywords,
      content: chunk.content,
      canonical_chunk_id: chunk.id,
      canonical_document_id: document.id,
      doc_id: document.docId,
      content_hash: chunk.contentHash,
      embedding_model: "text-embedding-3-small",
      review_status: "approved",
    };
    const signed = signN8nPayload("rag-ingestion", payload);
    const response = await fetch(signed.url, {
      method: "POST",
      headers: signed.headers,
      body: signed.body,
      signal: AbortSignal.timeout(40_000),
    });
    results.push({ chunkId: chunk.id, ok: response.ok, status: response.status });
  }

  await data.supabase.rpc("kaxi_refresh_rag_serving_status");
  return {
    attempted: results.length,
    succeeded: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok),
    status: await getRagServingProjectionStatus(),
  };
}
