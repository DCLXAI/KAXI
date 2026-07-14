import type { ChatCategory } from "@/lib/chat/category";
import type { GuardrailLocale } from "@/lib/chat/response-guardrail";

export const RETRIEVAL_CONFIDENCE_POLICY_VERSION = "locale-category-margin-v2";

export type RetrievalConfidencePolicy = {
  minScore: number;
  minTokenCoverage: number;
  minTopMargin: number;
  strongScore: number;
};

const POLICIES: Record<GuardrailLocale, Record<ChatCategory, RetrievalConfidencePolicy>> = {
  ko: {
    visa: { minScore: 0.62, minTokenCoverage: 0.12, minTopMargin: 0.04, strongScore: 0.95 },
    documents: { minScore: 0.56, minTokenCoverage: 0.12, minTopMargin: 0.04, strongScore: 0.88 },
    school: { minScore: 0.48, minTokenCoverage: 0.1, minTopMargin: 0.03, strongScore: 0.78 },
    cost: { minScore: 0.52, minTokenCoverage: 0.12, minTopMargin: 0.04, strongScore: 0.84 },
    general: { minScore: 0.5, minTokenCoverage: 0.1, minTopMargin: 0.04, strongScore: 0.82 },
  },
  en: {
    visa: { minScore: 0.58, minTokenCoverage: 0.14, minTopMargin: 0.04, strongScore: 0.9 },
    documents: { minScore: 0.52, minTokenCoverage: 0.14, minTopMargin: 0.04, strongScore: 0.84 },
    school: { minScore: 0.45, minTokenCoverage: 0.12, minTopMargin: 0.03, strongScore: 0.74 },
    cost: { minScore: 0.49, minTokenCoverage: 0.14, minTopMargin: 0.04, strongScore: 0.8 },
    general: { minScore: 0.47, minTokenCoverage: 0.12, minTopMargin: 0.04, strongScore: 0.78 },
  },
  vi: {
    visa: { minScore: 0.54, minTokenCoverage: 0.12, minTopMargin: 0.035, strongScore: 0.86 },
    documents: { minScore: 0.49, minTokenCoverage: 0.12, minTopMargin: 0.035, strongScore: 0.8 },
    school: { minScore: 0.43, minTokenCoverage: 0.1, minTopMargin: 0.03, strongScore: 0.72 },
    cost: { minScore: 0.46, minTokenCoverage: 0.12, minTopMargin: 0.035, strongScore: 0.76 },
    general: { minScore: 0.44, minTokenCoverage: 0.1, minTopMargin: 0.035, strongScore: 0.74 },
  },
  mn: {
    visa: { minScore: 0.52, minTokenCoverage: 0.1, minTopMargin: 0.035, strongScore: 0.84 },
    documents: { minScore: 0.47, minTokenCoverage: 0.1, minTopMargin: 0.035, strongScore: 0.78 },
    school: { minScore: 0.41, minTokenCoverage: 0.08, minTopMargin: 0.03, strongScore: 0.7 },
    cost: { minScore: 0.45, minTokenCoverage: 0.1, minTopMargin: 0.035, strongScore: 0.74 },
    general: { minScore: 0.43, minTokenCoverage: 0.08, minTopMargin: 0.035, strongScore: 0.72 },
  },
};

function finite(value: unknown) {
  const result = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  return Number.isFinite(result) ? result : null;
}

function locale(value: unknown): GuardrailLocale {
  return value === "en" || value === "vi" || value === "mn" ? value : "ko";
}

function category(value: unknown): ChatCategory {
  return value === "visa" || value === "documents" || value === "school" || value === "cost"
    ? value
    : "general";
}

function isCalibratedRetrieval(searchMeta: Record<string, unknown>) {
  const type = String(searchMeta.type || searchMeta.retrievalMode || "").toLowerCase();
  return searchMeta.similarityThreshold === "category-default"
    || searchMeta.reranker === "deterministic-locale-v2"
    || type.includes("lexical")
    || type.includes("hybrid");
}

export function retrievalConfidencePolicy(searchMeta: Record<string, unknown>) {
  return POLICIES[locale(searchMeta.locale)][category(searchMeta.category)];
}

export function retrievalConfidenceThreshold(searchMeta: Record<string, unknown>) {
  const configured = finite(searchMeta.similarityThreshold);
  if (configured !== null && configured > 0) return configured;
  if (!isCalibratedRetrieval(searchMeta)) return null;
  return retrievalConfidencePolicy(searchMeta).minScore;
}

export function isLowConfidenceRetrieval(searchMeta: Record<string, unknown>, sourceCount: number) {
  if (sourceCount <= 0) return false;
  if (!isCalibratedRetrieval(searchMeta)) return false;
  if (searchMeta.noContext === true) return true;

  const policy = retrievalConfidencePolicy(searchMeta);
  const score = finite(searchMeta.topScore);
  const threshold = retrievalConfidenceThreshold(searchMeta) ?? policy.minScore;
  if (score === null || score < threshold) return true;

  const coverage = finite(searchMeta.tokenCoverage ?? searchMeta.queryTokenCoverage);
  if (coverage !== null && coverage < policy.minTokenCoverage && score < policy.strongScore) return true;

  const secondScore = finite(searchMeta.secondScore);
  const suppliedMargin = finite(searchMeta.top1Top2Margin);
  const margin = suppliedMargin ?? (secondScore === null ? null : Math.max(0, score - secondScore));
  if (margin !== null && secondScore !== null && secondScore > 0 && margin < policy.minTopMargin && score < policy.strongScore) {
    return true;
  }
  return false;
}
