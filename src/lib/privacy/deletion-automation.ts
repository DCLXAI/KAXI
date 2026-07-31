import { isProductionPrivacyEnv } from "@/lib/privacy/config";

// POST /api/privacy/delete-request accepted an unauthenticated body carrying any
// one of leadId, contact or question, and set deleteRequestedAt on every row it
// matched — across DiagnosisLead, ChatLog, PartnerRequest and ChatSession — then
// withdrew the associated consents.
//
// The question path is the one that makes this urgent rather than merely wrong.
// It matched on hashPii(question), and a question like "비자 연장 서류" is typed by
// many different people, so one anonymous request could schedule unrelated users'
// records for deletion. A shared question string is not proof of identity.
//
// P0-1 replaces this with a verified request workflow (ownership proof, an
// operator review step, soft-delete, then hard-delete). That is a schema change
// and cannot ship in an hour. This switch exists so the damage stops now: with
// automation off the endpoint still accepts and audits the request, but performs
// no mutation at all.
//
// Default is OFF in production and ON elsewhere, so local and CI keep exercising
// the code path while production cannot. Turning it on is a deliberate act that
// has to name this constant.
export const PRIVACY_DELETION_AUTOMATION_FLAG = "PRIVACY_DELETION_AUTOMATION_ENABLED";

function isEnvTrue(value: string | undefined): boolean {
  return /^(1|true|yes|on)$/i.test((value || "").trim());
}

function isEnvFalse(value: string | undefined): boolean {
  return /^(0|false|no|off)$/i.test((value || "").trim());
}

/**
 * Whether the endpoint may mutate user data. Production requires an explicit
 * opt-in; everywhere else requires an explicit opt-out.
 */
export function isPrivacyDeletionAutomationEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env[PRIVACY_DELETION_AUTOMATION_FLAG];
  if (isEnvTrue(raw)) return true;
  if (isEnvFalse(raw)) return false;
  return !isProductionPrivacyEnv(env);
}

export function privacyDeletionAutomationStatus(env: NodeJS.ProcessEnv = process.env) {
  const enabled = isPrivacyDeletionAutomationEnabled(env);
  return {
    enabled,
    flag: PRIVACY_DELETION_AUTOMATION_FLAG,
    // Named so an operator reading /api/readiness knows this is a deliberate
    // containment state and not a misconfiguration.
    containment: enabled ? null : ("p0_unverified_deletion_containment" as const),
    detail: enabled
      ? "Deletion requests mutate user data immediately. This is only correct once ownership verification (P0-1) is in place."
      : "Deletion requests are accepted and audited but perform no mutation, because the endpoint cannot yet prove the requester owns the data.",
  };
}
