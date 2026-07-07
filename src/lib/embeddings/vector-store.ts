// Transformer 기반 Vector Store
// - 1차: multilingual-e5-small (384차원 의미 임베딩)
// - 폴백: TF-IDF vectorizer.ts (vocabulary 기반 희소 벡터)
// 하이브리드 검색 (transformer + keyword) 지원

import {
  getKnowledgeDocsWithMetadata,
  getKnowledgeSourceAudit,
  type KnowledgeDoc,
} from "../data/knowledge";
import { createHash } from "crypto";
import type { Lang } from "../i18n/translations";
import {
  fitVectorizer,
  vectorize as tfidfVectorize,
  cosineSimilarity as tfidfCosine,
  multilingualText,
  type Vectorizer as TFIDFVectorizer,
} from "./vectorizer";
import {
  embedText,
  embedBatch,
  cosineSim,
  isTransformerAvailable,
  getTransformerRuntimeInfo,
  type EmbeddingVector,
} from "./transformer-embedder";
import { searchPgvectorKnowledge, shouldUsePgvector } from "./pgvector-rag";
import * as fs from "fs";
import * as path from "path";

export interface ScoredDoc {
  doc: KnowledgeDoc;
  score: number;
  vectorScore: number;
  keywordScore: number;
  matchedKeywords: string[];
  method: "pgvector" | "transformer" | "tfidf";
}

interface VectorStore {
  docs: KnowledgeDoc[];
  tfidfVectorizer: TFIDFVectorizer | null;
  tfidfDocVectors: number[][];
  transformerDocVectors: EmbeddingVector[]; // 384-dim normalized
  docIds: string[];
  reviewDateKey: string;
  sourceKey: string;
  knowledgeSource: "db" | "static" | "mixed";
  ready: boolean;
  method: "transformer" | "tfidf" | "mixed";
}

let store: VectorStore = {
  docs: [],
  tfidfVectorizer: null,
  tfidfDocVectors: [],
  transformerDocVectors: [],
  docIds: [],
  reviewDateKey: "",
  sourceKey: "",
  knowledgeSource: "static",
  ready: false,
  method: "tfidf",
};

const CACHE_FILE =
  process.env.VECTOR_CACHE_FILE ||
  path.join(process.cwd(), "data", "vector-store", "embeddings-cache.json");

function vectorCacheLocation(): "custom" | "project-data" {
  return process.env.VECTOR_CACHE_FILE?.trim() ? "custom" : "project-data";
}

function sanitizeDiagnosticText(value: unknown): string {
  const text = (value instanceof Error ? value.message : String(value)).slice(0, 240);
  const cwd = process.cwd();
  const home = process.env.HOME;
  return text
    .replaceAll(cwd, "<project>")
    .replaceAll(home || "__no_home__", "<home>");
}

function getVectorCacheDiagnostics() {
  try {
    if (!fs.existsSync(CACHE_FILE)) {
      return {
        configured: Boolean(process.env.VECTOR_CACHE_FILE?.trim()),
        location: vectorCacheLocation(),
        exists: false,
        bytes: 0,
        entries: 0,
      };
    }

    const stat = fs.statSync(CACHE_FILE);
    const parsed = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    const entries = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? Object.keys(parsed).length
      : 0;
    return {
      configured: Boolean(process.env.VECTOR_CACHE_FILE?.trim()),
      location: vectorCacheLocation(),
      exists: true,
      bytes: stat.size,
      entries,
    };
  } catch (error) {
    return {
      configured: Boolean(process.env.VECTOR_CACHE_FILE?.trim()),
      location: vectorCacheLocation(),
      exists: false,
      bytes: 0,
      entries: 0,
      error: sanitizeDiagnosticText(error),
    };
  }
}

