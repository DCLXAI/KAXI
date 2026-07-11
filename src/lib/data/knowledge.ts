// KAXI RAG 지식 베이스
// 공식 출처: 한국유학종합시스템(Study in Korea)·교육부·법무부·법제처
// 각 문서는 {ko, vi, mn, en} 다국어 텍스트를 가짐
// 간단한 키워드 기반 retrieval + LLM 답변 생성

import type { Lang } from "../i18n/translations";
import { isOfficialKnowledgeSource } from "../knowledge/official-source";
import {
  SOURCE_METADATA,
  DEFAULT_VERIFIED_AT,
  DEFAULT_VALID_FROM,
  DEFAULT_CHECKED_BY,
} from "./source-metadata";
import { KNOWLEDGE_DOCS } from "./knowledge-corpus";
import type {
  KnowledgeDoc,
  SourceMetadata,
  SourceType,
  ReviewStatus,
  ResolvedSourceMetadata,
  KnowledgeDocWithMetadata,
  RagDocumentMetadata,
} from "./knowledge-types";

function inferSourceType(source: string, meta: SourceMetadata): SourceType {
  if (meta.owner === "internal") {
    return source.includes("안전") ? "internal_policy" : "internal_analysis";
  }
  const explicitLawSource =
    meta.url.includes("law.go.kr") ||
    /제\d+조/.test(source) ||
    ["출입국관리법", "직업안정법", "형법", "행정사법"].some((name) => source.includes(name));
  if (explicitLawSource) return "official_law";
  return "official_government";
}

function resolveSourceMetadata(source: string, meta: SourceMetadata): ResolvedSourceMetadata {
  return {
    ...meta,
    sourceType: meta.sourceType || inferSourceType(source, meta),
    jurisdiction: meta.jurisdiction || (meta.owner === "internal" ? "KAXI" : "KR"),
    validFrom: meta.validFrom || DEFAULT_VALID_FROM,
    validTo: meta.validTo ?? null,
    checkedBy: meta.checkedBy || DEFAULT_CHECKED_BY,
    reviewStatus: meta.reviewStatus || "approved",
    supersedes: meta.supersedes || [],
    supersededBy: meta.supersededBy ?? null,
  };
}

export function getSourceMetadata(source: string): ResolvedSourceMetadata {
  const meta = SOURCE_METADATA[source] ?? {
    label: source,
    url: "internal://kaxi/unregistered-source",
    verifiedAt: "1970-01-01",
    reviewAfter: "1970-01-01",
    owner: "internal",
  };
  return resolveSourceMetadata(source, meta);
}

export function hasRegisteredSourceMetadata(source: string): boolean {
  return Object.prototype.hasOwnProperty.call(SOURCE_METADATA, source);
}

