import { DIAGNOSIS_DOC_KEYS, DIAGNOSIS_GOALS, DIAGNOSIS_PATH_KEYS } from "@/lib/data/diagnosis";
import { ANONYMOUS_LEAD_PLACEHOLDER } from "@/lib/partners/anonymous-lead";
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

// Two values reach these functions that are not wizard answers at all:
//
//   ""         POST /api/leads validates the field as
//              `goal: z.string().optional().default("")` and persists it
//              verbatim into a plain TEXT column with no CHECK constraint, so
//              any client that omits the field lands here.
//   "unknown"  createAnonymousLead() writes it into goal AND pathKey on the stub
//              rows created for partner requests with no saved diagnosis.
//
// They are named here rather than added to GOAL_KEYS/PATH_KEYS because neither
// is a DiagnosisInput["goal"] or a DIAGNOSIS_PATH_KEYS entry — widening those
// domains would put absent data into the wizard's own vocabulary.
const UNRECORDED_VALUES = new Set(["", ANONYMOUS_LEAD_PLACEHOLDER]);

type Translator = (key: string) => string;

function translateKnown(t: Translator, key: string, fallback: string, allowed: Set<string>): string {
  return allowed.has(key) ? t(key) : t(fallback);
}

// The fallbacks below are deliberately NOT members of their own domain. They
// used to be: goal fell back to goal_unsure ("잘 모름") and path to goal_language
// (D-4 한국어 연수), both of them answers the wizard offers. That is the defect
// underneath the allowlist drift PR #71 fixed — a value with no legitimate label
// was handed somebody else's, so a lead that recorded nothing was displayed as
// an undecided language student and an operator could not tell the two apart.
export function goalLabel(t: Translator, goal: string): string {
  if (UNRECORDED_VALUES.has(goal)) return t("goal_not_recorded");
  return translateKnown(t, `goal_${goal}`, "goal_unrecognized", GOAL_KEYS);
}

// Path keys are their own namespace. They previously shared GOAL_KEYS, which
// only worked because four PATH_PROFILES entries happen to be named after goals;
// the two that are not — goal_in_korea_d10 and goal_in_korea_e7 — fell through
// to the language-study fallback.
export function pathLabel(t: Translator, pathKey: string): string {
  if (UNRECORDED_VALUES.has(pathKey)) return t("path_not_recorded");
  return translateKnown(t, pathKey, "path_unrecognized", PATH_KEYS);
}

export function documentLabel(t: Translator, key: string): string {
  return translateKnown(t, key, "docs_doc_passport", DOC_KEYS);
}

export function partnerLabel(t: Translator, type: string): string {
  return translateKnown(t, `partner_${type}`, "partner_admin", PARTNER_KEYS);
}
