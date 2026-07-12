const LEXICAL_THRESHOLDS: Record<string, number> = {
  cost: 1.4,
  visa: 1.8,
  documents: 1.1,
  school: 1.0,
  general: 1.6,
};

function finite(value: unknown) {
  const result = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  return Number.isFinite(result) ? result : null;
}

export function retrievalConfidenceThreshold(searchMeta: Record<string, unknown>) {
  const configured = finite(searchMeta.similarityThreshold);
  if (configured !== null) return configured;
  const lexicalPolicy = searchMeta.similarityThreshold === "category-default"
    || searchMeta.reranker === "deterministic-locale-v2";
  if (!lexicalPolicy) return null;
  const category = typeof searchMeta.category === "string" ? searchMeta.category.toLowerCase() : "general";
  return LEXICAL_THRESHOLDS[category] ?? LEXICAL_THRESHOLDS.general;
}

export function isLowConfidenceRetrieval(searchMeta: Record<string, unknown>, sourceCount: number) {
  if (sourceCount <= 0) return false;
  const score = finite(searchMeta.topScore);
  const threshold = retrievalConfidenceThreshold(searchMeta);
  return score !== null && threshold !== null && score < threshold;
}
