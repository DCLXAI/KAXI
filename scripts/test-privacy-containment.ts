import { readFileSync } from "node:fs";
import { SUPPORTED_DELETION_PROOFS } from "../src/lib/privacy/deletion-scope";

// Two unauthenticated endpoints could mutate other people's data:
//
//   POST /api/privacy/delete-request  took leadId | contact | question and set
//     deleteRequestedAt on every matching row — and deleteRequestedAt is what
//     makes the retention sweep hard-delete chat sessions and their storage
//     attachments. The question path matched hashPii(question), and a question
//     like "비자 연장 서류" is typed by many people, so one anonymous request
//     scheduled strangers' records for deletion and withdrew their consents.
//
//   createPartnerRequest()  took leadId from the body and wrote nickname and
//     contact onto that lead. Only "anonymous" and "local-*" were replaced, so
//     any other id — including someone else's — was used verbatim.
//
// P0-0 contained both behind kill switches. P0-4 and P0-1a replaced the switches
// with actual proofs, so what this file pins is no longer "is the switch off"
// but the structural rule that survived it: NOTHING is mutated that was not
// derived from a proof the caller presented.
//
// These are source-level orderings, because the alternative is standing up
// Prisma — but they are not a formality. The ordering is the entire guarantee,
// and an edit that moves the first mutation above the resolver would restore the
// original bug while every behavioural test still passed.

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assertOk(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

/**
 * Source with comments removed.
 *
 * These files explain the bug they fix, so the explanation quotes the very
 * strings the pins look for. Scanning the raw text makes the pin fire on the
 * comment describing the fix — reword the comment and the pin goes quiet while
 * the real code could say anything. Strip first, then scan.
 */
function code(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*\/\//.test(line))
    .join("\n");
}

// 1. Every mutation lives in one module, and that module only ever receives a
//    subject the resolver produced. Both routes reach it — POST when the caller
//    already had a proof, and verify once they redeemed the mailed link — and a
//    second copy of these queries is how one of them ends up keyed on something
//    the caller typed.
{
  const apply = code("src/lib/privacy/deletion-apply.ts");

  assertOk(
    /export async function applyDeletionSubject\(\s*subject: DeletionSubject/.test(apply),
    "the mutation must take a resolved subject, not loose identifiers",
  );

  for (const routePath of [
    "src/app/api/privacy/delete-request/route.ts",
    "src/app/api/privacy/delete-request/verify/route.ts",
  ]) {
    const route = code(routePath);
    const resolveAt = route.indexOf("resolveDeletionSubject(");
    const applyAt = route.indexOf("applyDeletionSubject(");
    assertOk(resolveAt !== -1, `${routePath} must resolve a proven subject`);
    assertOk(applyAt !== -1, `${routePath} must apply through the shared module`);
    assertOk(applyAt > resolveAt, `${routePath} applies before it resolves`);

    // No route may write deletion markers itself, or the single choke point is
    // not a choke point.
    assertOk(
      !route.includes("deleteRequestedAt:"),
      `${routePath} must not set deleteRequestedAt directly — it goes through applyDeletionSubject`,
    );
    assertOk(
      !route.includes("withdrawLeadConsentsForPrivacyRequest("),
      `${routePath} must not withdraw consents directly`,
    );
  }
}

// 2. Every mutation must be keyed on an id that came out of the resolver. This is
//    the assertion that would have caught the original bug: the old route's
//    `where` clauses read leadId, contactHash and questionHash straight from the
//    request, and no ordering check can save a query that trusts the body.
{
  const apply = code("src/lib/privacy/deletion-apply.ts");

  for (const clause of [
    "db.diagnosisLead.updateMany({ where: { id: { in: leadIds } }",
    "db.partnerRequest.updateMany({ where: { leadId: { in: leadIds } }",
    "db.chatSession.updateMany({ where: { sessionKey: { in: sessionKeys } }",
  ]) {
    assertOk(apply.includes(clause), `a mutation must be keyed on the resolved subject: ${clause}`);
  }

  const post = code("src/app/api/privacy/delete-request/route.ts");

  // body.leadId is never read: it would be an unverified claim about someone
  // else's records, which is exactly what the original endpoint acted on.
  assertOk(!post.includes("body.leadId"), "a lead id the caller typed is a claim, not a proof");

  // body.contact IS read now — but only as a destination to mail a link to. It
  // must never reach a query, so the hash of it may only be used to key the
  // request row, and the verify route is the only place a contact hash resolves
  // to records.
  assertOk(
    !/where:\s*{[^}]*contactHash/.test(post),
    "the POST route must not look up records by a contact the caller merely typed",
  );
  assertOk(
    post.includes("sendNotificationEmail(") && post.includes("issueDeletionToken("),
    "an unproven contact must produce a verification link, not a deletion",
  );
}

// 3. The question path must be gone rather than gated. A shared string cannot
//    identify one person's data no matter what verification sits in front of it,
//    so there must be no code left that could be re-enabled.
{
  const route = code("src/app/api/privacy/delete-request/route.ts");
  assertOk(!route.includes("questionHash"), "the question-hash deletion path must be deleted, not disabled");
  assertOk(
    /body\.question/.test(route) && /400/.test(route),
    "a request still sending a question must be told it is not accepted, not silently ignored",
  );
}

// 4. The response cannot depend on what was found or on what was proven. A caller
//    who could tell those apart could use this endpoint to ask whether a record
//    for a given person exists.
{
  const route = code("src/app/api/privacy/delete-request/route.ts");
  const returns = route.match(/return\s+(accepted\(requestId\)|NextResponse\.json)/g) || [];
  const shaped = returns.filter((line) => line.includes("accepted(requestId)")).length;
  assertOk(shaped >= 4, `every success path must return the single shared response shape, found ${shaped}`);

  // Counts in the audit trail are fine; identifiers are not.
  assertOk(
    !/metadata:\s*{[^}]*leadIds:\s*subject\.leadIds\b/.test(route),
    "the audit metadata must record how many records were marked, never which ones",
  );

  // The verify route is the sharper case: a distinguishable reply for an expired
  // or already-used link turns a token found in a forwarded mail or a proxy log
  // into a test for whether someone's deletion request exists.
  const verify = code("src/app/api/privacy/delete-request/verify/route.ts");
  const verifyReturns = verify.match(/return\s+(done\(\)|NextResponse\.json)/g) || [];
  const verifyShaped = verifyReturns.filter((line) => line.includes("done()")).length;
  assertOk(verifyShaped >= 4, `every verify outcome must return one shape, found ${verifyShaped}`);
  assertOk(
    !/reason:\s*check\.reason[^}]*}\s*,\s*{\s*status:/.test(verify),
    "the rejection reason is for the audit trail, never for the response",
  );

  // The token must be redeemed by a conditional write, not by re-reading state.
  assertOk(
    /updateMany\(\{[\s\S]*?status: "pending_verification", verifiedAt: null/.test(verify),
    "redemption must be a single conditional write, or two simultaneous clicks both pass",
  );
  assertOk(
    verify.indexOf("redeemed.count !== 1") < verify.indexOf("applyDeletionSubject("),
    "the token must be spent before any record is touched",
  );

  // The raw token must never be stored or logged — only its digest is.
  assertOk(!/token(?!Hash)\b\s*[,:}]/.test(verify.replace(/searchParams.get\("token"\)/g, "")),
    "the raw token must not be passed anywhere except the hash function");
}

console.log("PASS privacy deletion: every mutation is keyed on a proven subject, and the question path is gone");

// 5. The readiness surface must describe the proofs that actually exist. A
//    hand-written list here would drift the moment P0-1b adds a channel, so it is
//    derived from the module and checked against the route.
{
  const scope = code("src/lib/privacy/deletion-scope.ts");
  assertOk(SUPPORTED_DELETION_PROOFS.length > 0, "at least one ownership proof must be implemented");

  for (const proof of SUPPORTED_DELETION_PROOFS) {
    assertOk(
      scope.includes(`proof: "${proof}"`),
      `${proof} is advertised through readiness but the resolver never returns it`,
    );
  }

  // And the reverse: a proof the resolver can return must be advertised, or
  // readiness under-reports what the endpoint accepts.
  const returned = [...scope.matchAll(/proof: "([a-z_]+)"/g)].map((m) => m[1]!);
  for (const proof of new Set(returned)) {
    assertOk(
      (SUPPORTED_DELETION_PROOFS as readonly string[]).includes(proof),
      `the resolver returns "${proof}" but readiness does not advertise it`,
    );
  }
}

console.log("PASS privacy deletion: the advertised proofs and the implemented proofs are the same set");

// 6. Partner requests. P0-4 replaced the P0-0 switch with an ownership proof, so
//    what must hold is that the route resolves ownership BEFORE the repository
//    can write to a lead, and that the repository has no path left that trusts a
//    caller-supplied id.
{
  const route = code("src/app/api/partner-requests/route.ts");
  const repo = code("src/lib/partners/repository.ts");

  const resolveAt = route.indexOf("resolveOwnedLead(");
  assertOk(resolveAt !== -1, "the partner route must resolve lead ownership");

  const createAt = route.indexOf("createPartnerRequest(");
  assertOk(createAt > resolveAt, "ownership must be resolved before the request is created");
  assertOk(
    /leadId:\s*ownership\.leadId/.test(route),
    "createPartnerRequest must receive the RESOLVED lead id, never the raw body value",
  );

  assertOk(
    !/isPartnerLeadReuseEnabled/.test(repo),
    "the superseded reuse switch must be gone, not left as a dead control",
  );
  const updateAt = repo.indexOf("db.diagnosisLead.update(");
  const guardAt = repo.indexOf('if (!finalLeadId || finalLeadId === "anonymous"');
  assertOk(guardAt !== -1, "the repository must still replace a placeholder id with a fresh lead");
  assertOk(updateAt > guardAt, "the lead update must sit after the placeholder replacement");
  assertOk(
    repo.indexOf("ensurePartnerRoutingConsentForLead(") > guardAt,
    "a consent snapshot must never be recorded against an unresolved lead",
  );
}

console.log("PASS privacy deletion: partner requests act only on a lead whose ownership was proven");