function embeddingCacheKey(doc: KnowledgeDoc): string {
  const text = multilingualText({
    title: doc.title,
    content: doc.content,
    keywords: doc.keywords,
  });
  const digest = createHash("sha256").update(text).digest("hex").slice(0, 16);
  return `${doc.id}:${digest}`;
}

function reviewDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function searchableDocs(): KnowledgeDoc[] {
  return getKnowledgeDocsWithMetadata().map(({ sourceMeta: _sourceMeta, ...doc }) => doc);
}

function buildStoreFromDocs(
  docs: KnowledgeDoc[],
  sourceKey: string,
  knowledgeSource: VectorStore["knowledgeSource"],
  currentReviewDateKey = reviewDateKey()
): void {
  const docTexts = docs.map((d) =>
    multilingualText({
      title: d.title,
      content: d.content,
      keywords: d.keywords,
    })
  );
  const tfidfVectorizer = fitVectorizer(docTexts);
  const tfidfDocVectors = docTexts.map((t) => tfidfVectorize(t, tfidfVectorizer));

  store = {
    ...store,
    docs,
    tfidfVectorizer,
    tfidfDocVectors,
    transformerDocVectors: [],
    docIds: docs.map((d) => d.id),
    reviewDateKey: currentReviewDateKey,
    sourceKey,
    knowledgeSource,
    ready: true,
    method: "tfidf",
  };

  console.log(
    `[VectorStore] TF-IDF ready: ${store.docIds.length} docs, source=${knowledgeSource}, dim=${tfidfVectorizer.dim}`
  );
}

async function refreshRuntimeKnowledgeDocs(): Promise<void> {
  const currentReviewDateKey = reviewDateKey();
  const mode = process.env.KNOWLEDGE_RAG_SOURCE || "governed";
  if (mode === "static") {
    if (!store.ready || store.reviewDateKey !== currentReviewDateKey || store.knowledgeSource !== "static") {
      buildStoreFromDocs(searchableDocs(), `static:${currentReviewDateKey}`, "static", currentReviewDateKey);
    }
    return;
  }

  try {
    const { getProductionKnowledgeDocsForRag } = await import("../knowledge/repository");
    const production = await getProductionKnowledgeDocsForRag({ referenceDate: new Date(), mode });
    const sourceKey = `${currentReviewDateKey}:${production.signature}`;
    if (!store.ready || store.sourceKey !== sourceKey) {
      buildStoreFromDocs(production.docs, sourceKey, production.source, currentReviewDateKey);
    }
  } catch (err) {
    const error = err as { code?: string; meta?: { modelName?: string; table?: string }; message?: string };
    if (error.code === "P2021" && (error.meta?.modelName === "KnowledgeDocument" || error.meta?.table?.includes("KnowledgeDocument"))) {
      console.warn("[VectorStore] Knowledge governance table unavailable, using static fallback");
    } else {
      console.error("[VectorStore] Knowledge governance load failed, using static fallback:", err);
    }
    if (!store.ready || store.reviewDateKey !== currentReviewDateKey) {
      buildStoreFromDocs(searchableDocs(), `static-fallback:${currentReviewDateKey}`, "static", currentReviewDateKey);
    }
  }
}

// 다국어 결합 텍스트에서 각 언어별로 분리 (transformer용)
// transformer는 다국어를 이해하므로 한 언어당 임베딩 → 평균
function multilingualChunks(doc: KnowledgeDoc): string[] {
  return [
    `${doc.title.ko} ${doc.content.ko}`,
    `${doc.title.en} ${doc.content.en}`,
    `${doc.title.vi} ${doc.content.vi}`,
    `${doc.title.mn} ${doc.content.mn}`,
  ];
}

// 문서 임베딩 (4개 언어 평균)
async function embedDoc(doc: KnowledgeDoc): Promise<EmbeddingVector> {
  const chunks = multilingualChunks(doc);
  const { vectors } = await embedBatch(chunks);
  // 4개 언어 벡터 평균
  const dim = vectors[0].length;
  const avg = new Float32Array(dim);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) {
      avg[i] += v[i];
    }
  }
  // L2 정규화
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += avg[i] * avg[i];
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < dim; i++) avg[i] /= norm;
  return avg;
}

