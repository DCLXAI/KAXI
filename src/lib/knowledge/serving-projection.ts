import { createHash } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  CANONICAL_QUERY_EMBEDDING_DIMENSIONS,
  createRagQueryEmbedding,
  isOpenAiQueryEmbedding,
  RAG_QUERY_EMBEDDING_DIMENSIONS,
  RAG_QUERY_EMBEDDING_MODEL,
} from "@/lib/chat/query-embedding";
import { signN8nPayload } from "@/lib/n8n/signature";
import { resolveProvidedChunkEmbedding } from "@/lib/n8n/provided-query-embedding";

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
  metadata?: Record<string, unknown> | null;
};

type RagEmbeddingLocale = "ko" | "en" | "vi" | "mn";

export const RAG_SERVING_EMBEDDING_CONTENT_STRATEGY = "single-locale-v1";

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
  embeddingContentStrategy: string;
  outdatedEmbeddingChunks: number;
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

function normalizeEmbeddingLocale(value: string): RagEmbeddingLocale | null {
  const aliases: Record<string, RagEmbeddingLocale> = {
    ko: "ko", kr: "ko", "ko-kr": "ko",
    en: "en", "en-us": "en", "en-gb": "en",
    vi: "vi", vn: "vi", "vi-vn": "vi",
    mn: "mn", "mn-mn": "mn",
  };
  return aliases[value.trim().toLowerCase()] || null;
}

