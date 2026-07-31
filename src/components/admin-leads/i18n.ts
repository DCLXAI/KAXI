import { DIAGNOSIS_DOC_KEYS, DIAGNOSIS_GOALS, DIAGNOSIS_PATH_KEYS } from "@/lib/data/diagnosis";
import { PARTNER_TYPES } from "@/lib/partners/types";

// These allowlists used to be hand-written copies of the value domains, and
// translateKnown() renders the FALLBACK label for anything outside them —
// silently, with no warning. So every value added upstream and not copied here
// showed the operator a confidently wrong label rather than a missing one:
//
//   goal  in_korea_job / in_korea_employment    -> "not sure"
//   path  goal_in_korea_d10 / goal_in_korea_e7  -> "Korean language study"
//   docs  the nine D-10 and E-7 document keys   -> "passport", on every badge
//
// An E-7 lead — the highest-intent answer the wizard offers — was displayed as
// an undecided language student with a passport-only document list. Deriving the
// sets from the same constants the diagnosis engine and the partner write path
// use means a new value can no longer go unlabelled.
const GOAL_KEYS = new Set(DIAGNOSIS_GOALS.map((goal) => `goal_${goal}`));
const PATH_KEYS = new Set(DIAGNOSIS_PATH_KEYS);
const DOC_KEYS = new Set(DIAGNOSIS_DOC_KEYS);
const PARTNER_KEYS = new Set([...PARTNER_TYPES].map((type) => `partner_${type}`));

type Translator = (key: string) => string;

function translateKnown(t: Translator, key: string, fallback: string, allowed: Set<string>): string {
  return allowed.has(key) ? t(key) : t(fallback);
}

export function goalLabel(t: Translator, goal: string): string {
  return translateKnown(t, `goal_${goal}`, "goal_unsure", GOAL_KEYS);
}

// Path keys are their own namespace. They previously shared GOAL_KEYS, which
// only worked because four PATH_PROFILES entries happen to be named after goals;
// the two that are not — goal_in_korea_d10 and goal_in_korea_e7 — fell through
// to the language-study fallback.
export function pathLabel(t: Translator, pathKey: string): string {
  return translateKnown(t, pathKey, "goal_language", PATH_KEYS);
}

export function documentLabel(t: Translator, key: string): string {
  return translateKnown(t, key, "docs_doc_passport", DOC_KEYS);
}

export function partnerLabel(t: Translator, type: string): string {
  return translateKnown(t, `partner_${type}`, "partner_admin", PARTNER_KEYS);
}