// 캐시에서 로드
function loadCache(): Record<string, number[]> | null {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("[VectorStore] Cache load error:", e);
  }
  return null;
}

// 캐시에 저장
function saveCache(cache: Record<string, number[]>): void {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
    console.log(`[VectorStore] Cache saved: ${Object.keys(cache).length} embeddings`);
  } catch (e) {
    console.error("[VectorStore] Cache save error:", e);
  }
}

// 동기 초기화 (TF-IDF만 — transformer는 async init 필요)
export function initVectorStore(): void {
  const currentReviewDateKey = reviewDateKey();
  if (store.ready && store.reviewDateKey === currentReviewDateKey && store.knowledgeSource === "static") return;

  const docs = searchableDocs();
  buildStoreFromDocs(docs, `static:${currentReviewDateKey}`, "static", currentReviewDateKey);
}

// 비동기 초기화 (Transformer 모델 로드 + 문서 임베딩)
export async function initTransformerStore(): Promise<void> {
  await refreshRuntimeKnowledgeDocs();
  if (store.method === "transformer" || store.method === "mixed") return;

  if (!store.ready) initVectorStore(); // TF-IDF 먼저 초기화 (폴백 보장)

  if (!isTransformerAvailable()) {
    console.log("[VectorStore] Transformer unavailable, using TF-IDF only");
    return;
  }

  // 캐시 확인
  const cache = loadCache();
  const cachedVectors: Record<string, EmbeddingVector> = {};

  if (cache) {
    for (const doc of store.docs) {
      const cacheKey = embeddingCacheKey(doc);
      if (cache[cacheKey]) {
        cachedVectors[doc.id] = new Float32Array(cache[cacheKey]);
      }
    }
    console.log(`[VectorStore] Cache hit: ${Object.keys(cachedVectors).length}/${store.docs.length}`);
  }

  // 캐시 안된 문서 임베딩
  const newCache: Record<string, number[]> = {};
  let allSuccess = true;

  for (const doc of store.docs) {
    const cacheKey = embeddingCacheKey(doc);
    if (cachedVectors[doc.id]) continue;

    try {
      console.log(`[VectorStore] Embedding: ${doc.id}`);
      const vec = await embedDoc(doc);
      cachedVectors[doc.id] = vec;
      newCache[cacheKey] = Array.from(vec);
    } catch (e) {
      console.error(`[VectorStore] Embed failed for ${doc.id}:`, e);
      allSuccess = false;
    }
  }

  for (const doc of store.docs) {
    const cacheKey = embeddingCacheKey(doc);
    if (!newCache[cacheKey] && cachedVectors[doc.id]) {
      newCache[cacheKey] = Array.from(cachedVectors[doc.id]);
    }
  }

  // 캐시 저장
  if (Object.keys(newCache).length > (cache ? Object.keys(cache).length : 0)) {
    saveCache(newCache);
  } else if (cache && Object.keys(cache).some((key) => !newCache[key])) {
    saveCache(newCache);
  }

  // transformerDocVectors 구성 (검색 대상 문서 순서대로)
  const transformerDocVectors: EmbeddingVector[] = [];
  let transformerCoverage = 0;
  for (const doc of store.docs) {
    if (cachedVectors[doc.id]) {
      transformerDocVectors.push(cachedVectors[doc.id]);
      transformerCoverage++;
    } else {
      // 빈 벡터로 채움 (해당 문서는 TF-IDF로만 검색)
      transformerDocVectors.push(new Float32Array(384));
    }
  }

  store = {
    ...store,
    transformerDocVectors,
    method: transformerCoverage === store.docs.length ? "transformer" : "mixed",
  };

  console.log(
    `[VectorStore] Transformer ready: ${transformerCoverage}/${store.docs.length} docs embedded, method=${store.method}`
  );
}

