import { DIAGNOSIS_GOALS, DIAGNOSIS_PATH_KEYS } from "@/lib/data/diagnosis";

const GOALS = new Set<string>(DIAGNOSIS_GOALS);
const PATHS = new Set<string>(DIAGNOSIS_PATH_KEYS);

/**
 * True for a lead row that holds no wizard answer at all — in practice the stub
 * rows createAnonymousLead() writes so that a partner request from a visitor
 * with no saved diagnosis has something to hang on.
 *
 * This belongs on the row, not in the goal cell. Relabelling goal alone still
 * leaves a stub sitting in the operator's queue looking like a real lead who
 * merely skipped one question, when in fact nobody answered anything on it.
 *
 * Both fields have to be absent: a user who genuinely picked "잘 모름" has
 * goal === "unsure" with a real recommended path, and must not be marked.
 */
export function hasNoDiagnosis(lead: { goal: string; pathKey: string }): boolean {
  return !GOALS.has(lead.goal) && !PATHS.has(lead.pathKey);
}