function detectEmbeddingLocale(value: string): RagEmbeddingLocale | null {
  if (/[가-힣ㄱ-ㅎㅏ-ㅣ]/u.test(value)) return "ko";
  if (/[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/iu.test(value)) return "vi";
  if (/[А-Яа-яЁёӨөҮү]/u.test(value)) return "mn";
  if (/[a-z]/iu.test(value)) return "en";
  return null;
}

export function extractRagEmbeddingLocaleSection(value: string, requestedLocale: string) {
  const locale = normalizeEmbeddingLocale(requestedLocale);
  if (!locale) return null;
  const sections: Array<{ heading: string; content: string }> = [];
  let heading = "";
  let lines: string[] = [];
  const flush = () => {
    const content = lines.join("\n").trim();
    if (content) sections.push({ heading, content });
  };
  for (const line of value.split(/\r?\n/u)) {
    const match = line.match(/^#{1,6}\s+(.+)$/u);
    if (match) {
      flush();
      heading = match[1].trim();
      lines = [line];
    } else {
      lines.push(line);
    }
  }
  flush();

  const matching = sections
    .filter((section) => (detectEmbeddingLocale(section.heading) || detectEmbeddingLocale(section.content)) === locale)
    .map((section) => section.content);
  return matching.length > 0 ? matching.join("\n\n").trim() : null;
}

export function buildRagServingEmbeddingProjection(input: {
  content: string;
  documentLanguage: string;
}) {
  const preferredLocale = normalizeEmbeddingLocale(input.documentLanguage) || "ko";
  const localeOrder: RagEmbeddingLocale[] = [
    preferredLocale,
    ...(["ko", "en", "vi", "mn"] as RagEmbeddingLocale[]).filter((locale) => locale !== preferredLocale),
  ];
  for (const locale of localeOrder) {
    const content = extractRagEmbeddingLocaleSection(input.content, locale);
    if (!content) continue;
    return {
      content,
      locale,
      contentHash: createHash("sha256").update(content).digest("hex"),
      strategy: RAG_SERVING_EMBEDDING_CONTENT_STRATEGY,
    };
  }
  throw new Error("RAG_EMBEDDING_LOCALE_SECTION_MISSING");
}

function servingRowProjectionMetadataMatches(row: ServingRow | null, projection: ReturnType<typeof buildRagServingEmbeddingProjection>) {
  if (!row) return false;
  return row.metadata?.embedding_content_strategy === projection.strategy
    && row.metadata?.embedding_content_locale === projection.locale
    && row.metadata?.embedding_content_hash === projection.contentHash;
}

function servingRowMatchesProjection(row: ServingRow | null, projection: ReturnType<typeof buildRagServingEmbeddingProjection>) {
  return row?.status === "ready"
    && Boolean(row.embedding)
    && servingRowProjectionMetadataMatches(row, projection);
}

async function findServingRow(
  supabase: SupabaseClient,
  chunk: Pick<CanonicalChunk, "id" | "contentHash">,
) {
  const result = await supabase
    .from("rag_serving_chunks")
    .select("id,status,canonical_chunk_id,content_hash,embedding_model,embedding,metadata")
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
  projection: ReturnType<typeof buildRagServingEmbeddingProjection>,
) {
  for (const waitMs of [0, 500, 1_000]) {
    if (waitMs) await delay(waitMs);
    const row = await findServingRow(supabase, chunk);
    if (servingRowMatchesProjection(row, projection)) return row;
  }
  return null;
}

async function writeDirectRecoveryProjection(input: {
  supabase: SupabaseClient;
  document: CanonicalDocument;
  chunk: CanonicalChunk;
  payload: Record<string, unknown>;
  writer?: "kaxi-direct-recovery" | "kaxi-n8n-orchestrated";
  providedEmbedding?: unknown;
  providedContentHash?: string;
}) {
  const projection = buildRagServingEmbeddingProjection({
    content: input.chunk.content,
    documentLanguage: input.document.language,
  });
  const provided = resolveProvidedChunkEmbedding({
    value: input.providedEmbedding,
    providedContentHash: input.providedContentHash || "",
    expectedContentHash: projection.contentHash,
  });
  const embedding = provided.embedding ?? await createRagQueryEmbedding(projection.content);
  const vectorReady = isOpenAiQueryEmbedding(embedding);
  if (!vectorReady) {
    throw new Error(`OPENAI_SERVING_EMBEDDING_UNAVAILABLE: ${embedding.failureReason || embedding.status}`);
  }

  const metadata = {
    ...input.payload,
    language: input.document.language,
    projection_writer: input.writer || "kaxi-direct-recovery",
    projected_at: new Date().toISOString(),
    embedding_provider: embedding.provider,
    embedding_status: "ready",
    embedding_failure_reason: null,
    // Distinct from the query-time `embedding_source` key that
    // match_rag_documents_hybrid_v3 right-biased-merges over stored metadata.
    ingest_embedding_source: provided.embeddingSource,
    ingest_embedding_rejected_reason: provided.rejectedReason,
    embedding_content_strategy: projection.strategy,
    embedding_content_locale: projection.locale,
    embedding_content_hash: projection.contentHash,
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
  return {
    embeddingStatus: "ready" as const,
    embeddingSource: provided.embeddingSource,
    embeddingRejectedReason: provided.rejectedReason,
  };
}

function payloadText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function ingestRagServingPayload(
  payload: Record<string, unknown>,
  options: { providedEmbedding?: unknown } = {},
) {
  const canonicalChunkId = payloadText(payload.canonical_chunk_id, 160);
  const canonicalDocumentId = payloadText(payload.canonical_document_id, 160);
  const externalDocumentId = payloadText(payload.doc_id, 240);
  const contentHash = payloadText(payload.content_hash, 128);
  const tenantId = payloadText(payload.tenant_id, 120) || "default";
  const reviewStatus = payloadText(payload.review_status, 40).toLowerCase();
  const embeddingModel = payloadText(payload.embedding_model, 120);
  if (
    !canonicalChunkId
    || !canonicalDocumentId
    || !externalDocumentId
    || !contentHash
    || tenantId !== "default"
    || reviewStatus !== "approved"
    || embeddingModel !== RAG_QUERY_EMBEDDING_MODEL
  ) {
    throw new Error("RAG_INGESTION_PAYLOAD_INVALID");
  }

  const supabase = serviceClient();
  const [documentResult, chunkResult] = await Promise.all([
    supabase
      .from("KnowledgeDocument")
      .select("id,docId,title,sourceUrl,sourceType,language,topic,validFrom,validTo,lastCheckedAt,checkedBy,reviewStatus,supersededBy")
      .eq("id", canonicalDocumentId)
      .eq("docId", externalDocumentId)
      .maybeSingle(),
    supabase
      .from("KnowledgeChunk")
      .select("id,documentId,chunkIndex,content,contentHash,keywords,embedding")
      .eq("id", canonicalChunkId)
      .eq("documentId", canonicalDocumentId)
      .eq("contentHash", contentHash)
      .maybeSingle(),
  ]);
  if (documentResult.error) throw documentResult.error;
  if (chunkResult.error) throw chunkResult.error;

  const document = documentResult.data as CanonicalDocument | null;
  const chunk = chunkResult.data as CanonicalChunk | null;
  if (!document || !chunk || !eligibleDocument(document, new Date())) {
    throw new Error("RAG_INGESTION_SOURCE_NOT_ELIGIBLE");
  }

  const governedPayload = {
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
  const projected = await writeDirectRecoveryProjection({
    supabase,
    document,
    chunk,
    payload: governedPayload,
    writer: "kaxi-n8n-orchestrated",
    providedEmbedding: options.providedEmbedding,
    providedContentHash: payloadText(payload.embedding_content_hash, 128),
  });
  const refresh = await supabase.rpc("kaxi_refresh_rag_serving_status");
  if (refresh.error) throw refresh.error;

  return {
    ok: true,
    status: "ready",
    writer: "kaxi-n8n-orchestrated" as const,
    canonicalChunkId: chunk.id,
    canonicalDocumentId: document.id,
    embeddingModel: RAG_QUERY_EMBEDDING_MODEL,
    dimensions: RAG_QUERY_EMBEDDING_DIMENSIONS,
    embeddingContentStrategy: RAG_SERVING_EMBEDDING_CONTENT_STRATEGY,
    embeddingSource: projected.embeddingSource,
    embeddingRejectedReason: projected.embeddingRejectedReason,
  };
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
      "canonical_chunk_id,content_hash,embedding_model,embedding,status,metadata",
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
  const eligibleDocumentById = new Map(data.eligibleDocuments.map((document) => [document.id, document]));
  const servingRowByChunk = new Map(
    data.servingRows.map((row) => [`${row.canonical_chunk_id}:${row.content_hash}`, row]),
  );
  const projectionState = data.chunks.map((chunk) => {
    const document = eligibleDocumentById.get(chunk.documentId);
    const row = servingRowByChunk.get(`${chunk.id}:${chunk.contentHash}`) || null;
    if (!document) return { row, projection: null };
    try {
      return {
        row,
        projection: buildRagServingEmbeddingProjection({
          content: chunk.content,
          documentLanguage: document.language,
        }),
      };
    } catch {
      return { row, projection: null };
    }
  });
  const readyChunks = projectionState.filter(({ row, projection }) =>
    projection
    && row?.status === "ready"
    && row.embedding_model === RAG_QUERY_EMBEDDING_MODEL
    && servingRowProjectionMetadataMatches(row, projection)
  ).length;
  const vectorReadyChunks = projectionState.filter(({ row, projection }) =>
    projection
    && row?.embedding_model === RAG_QUERY_EMBEDDING_MODEL
    && servingRowMatchesProjection(row, projection)
  ).length;
  const outdatedEmbeddingChunks = projectionState.filter(({ row, projection }) =>
    Boolean(row) && (!projection || !servingRowProjectionMetadataMatches(row, projection))
  ).length;
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
    embeddingContentStrategy: RAG_SERVING_EMBEDDING_CONTENT_STRATEGY,
    outdatedEmbeddingChunks,
  };
}

export async function syncRagServingProjection(options: { limit?: number; force?: boolean } = {}) {
  const data = await loadProjectionData();
  const limit = Math.min(Math.max(options.limit || 10, 1), 50);
  const documentById = new Map(data.eligibleDocuments.map((document) => [document.id, document]));
  const servingRowByChunk = new Map(
    data.servingRows.map((row) => [`${row.canonical_chunk_id}:${row.content_hash}`, row]),
  );
  const targets = data.chunks
    .filter((chunk) => {
      if (options.force) return true;
      const document = documentById.get(chunk.documentId);
      if (!document) return false;
      const projection = buildRagServingEmbeddingProjection({
        content: chunk.content,
        documentLanguage: document.language,
      });
      return !servingRowMatchesProjection(
        servingRowByChunk.get(`${chunk.id}:${chunk.contentHash}`) || null,
        projection,
      );
    })
    .sort((left, right) => left.documentId.localeCompare(right.documentId) || left.chunkIndex - right.chunkIndex)
    .slice(0, limit);

  const processChunk = async (chunk: CanonicalChunk): Promise<ProjectionWriteResult> => {
    let responseStatus: number | undefined;
    let n8nError: string | undefined;
    try {
      const document = documentById.get(chunk.documentId);
      if (!document) throw new Error("canonical_document_not_found");
      const projection = buildRagServingEmbeddingProjection({
        content: chunk.content,
        documentLanguage: document.language,
      });
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
        embedding_content_strategy: projection.strategy,
        embedding_content_locale: projection.locale,
        embedding_content_hash: projection.contentHash,
        review_status: "approved",
      };
      try {
        // n8n cannot compute the single-locale projection (core logic we must
        // not fork), so the exact text to embed travels inside the signed
        // payload; embedding_content_hash (already in `payload`) binds it.
        const signed = signN8nPayload("rag-ingestion", { ...payload, embedding_content: projection.content });
        const response = await fetch(signed.url, {
          method: "POST",
          headers: signed.headers,
          body: signed.body,
          signal: AbortSignal.timeout(40_000),
        });
        responseStatus = response.status;
        const n8nRow = response.ok ? await waitForServingRow(data.supabase, chunk, projection) : null;
        if (n8nRow) return { chunkId: chunk.id, ok: true, status: response.status, writer: "n8n" };
        n8nError = `n8n_ingestion_http_${response.status}`;
      } catch (error) {
        n8nError = error instanceof Error ? error.message : String(error);
      }

      const recovered = await writeDirectRecoveryProjection({
        supabase: data.supabase,
        document,
        chunk,
        payload,
      });
      return {
        chunkId: chunk.id,
        ok: true,
        status: responseStatus,
        writer: "kaxi-direct-recovery",
        embeddingStatus: recovered.embeddingStatus,
      };
    } catch (error) {
      return {
        chunkId: chunk.id,
        ok: false,
        status: responseStatus,
        error: [
          n8nError ? `n8n=${n8nError}` : "",
          `direct=${error instanceof Error ? error.message : String(error)}`,
        ].filter(Boolean).join("; "),
      };
    }
  };

  const results: ProjectionWriteResult[] = [];
  const concurrency = 5;
  for (let offset = 0; offset < targets.length; offset += concurrency) {
    results.push(...await Promise.all(targets.slice(offset, offset + concurrency).map(processChunk)));
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