// 키워드 매칭 점수
function keywordScore(query: string, doc: KnowledgeDoc): { score: number; matched: string[] } {
  const q = query.toLowerCase().trim();
  if (!q) return { score: 0, matched: [] };

  let score = 0;
  const matched: string[] = [];
  const words = q.split(/\s+/);

  for (const keyword of doc.keywords) {
    if (q.includes(keyword.toLowerCase())) {
      score += 3;
      matched.push(keyword);
      continue;
    }
    for (const w of words) {
      if (w.length > 2 && keyword.toLowerCase().includes(w)) {
        score += 1;
        if (!matched.includes(keyword)) matched.push(keyword);
      }
    }
  }

  for (const lang of ["ko", "vi", "mn", "en"] as Lang[]) {
    const title = doc.title[lang].toLowerCase();
    for (const w of words) {
      if (w.length > 2 && title.includes(w)) {
        score += 2;
      }
    }
  }

  return { score, matched };
}

// 동의어 사전 (DB에서 동적 로드 + 캐싱)
// fallback: DB 사용 불가시 하드코딩된 최소 동의어 사용
const FALLBACK_SYNONYMS: Record<string, string[]> = {
  "돈": ["비용", "cost"],
  "얼마": ["비용", "cost"],
  "거절": ["refusal", "보장"],
  "학교": ["대학", "school"],
  "어학당": ["언어", "language"],
  "서류": ["documents", "hồ sơ"],
  "허위": ["fake", "거짓"],
};

// 캐시된 동의어 (DB에서 로드, 5분 캐싱)
let cachedSynonyms: Record<string, string[]> | null = null;
let synonymCacheTime = 0;
const SYNONYM_CACHE_TTL = 5 * 60 * 1000; // 5분

// DB에서 활성화된 동의어 로드
async function loadSynonymsFromDB(): Promise<Record<string, string[]>> {
  try {
    // 동적 import — server-side only
    const { db } = await import("../db");
    const synonyms = await db.synonym.findMany({
      where: { enabled: true },
      select: { source: true, targets: true },
    });
    const map: Record<string, string[]> = {};
    for (const s of synonyms) {
      try {
        map[s.source] = JSON.parse(s.targets);
      } catch {}
    }
    console.log(`[VectorStore] Loaded ${Object.keys(map).length} synonyms from DB`);
    return map;
  } catch (e) {
    console.error("[VectorStore] Synonym DB load failed, using fallback:", e);
    return FALLBACK_SYNONYMS;
  }
}

async function getSynonyms(): Promise<Record<string, string[]>> {
  const now = Date.now();
  if (cachedSynonyms && now - synonymCacheTime < SYNONYM_CACHE_TTL) {
    return cachedSynonyms;
  }
  cachedSynonyms = await loadSynonymsFromDB();
  synonymCacheTime = now;
  return cachedSynonyms;
}

// 동의어 캐시 무효화 (관리자가 동의어 변경시 호출 가능)
export function invalidateSynonymCache(): void {
  cachedSynonyms = null;
  synonymCacheTime = 0;
}

async function expandSynonyms(query: string): Promise<string> {
  const synonyms = await getSynonyms();
  let expanded = query;
  for (const [key, syns] of Object.entries(synonyms)) {
    if (query.includes(key)) {
      expanded += " " + syns.join(" ");
    }
  }
  return expanded;
}

