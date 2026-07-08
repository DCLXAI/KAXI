const GOAL_KEYS = new Set(["goal_language", "goal_degree", "goal_transfer", "goal_career", "goal_unsure"]);
const DOC_KEYS = new Set([
  "docs_doc_passport",
  "docs_doc_photo",
  "docs_doc_diploma",
  "docs_doc_transcript",
  "docs_doc_finance",
  "docs_doc_family",
  "docs_doc_admission",
  "docs_doc_tuberculosis",
  "docs_doc_plan",
  "docs_doc_business",
]);
const PARTNER_KEYS = new Set([
  "partner_admin",
  "partner_translation",
  "partner_academy",
  "partner_admission",
  "partner_settlement",
]);

type Translator = (key: string) => string;

function translateKnown(t: Translator, key: string, fallback: string, allowed: Set<string>): string {
  return allowed.has(key) ? t(key) : t(fallback);
}

export function goalLabel(t: Translator, goal: string): string {
  return translateKnown(t, `goal_${goal}`, "goal_unsure", GOAL_KEYS);
}

export function pathLabel(t: Translator, pathKey: string): string {
  return translateKnown(t, pathKey, "goal_language", GOAL_KEYS);
}

export function documentLabel(t: Translator, key: string): string {
  return translateKnown(t, key, "docs_doc_passport", DOC_KEYS);
}

export function partnerLabel(t: Translator, type: string): string {
  return translateKnown(t, `partner_${type}`, "partner_admin", PARTNER_KEYS);
}
