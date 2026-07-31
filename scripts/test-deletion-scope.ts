import assert from "node:assert/strict";
import { LEAD_ACCESS_SECRET_KEY, issueLeadAccessToken } from "../src/lib/leads/ownership";
import {
  SUPPORTED_DELETION_PROOFS,
  resolveDeletionSubject,
  type DeletionSubjectLookup,
} from "../src/lib/privacy/deletion-scope";

// P0-1a. POST /api/privacy/delete-request took leadId | contact | question from
// an unauthenticated body and set deleteRequestedAt on every matching row —
// which is what makes the retention sweep hard-delete chat sessions and their
// storage attachments. The question path matched hashPii(question), so one
// anonymous request naming a common question scheduled strangers' records for
// deletion and withdrew their consents.
//
// The fix is not "verify the id they typed". It is that the set of records is
// DERIVED from a proof and the body never reaches a query, which is what these
// assertions are about. Credential-free: the lookup is injected.

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assertOk(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

const SECRET = "deletion-scope-test-secret-that-is-long-enough";
const env = { [LEAD_ACCESS_SECRET_KEY]: SECRET } as NodeJS.ProcessEnv;

const ALICE = "user-alice";
const ALICE_LEADS = ["lead-alice-1", "lead-alice-2"];
const ALICE_SESSIONS = ["session-alice-chat"];
const BOB_LEAD = "lead-bob";
const ALICE_CONTACT_HASH = "hmac-of-alice-address";
const UNKNOWN_CONTACT_HASH = "hmac-of-an-address-nobody-used";

const calls: { name: string; arg: unknown }[] = [];

const lookup: DeletionSubjectLookup = {
  async findLeadIdsForUser(userId) {
    calls.push({ name: "findLeadIdsForUser", arg: userId });
    return userId === ALICE ? [...ALICE_LEADS] : [];
  },
  async findSessionKeysForUser(userId) {
    calls.push({ name: "findSessionKeysForUser", arg: userId });
    return userId === ALICE ? [...ALICE_SESSIONS] : [];
  },
  async findLeadIdsForContactHash(contactHash) {
    calls.push({ name: "findLeadIdsForContactHash", arg: contactHash });
    return contactHash === ALICE_CONTACT_HASH ? [...ALICE_LEADS] : [];
  },
  async findSessionKeysForLeads(leadIds) {
    calls.push({ name: "findSessionKeysForLeads", arg: [...leadIds] });
    // Every lead here happens to have a handoff session, plus one duplicate to
    // prove the result is de-duplicated before it becomes a `where ... in`.
    return [...leadIds.map((id) => `session-of-${id}`), ...ALICE_SESSIONS];
  },
};

// 1. An authenticated user gets their own footprint, and only theirs.
{
  calls.length = 0;
  const subject = await resolveDeletionSubject(lookup, { sessionUserId: ALICE, env });
  assertOk(subject, "a signed-in user must be able to exercise deletion");
  assert.equal(subject.proof, "session");
  assert.equal(subject.userId, ALICE);
  assert.deepEqual(subject.leadIds.sort(), [...ALICE_LEADS].sort());
  assertOk(!subject.leadIds.includes(BOB_LEAD), "another user's lead must never enter the subject");

  // Sessions come from both the account and its leads, de-duplicated: a repeated
  // key in a `where sessionKey in (...)` is harmless, but a resolver that cannot
  // be trusted to de-duplicate cannot be trusted to bound the set either.
  assert.equal(new Set(subject.sessionKeys).size, subject.sessionKeys.length, "session keys must be unique");
  for (const key of [...ALICE_SESSIONS, ...ALICE_LEADS.map((id) => `session-of-${id}`)]) {
    assertOk(subject.sessionKeys.includes(key), `expected ${key} in the resolved sessions`);
  }

  // Every lookup was keyed on the proven identity, never on anything else.
  for (const call of calls) {
    if (call.name === "findSessionKeysForLeads") {
      assert.deepEqual(call.arg, ALICE_LEADS, "lead-keyed lookups must use the leads the account owns");
    } else {
      assert.equal(call.arg, ALICE, "identity-keyed lookups must use the session user");
    }
  }
}

// 2. A user with nothing gets an empty subject, not null. "Proved who they are,
//    owns no records" and "proved nothing" are different states, and only the
//    second one should be left unhonoured.
{
  const subject = await resolveDeletionSubject(lookup, { sessionUserId: "user-with-no-data", env });
  assertOk(subject, "a signed-in user with no records still made a valid request");
  assert.equal(subject.proof, "session");
  assert.deepEqual(subject.leadIds, []);
  assert.deepEqual(subject.sessionKeys, []);
}

// 3. An anonymous holder of the lead cookie gets exactly the lead the SIGNED
//    PAYLOAD names. Nothing is passed in to be matched against, because there is
//    no body value involved at any point.
{
  const token = issueLeadAccessToken(BOB_LEAD, Date.now(), env);
  const subject = await resolveDeletionSubject(lookup, { leadAccessToken: token, env });
  assertOk(subject, "an anonymous person holding their lead cookie must be able to exercise deletion");
  assert.equal(subject.proof, "lead_access");
  assert.equal(subject.userId, null);
  assert.deepEqual(subject.leadIds, [BOB_LEAD], "the cookie authorises its own lead and nothing else");
  assertOk(
    !subject.leadIds.some((id) => ALICE_LEADS.includes(id)),
    "a lead cookie must not widen into another person's records",
  );
}

// 3b. Possession of the address, proved by redeeming the mailed link. This is
//     set ONLY by the verify route, and only after the token check passed.
{
  const subject = await resolveDeletionSubject(lookup, { verifiedContactHash: ALICE_CONTACT_HASH, env });
  assertOk(subject, "a verified contact address must resolve the records reachable from it");
  assert.equal(subject.proof, "contact_token");
  assert.equal(subject.userId, null);
  assert.deepEqual(subject.leadIds.sort(), [...ALICE_LEADS].sort());

  // Verified, but nothing is stored under it. That is an empty subject, not a
  // failed proof: the person proved who they are and there was nothing to erase.
  const empty = await resolveDeletionSubject(lookup, { verifiedContactHash: UNKNOWN_CONTACT_HASH, env });
  assertOk(empty, "a verified address that matches nothing still proved ownership");
  assert.equal(empty.proof, "contact_token");
  assert.deepEqual(empty.leadIds, []);
  assert.deepEqual(empty.sessionKeys, []);

  // A signed-in caller must get their whole account footprint, not just the
  // records sharing one address, so session identity has to win.
  const both = await resolveDeletionSubject(lookup, {
    sessionUserId: ALICE,
    verifiedContactHash: ALICE_CONTACT_HASH,
    env,
  });
  assert.equal(both!.proof, "session", "session identity is the stronger proof and must take precedence");
}

console.log("PASS deletion scope: a proven caller gets their own records, and only those");

// 4. No proof, no subject. Each of these used to be enough to delete data.
{
  for (const [label, input] of [
    ["nothing at all", {}],
    ["an empty session", { sessionUserId: "" }],
    ["a null session", { sessionUserId: null }],
    ["a missing cookie", { leadAccessToken: null }],
    ["a junk cookie", { leadAccessToken: "not-a-token" }],
    ["a cookie with a broken signature", { leadAccessToken: `${issueLeadAccessToken(BOB_LEAD, Date.now(), env)}x` }],
    ["an empty verified contact hash", { verifiedContactHash: "" }],
    ["a null verified contact hash", { verifiedContactHash: null }],
  ] as const) {
    const subject = await resolveDeletionSubject(lookup, { ...input, env });
    assertOk(subject === null, `${label} must not resolve a deletion subject`);
  }

  // An expired cookie is not a proof either. A stale bearer token on a shared
  // machine is exactly the case the max age exists for.
  const now = Date.now();
  const old = issueLeadAccessToken(BOB_LEAD, now - 30 * 24 * 60 * 60 * 1000, env);
  assertOk(
    (await resolveDeletionSubject(lookup, { leadAccessToken: old, now, env })) === null,
    "an expired lead cookie must not authorise deletion",
  );

  // And with no secret configured, a cookie proves nothing rather than
  // everything — the same degrade-to-contained rule the issuer follows.
  const token = issueLeadAccessToken(BOB_LEAD, now, env);
  assertOk(
    (await resolveDeletionSubject(lookup, { leadAccessToken: token, env: {} as NodeJS.ProcessEnv })) === null,
    "without a signing secret no cookie may be honoured",
  );
}

console.log("PASS deletion scope: an unproven caller resolves to nothing, in every form the old route accepted");

// 5. The advertised proof list must match what the resolver can actually return.
//    Readiness reports this list; if it drifts, operators are told the endpoint
//    covers a channel it does not.
{
  assert.deepEqual(
    [...SUPPORTED_DELETION_PROOFS].sort(),
    ["contact_token", "lead_access", "session"],
    "the advertised proofs must be exactly the three that are implemented",
  );
}

console.log("PASS deletion scope: the advertised proof list matches the implementation");