// 하이브리드 검색 (비동기 — Transformer 사용시)
export async function hybridSearch(
  query: string,
  options: {
    topK?: number;
    vectorWeight?: number;
    keywordWeight?: number;
    useTransformer?: boolean;
  } = {}
): Promise<ScoredDoc[]> {
  const topK = options.topK ?? 3;
  const vectorWeight = options.vectorWeight ?? 1.2;
  const keywordWeight = options.keywordWeight ?? 0.6;
  const useTransformer = options.useTransformer ?? true;

  if (!query.trim()) return [];
  if (shouldUsePgvector() && useTransformer) {
    try {
      const results = await searchPgvectorKnowledge(query, { topK });
      return results.map((result) => ({
        doc: result.doc,
        score: result.score,
        vectorScore: result.vectorScore,
        keywordScore: result.keywordScore,
        matchedKeywords: result.matchedKeywords,
        method: "pgvector",
      }));
    } catch (error) {
      // pgvector 검색은 transformer 질의 임베딩이 필요하다. 오프라인/제한
      // 런타임에서는 기존 인메모리(TF-IDF 폴백 포함) 경로로 강등한다.
      console.warn(
        `[vector-store] pgvector search unavailable, falling back to in-memory store: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  await refreshRuntimeKnowledgeDocs();

  // Transformer 사용 가능시 비동기 초기화
  if (useTransformer && isTransformerAvailable() && store.method === "tfidf") {
    await initTransformerStore();
  }

  // 동의어 확장 (DB에서 동적 로드)
  const expandedQuery = await expandSynonyms(query);

  // 쿼리 임베딩 (transformer 또는 TF-IDF)
  let queryVec: EmbeddingVector;
  let method: "transformer" | "tfidf" = "tfidf";

  if (useTransformer && (store.method === "transformer" || store.method === "mixed")) {
    try {
      const result = await embedText(query, { vectorizer: store.tfidfVectorizer! });
      queryVec = result.vector;
      method = result.method;
    } catch {
      // 폴백: TF-IDF만 사용
      queryVec = new Float32Array(tfidfVectorize(expandedQuery, store.tfidfVectorizer!));
      method = "tfidf";
    }
  } else {
    queryVec = new Float32Array(tfidfVectorize(expandedQuery, store.tfidfVectorizer!));
    method = "tfidf";
  }

  // 각 문서에 대해 점수 계산
  const scored: ScoredDoc[] = store.docs.map((doc, i) => {
    // 벡터 점수
    let vScore: number;
    if (method === "transformer" && store.transformerDocVectors[i]) {
      vScore = cosineSim(queryVec, store.transformerDocVectors[i]);
    } else {
      // TF-IDF 폴백
      vScore = tfidfCosine(
        Array.from(queryVec),
        store.tfidfDocVectors[i]
      );
    }

    // 키워드 점수
    const { score: kScore, matched } = keywordScore(query, doc);
    const kScoreNorm = kScore > 0 ? Math.log(1 + kScore) / Math.log(20) : 0;

    const combined = vScore * vectorWeight + kScoreNorm * keywordWeight;

    return {
      doc,
      score: combined,
      vectorScore: vScore,
      keywordScore: kScore,
      matchedKeywords: matched,
      method,
    };
  });

  return scored
    .filter((s) => s.score > 0.03)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// 디버그용
export function getStoreStats() {
  const sourceAudit = getKnowledgeSourceAudit();
  return {
    ready: store.ready,
    pgvectorConfigured: shouldUsePgvector(),
    docCount: store.docIds.length,
    totalKnowledgeDocs: sourceAudit.totalDocs,
    expiredDocCount: sourceAudit.expiredDocs.length,
    method: store.method,
    knowledgeSource: store.knowledgeSource,
    sourceKey: store.sourceKey,
    transformerAvailable: isTransformerAvailable(),
    tfidfDim: store.tfidfVectorizer?.dim ?? 0,
    transformerDim: store.transformerDocVectors[0]?.length ?? 0,
    transformerCoverage: store.transformerDocVectors.filter(
      (v) => v.length > 0 && v.some((x) => x !== 0)
    ).length,
    transformerRuntime: getTransformerRuntimeInfo(),
    vectorCache: getVectorCacheDiagnostics(),
  };
}