function dateAtStartOfDay(value: Date | string): number {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function isSourceReviewCurrent(
  source: string,
  referenceDate: Date = new Date()
): boolean {
  if (!hasRegisteredSourceMetadata(source)) return false;
  const meta = getSourceMetadata(source);
  const reference = dateAtStartOfDay(referenceDate);
  if (meta.reviewStatus !== "approved") return false;
  if (meta.supersededBy) return false;
  if (dateAtStartOfDay(meta.validFrom) > reference) return false;
  if (meta.validTo && dateAtStartOfDay(meta.validTo) < reference) return false;
  return dateAtStartOfDay(meta.reviewAfter) >= reference;
}

export function getRagDocumentMetadata(doc: KnowledgeDoc, lang: Lang): RagDocumentMetadata {
  if (doc.ragMeta) {
    return {
      ...doc.ragMeta,
      title: pickLangText(doc.title, lang),
      language: lang,
      topic: doc.category,
      owner: isOfficialKnowledgeSource({
        sourceType: doc.ragMeta.source_type,
        sourceUrl: doc.ragMeta.source_url,
      }) ? "official" : "internal",
    };
  }

  const meta = getSourceMetadata(doc.source);
  const owner = isOfficialKnowledgeSource({
    sourceType: meta.sourceType,
    sourceUrl: meta.url,
  }) ? "official" : "internal";
  return {
    doc_id: doc.id,
    title: pickLangText(doc.title, lang),
    source_url: meta.url,
    source_type: meta.sourceType,
    language: lang,
    jurisdiction: meta.jurisdiction,
    topic: doc.category,
    valid_from: meta.validFrom,
    valid_to: meta.validTo,
    last_checked_at: meta.verifiedAt,
    checked_by: meta.checkedBy,
    review_status: meta.reviewStatus,
    supersedes: meta.supersedes,
    superseded_by: meta.supersededBy,
    review_after: meta.reviewAfter,
    source_label: meta.label,
    owner,
  };
}

export function getEffectiveSourceMetadata(doc: KnowledgeDoc, lang: Lang): ResolvedSourceMetadata {
  const meta = getRagDocumentMetadata(doc, lang);
  return {
    label: meta.source_label,
    url: meta.source_url,
    verifiedAt: meta.last_checked_at,
    reviewAfter: meta.review_after,
    owner: meta.owner,
    sourceType: meta.source_type,
    jurisdiction: meta.jurisdiction,
    validFrom: meta.valid_from,
    validTo: meta.valid_to,
    checkedBy: meta.checked_by,
    reviewStatus: meta.review_status,
    supersedes: meta.supersedes,
    supersededBy: meta.superseded_by,
  };
}

function compactSourceLabel(label: string): string {
  if (/hikorea|하이코리아/i.test(label)) return "하이코리아";
  if (/study in korea|한국유학종합시스템/i.test(label)) return "Study in Korea";
  if (/법무부|출입국/i.test(label)) return "법무부";
  if (/교육부/i.test(label)) return "교육부";
  if (/국가법령|법제처/i.test(label)) return "국가법령정보센터";
  if (/topik|국립국제교육원/i.test(label)) return "국립국제교육원/TOPIK";
  if (/kaxi/i.test(label)) return "KAXI";
  return label;
}

function earliestDate(values: string[]): string {
  return values
    .filter(Boolean)
    .sort((a, b) => dateAtStartOfDay(a) - dateAtStartOfDay(b))[0] || DEFAULT_VERIFIED_AT;
}

export function buildRagBasisNoticeFromMetadata(
  lang: Lang,
  metas: RagDocumentMetadata[]
): string {
  if (metas.length === 0) return "";
  const checkedAt = earliestDate(metas.map((meta) => meta.last_checked_at));
  const officialMetas = metas.filter((meta) => meta.owner === "official");
  const sourceLabels = Array.from(
    new Set((officialMetas.length > 0 ? officialMetas : metas).map((meta) => compactSourceLabel(meta.source_label)))
  ).slice(0, 4);
  const sourceText = sourceLabels.join(" / ");

  return {
    ko: `이 안내는 ${checkedAt}에 확인된 ${sourceText} 출처 기준입니다. 개인 상황에 따라 달라질 수 있어 접수 전 행정사 검토가 필요합니다.`,
    vi: `Hướng dẫn này dựa trên nguồn ${sourceText} được kiểm tra ngày ${checkedAt}. Tình huống cá nhân có thể khác, nên cần chuyên gia hành chính kiểm tra trước khi nộp.`,
    mn: `Энэхүү мэдээлэл нь ${checkedAt}-нд шалгасан ${sourceText} эх сурвалжид үндэслэв. Хувийн нөхцөл өөр байж болох тул мэдүүлэхээс өмнө мэргэжлийн зөвлөгөө авна уу.`,
    en: `This guidance is based on ${sourceText} sources checked on ${checkedAt}. Individual circumstances may differ, so administrative-scrivener review is needed before filing.`,
  }[lang];
}

export function buildRagBasisNotice(lang: Lang, docs: KnowledgeDoc[]): string {
  return buildRagBasisNoticeFromMetadata(lang, docs.map((doc) => getRagDocumentMetadata(doc, lang)));
}

export function compactKnowledgeExcerpt(doc: KnowledgeDoc, lang: Lang, max = 260): string {
  const text = pickLangText(doc.content, lang).replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export function buildKnowledgeAnswerBasis(doc: KnowledgeDoc, lang: Lang): string {
  const meta = getRagDocumentMetadata(doc, lang);
  const excerpt = compactKnowledgeExcerpt(doc, lang, 220);
  const checked =
    lang === "ko" ? `확인일 ${meta.last_checked_at}` : `checked ${meta.last_checked_at}`;
  return `${excerpt} (${checked})`;
}

export function getKnowledgeDocsWithMetadata(
  options: { includeExpired?: boolean; referenceDate?: Date } = {}
): KnowledgeDocWithMetadata[] {
  const referenceDate = options.referenceDate || new Date();
  return KNOWLEDGE_DOCS.map((doc) => ({
    ...doc,
    sourceMeta: getSourceMetadata(doc.source),
  })).filter((doc) => options.includeExpired || isSourceReviewCurrent(doc.source, referenceDate));
}

export function getKnowledgeSourceAudit(referenceDate: Date = new Date()) {
  const registeredSources = new Set(Object.keys(SOURCE_METADATA));
  const usedSources = new Set(KNOWLEDGE_DOCS.map((doc) => doc.source));
  const missingMetadata = Array.from(usedSources).filter((source) => !registeredSources.has(source));
  const unusedMetadata = Array.from(registeredSources).filter((source) => !usedSources.has(source));
  const expiredDocs = KNOWLEDGE_DOCS
    .map((doc) => ({ doc, sourceMeta: getSourceMetadata(doc.source) }))
    .filter(({ doc }) => !isSourceReviewCurrent(doc.source, referenceDate))
    .map(({ doc, sourceMeta }) => ({
      id: doc.id,
      source: doc.source,
      reviewAfter: sourceMeta.reviewAfter,
    }));

  return {
    totalDocs: KNOWLEDGE_DOCS.length,
    activeDocs: getKnowledgeDocsWithMetadata({ referenceDate }).length,
    expiredDocs,
    missingMetadata,
    unusedMetadata,
  };
}

// 간단한 키워드 매칭 기반 retrieval (레거시 — vector-store.ts의 hybridSearch 사용 권장)
// (운영시 Vector DB로 교체, 현재는 키워드 점수로 충분)
// @deprecated Use hybridSearch from ../embeddings/vector-store instead
export function retrieveDocs(query: string, topK = 3): KnowledgeDoc[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const searchableDocs = getKnowledgeDocsWithMetadata();
  const scored = searchableDocs.map((doc) => {
    let score = 0;
    const words = q.split(/\s+/);
    for (const keyword of doc.keywords) {
      if (q.includes(keyword.toLowerCase())) {
        score += 3;
      }
      for (const w of words) {
        if (w.length > 2 && keyword.toLowerCase().includes(w)) {
          score += 1;
        }
      }
    }
    // 제목 매칭 가중치
    for (const lang of ["ko", "vi", "mn", "en"] as Lang[]) {
      const title = doc.title[lang].toLowerCase();
      for (const w of words) {
        if (w.length > 2 && title.includes(w)) {
          score += 2;
        }
      }
    }
    return { doc, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.doc);
}

export function pickLangText(
  obj: { ko: string; vi: string; mn: string; en: string },
  lang: Lang
): string {
  return obj[lang] ?? obj.en;
}

// Re-exports: 소비처가 @/lib/data/knowledge에서 계속 import 하도록 유지
export * from "./knowledge-types";
export { SOURCE_METADATA } from "./source-metadata";
export { KNOWLEDGE_DOCS } from "./knowledge-corpus";
