import assert from "node:assert/strict";
import {
  PARTNER_LEAD_REUSE_FLAG,
  PRIVACY_DELETION_AUTOMATION_FLAG,
  isPartnerLeadReuseEnabled,
  isPrivacyDeletionAutomationEnabled,
  partnerLeadReuseStatus,
  privacyDeletionAutomationStatus,
} from "../src/lib/privacy/deletion-automation";

// P0-0 containment. Two unauthenticated endpoints could mutate other people's
// data, and neither can prove ownership yet:
//
//   POST /api/privacy/delete-request  took leadId | contact | question and set
//     deleteRequestedAt on every matching row. The question path matched
//     hashPii(question), and a question like "비자 연장 서류" is typed by many
//     people — so one request could schedule strangers' records for deletion and
//     withdraw their consents.
//
//   createPartnerRequest()  took leadId from the body and wrote nickname and
//     contact onto that lead. Only "anonymous" and "local-*" were replaced, so
//     any other id — including someone else's — was used verbatim.
//
// Both are now gated. The rule that matters is the DEFAULT: production must be
// contained without anyone having to remember to set an env var, because the
// failure mode of "remember to turn it off" is that nobody does.

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assertOk(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

const PRODUCTION_ENVS: NodeJS.ProcessEnv[] = [
  { NODE_ENV: "production" },
  { VERCEL_ENV: "production" },
  { NODE_ENV: "production", VERCEL_ENV: "production" },
];

const NON_PRODUCTION_ENVS: NodeJS.ProcessEnv[] = [
  {},
  { NODE_ENV: "development" },
  { NODE_ENV: "test" },
  { VERCEL_ENV: "preview" },
];

// 1. Contained by default in production, for BOTH switches. This is the whole
//    point: an operator who does nothing gets the safe behaviour.
for (const env of PRODUCTION_ENVS) {
  const label = JSON.stringify(env);
  assertOk(
    !isPrivacyDeletionAutomationEnabled(env),
    `deletion automation must be OFF by default in production ${label}`,
  );
  assertOk(
    !isPartnerLeadReuseEnabled(env),
    `partner lead reuse must be OFF by default in production ${label}`,
  );
}

// 2. Still ON outside production, so local and CI keep exercising the real code
//    path rather than only ever running the contained branch.
for (const env of NON_PRODUCTION_ENVS) {
  const label = JSON.stringify(env);
  assertOk(
    isPrivacyDeletionAutomationEnabled(env),
    `deletion automation must stay ON outside production ${label} — otherwise the mutation path is never tested`,
  );
  assertOk(
    isPartnerLeadReuseEnabled(env),
    `partner lead reuse must stay ON outside production ${label}`,
  );
}

// 3. The override works in both directions and is explicit. Re-enabling in
//    production has to name the flag; there is no implicit way back on.
for (const truthy of ["1", "true", "TRUE", "yes", "on"]) {
  assertOk(
    isPrivacyDeletionAutomationEnabled({ NODE_ENV: "production", [PRIVACY_DELETION_AUTOMATION_FLAG]: truthy }),
    `"${truthy}" must re-enable deletion automation`,
  );
  assertOk(
    isPartnerLeadReuseEnabled({ NODE_ENV: "production", [PARTNER_LEAD_REUSE_FLAG]: truthy }),
    `"${truthy}" must re-enable partner lead reuse`,
  );
}
for (const falsy of ["0", "false", "FALSE", "no", "off"]) {
  assertOk(
    !isPrivacyDeletionAutomationEnabled({ [PRIVACY_DELETION_AUTOMATION_FLAG]: falsy }),
    `"${falsy}" must disable deletion automation even outside production`,
  );
  assertOk(
    !isPartnerLeadReuseEnabled({ [PARTNER_LEAD_REUSE_FLAG]: falsy }),
    `"${falsy}" must disable partner lead reuse even outside production`,
  );
}

// 4. A value nobody meant as a boolean must not be read as consent to mutate.
for (const junk of ["", "  ", "maybe", "enabled", "2", "null", "undefined"]) {
  assertOk(
    !isPrivacyDeletionAutomationEnabled({ NODE_ENV: "production", [PRIVACY_DELETION_AUTOMATION_FLAG]: junk }),
    `production must stay contained when the flag is the unparseable value ${JSON.stringify(junk)}`,
  );
  assertOk(
    !isPartnerLeadReuseEnabled({ NODE_ENV: "production", [PARTNER_LEAD_REUSE_FLAG]: junk }),
    `partner lead reuse must stay contained for ${JSON.stringify(junk)}`,
  );
}

console.log("PASS privacy containment: both switches default to contained in production and require an explicit opt-in");

// 5. The status objects an operator reads must say WHY, and must name a reason
//    only while contained — a permanent reason string would read as a permanent
//    fault rather than a temporary state.
{
  const contained = privacyDeletionAutomationStatus({ NODE_ENV: "production" });
  assertOk(contained.enabled === false, "production status must report contained");
  assertOk(
    contained.containment === "p0_unverified_deletion_containment",
    `contained status must carry the containment reason, got ${contained.containment}`,
  );
  assertOk(contained.flag === PRIVACY_DELETION_AUTOMATION_FLAG, "status must name the flag that changes it");
  assertOk(
    /own|verif/i.test(contained.detail),
    "the detail must say what is missing — that the caller's ownership cannot be proven — not merely that the feature is disabled",
  );

  const enabled = privacyDeletionAutomationStatus({ NODE_ENV: "development" });
  assertOk(enabled.enabled === true && enabled.containment === null, "an enabled status must carry no containment reason");

  const partnerContained = partnerLeadReuseStatus({ NODE_ENV: "production" });
  assertOk(
    partnerContained.enabled === false && partnerContained.containment === "p0_unverified_lead_reuse_containment",
    "partner lead reuse status must report its own containment reason",
  );
}

console.log("PASS privacy containment: status objects name the flag and the reason");

// 6. The route must not be able to reach a mutation before consulting the switch.
//    A source-level check, because the alternative is standing up Prisma — but it
//    is not a formality: the ordering is the entire guarantee, and an edit that
//    moves the first updateMany above the guard would restore the original bug
//    while every unit test above still passed.
{
  const { readFileSync } = await import("node:fs");
  const route = readFileSync("src/app/api/privacy/delete-request/route.ts", "utf8");

  const guardAt = route.indexOf("isPrivacyDeletionAutomationEnabled()");
  assertOk(guardAt !== -1, "the delete-request route must consult the containment switch");

  for (const mutation of ["deleteRequestedAt: now", "withdrawLeadConsentsForPrivacyRequest("]) {
    const at = route.indexOf(mutation);
    assertOk(at !== -1, `expected the route to still contain ${mutation}`);
    assertOk(
      at > guardAt,
      `"${mutation}" appears before the containment guard — every mutation must sit behind it`,
    );
  }

  // The contained branch must return before any of that, not fall through.
  const containedReturn = route.indexOf('status: "received"');
  assertOk(containedReturn !== -1, "the contained branch must return a received status");
  assertOk(
    containedReturn > guardAt && containedReturn < route.indexOf("deleteRequestedAt: now"),
    "the contained branch must return before the first mutation",
  );

  // It must not echo the caller's identifiers back into the audit log.
  const containedBlock = route.slice(guardAt, containedReturn);
  for (const leak of ["targetId: leadId", "hashPii(", "contact,", "question,"]) {
    assertOk(
      !containedBlock.includes(leak),
      `the contained branch must not record ${leak} — the caller's identifiers are unverified`,
    );
  }
}

console.log("PASS privacy containment: every delete-request mutation sits behind the guard, and the contained branch records no caller identifiers");

// 7. Partner request: the containment must be checked before the lead is reused.
{
  const { readFileSync } = await import("node:fs");
  const repo = readFileSync("src/lib/partners/repository.ts", "utf8");

  const guardAt = repo.indexOf("isPartnerLeadReuseEnabled()");
  assertOk(guardAt !== -1, "createPartnerRequest must consult the lead-reuse switch");

  const updateAt = repo.indexOf("db.diagnosisLead.update(");
  assertOk(updateAt !== -1, "expected the lead update to still exist");
  assertOk(updateAt > guardAt, "the lead update must sit after the containment guard");

  const consentAt = repo.indexOf("ensurePartnerRoutingConsentForLead(");
  assertOk(
    consentAt > guardAt,
    "the consent snapshot must be recorded after the lead id has been replaced, never against an unverified lead",
  );
}

console.log("PASS privacy containment: partner requests replace an unverified lead id before any write to it");
