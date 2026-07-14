import { randomUUID } from "crypto";
import { inferChatCategory, type ChatCategory } from "@/lib/chat/category";
import {
  searchServingRagDocuments,
  type ServingRagSearchResult,
} from "@/lib/chat/direct-lexical-fallback";
import { createRagQueryEmbedding } from "@/lib/chat/query-embedding";
import type { KnowledgeDoc, RagDocumentMetadata } from "@/lib/data/knowledge";
import type { Lang } from "@/lib/i18n/translations";

const KNOWLEDGE_CATEGORIES = new Set<KnowledgeDoc["category"]>([
  "visa",
  "cost",
  "documents",
  "school",
  "legal",
  "process",
  "warning",
]);

export type SharedOpenAiRagResult = {
  docs: KnowledgeDoc[];
  search: ServingRagSearchResult;
  retrieval: {
    backend: "openai-pgvector";
    runtimePath: string;
    pgvectorUsed: true;
    resultCount: number;
    embeddingProvider: unknown;
    embeddingModel: unknown;
    embeddingDimensions: unknown;
    retrievalMode: unknown;
    vectorSearchAvailable: unknown;
    categoryMode: unknown;
    locale: Lang;
    provenance: ServingRagSearchResult["provenance"];
  };
};

export function sharedOpenAiRagRuntimeInfo(env: NodeJS.ProcessEnv = process.env) {
  const embeddingConfigured = Boolean(
    env.OPENAI_EMBEDDING_API_KEY?.trim()
    || (env.KAXI_QUERY_EMBEDDINGS_USE_OPENAI_KEY === "true" && env.OPENAI_API_KEY?.trim()),
  );
  const supabaseConfigured = Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL?.trim() && env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
  return {
    ready: embeddingConfigured && supabaseConfigured,
    method: "openai-pgvector",
    embeddingConfigured,
    supabaseConfigured,
    embeddingModel: "text-embedding-3-small",
    embeddingDimensions: 1536,
    vectorFunction: "match_rag_documents_hybrid_v3",
    fallbackEnabled: false,
  };
}

function category(value: string): KnowledgeDoc["category"] {
  return KNOWLEDGE_CATEGORIES.has(value as KnowledgeDoc["category"])
    ? value as KnowledgeDoc["category"]
    : "process";
}

function sourceType(sourceUrl: string): RagDocumentMetadata["source_type"] {
  return sourceUrl.includes("law.go.kr") ? "official_law" : "official_government";
}

function reviewAfter(checkedAt: string) {
  const date = new Date(checkedAt);
  if (Number.isNaN(date.getTime())) return checkedAt.slice(0, 10);
  date.setUTCDate(date.getUTCDate() + 180);
  return date.toISOString().slice(0, 10);
}

function sameLangText(value: string) {
  return { ko: value, vi: value, mn: value, en: value };
}

function toKnowledgeDoc(
  document: ServingRagSearchResult["documents"][number],
  locale: Lang,
): KnowledgeDoc {
  const checkedAt = document.checkedAt.slice(0, 10);
  return {
    id: document.id,
    category: category(document.category),
    title: sameLangText(document.title),
    content: sameLangText(document.content),
    keywords: Array.from(new Set(
      `${document.id} ${document.title} ${document.category}`
        .toLowerCase()
        .split(/[\s/.:_-]+/u)
        .filter((token) => token.length > 1),
    )),
    source: document.source,
    ragMeta: {
      doc_id: document.id,
      title: document.title,
      source_url: document.sourceUrl,
      source_type: sourceType(document.sourceUrl),
      language: locale,
      jurisdiction: "KR",
      topic: category(document.category),
      valid_from: checkedAt,
      valid_to: null,
      last_checked_at: checkedAt,
      checked_by: document.checkedBy,
      review_status: "approved",
      supersedes: [],
      superseded_by: null,
      review_after: reviewAfter(document.checkedAt),
      source_label: document.source,
      owner: "official",
    },
  };
}

export async function searchSharedOpenAiRag(input: {
  query: string;
  locale: Lang;
  category?: ChatCategory;
  tenantId?: string;
  maxDocuments?: number;
}): Promise<SharedOpenAiRagResult> {
  const resolvedCategory = input.category || inferChatCategory(input.query);
  const search = await searchServingRagDocuments({
    question: input.query,
    retrievalQuery: input.query,
    category: resolvedCategory,
    locale: input.locale,
    tenantId: input.tenantId || "default",
    requestId: randomUUID(),
    fallbackReason: "shared_openai_rag",
    allowStoredVectorExpansion: false,
    requireOpenAiEmbedding: true,
    maxDocuments: input.maxDocuments || 6,
  }, {
    createEmbedding: createRagQueryEmbedding,
  });
  const meta = search.searchMeta;
  const docs = search.documents.map((document) => toKnowledgeDoc(document, input.locale));

  return {
    docs,
    search,
    retrieval: {
      backend: "openai-pgvector",
      runtimePath: search.runtimePath,
      pgvectorUsed: true,
      resultCount: docs.length,
      embeddingProvider: meta.embeddingProvider,
      embeddingModel: meta.embeddingModel,
      embeddingDimensions: meta.embeddingDimensions,
      retrievalMode: meta.retrievalMode,
      vectorSearchAvailable: meta.vectorSearchAvailable,
      categoryMode: meta.categoryMode,
      locale: input.locale,
      provenance: search.provenance,
    },
  };
}
