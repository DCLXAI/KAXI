import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  LEAD_ACCESS_MAX_AGE_SECONDS,
  LEAD_ACCESS_SECRET_KEY,
  issueLeadAccessToken,
  resolveOwnedLead,
  verifyLeadAccessToken,
  type LeadOwnershipLookup,
} from "../src/lib/leads/ownership";

// P0-4. createPartnerRequest() used to take leadId straight from the request
// body and write nickname and contact onto whatever lead it named — so anyone
// who knew or guessed another person's lead id could overwrite their name and
// contact details, and have a consent snapshot recorded against their lead.
//
// The scenarios below are the ones the plan lists at §P0-4 보안 테스트. They run
// credential-free: the database lookup is injected, so what is under test is the
// decision, not Prisma.

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assertOk(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

const SECRET = "test-lead-access-secret-that-is-long-enough-32";
const OTHER_SECRET = "a-completely-different-secret-also-32-bytes-ok";
const env = { [LEAD_ACCESS_SECRET_KEY]: SECRET } as NodeJS.ProcessEnv;

const ALICE_LEAD = "lead-alice";
const BOB_LEAD = "lead-bob";
const ANON_LEAD = "lead-anonymous";

const lookup: LeadOwnershipLookup = {
  async findLeadOwner(leadId) {
    if (leadId === ALICE_LEAD) return { userId: "user-alice" };
    if (leadId === BOB_LEAD) return { userId: "user-bob" };
    if (leadId === ANON_LEAD) return { userId: null };
    return null;
  },
};

const resolve = (input: Parameters<typeof resolveOwnedLead>[1]) => resolveOwnedLead(lookup, { env, ...input });

/** The token's payload, for building near-miss variants of a real token. */
function payloadOf(token: string): { v: number; leadId: string; issuedAt: number; expiresAt: number; nonce: string } {
  return JSON.parse(Buffer.from(token.split(".")[0]!, "base64url").toString());
}

/**
 * Signs a payload the way the module does. Duplicated here on purpose: a test
 * that reuses the module's own issuer can only ever produce policy-abiding
 * tokens, and the checks below exist for the ones that do not.
 */
function signWith(secret: string, payload: unknown): string {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${createHmac("sha256", secret).update(encoded).digest("base64url")}`;
}

/** Confirms a fixture really is signed, so a rejection below means the payload was refused — not the signature. */
function verifySignatureOnly(token: string): boolean {
  const [encoded, signature] = token.split(".");
  return createHmac("sha256", SECRET).update(encoded!).digest("base64url") === signature;
}

// 1. The attack itself: user B naming user A's lead.
{
  const result = await resolve({ requestedLeadId: ALICE_LEAD, sessionUserId: "user-bob" });
  assertOk(result.leadId === null, "another user's lead must never resolve");
  assertOk(result.proof === null, "a rejected claim carries no proof");
  assert.equal(result.reason, "not_owned_by_session_user");
}

// 2. The same attack anonymously — session B's cookie naming session A's lead.
{
  const bobToken = issueLeadAccessToken(BOB_LEAD, Date.now(), env);
  const result = await resolve({ requestedLeadId: ALICE_LEAD, leadAccessToken: bobToken });
  assertOk(result.leadId === null, "a cookie for a different lead must not authorise this one");
  assert.equal(result.reason, "cookie_names_other_lead");
}

// 3. The legitimate cases still work, or P0-4 would just be P0-0 with extra code.
{
  const owner = await resolve({ requestedLeadId: ALICE_LEAD, sessionUserId: "user-alice" });
  assert.equal(owner.leadId, ALICE_LEAD, "the owning session user must resolve their own lead");
  assert.equal(owner.proof, "session");

  const anonToken = issueLeadAccessToken(ANON_LEAD, Date.now(), env);
  const anon = await resolve({ requestedLeadId: ANON_LEAD, leadAccessToken: anonToken });
  assert.equal(anon.leadId, ANON_LEAD, "an anonymous holder of the signed cookie must resolve their lead");
  assert.equal(anon.proof, "lead_access");

  // Diagnosed anonymously, then signed in: the cookie still proves it is theirs.
  const claimed = await resolve({ requestedLeadId: ANON_LEAD, sessionUserId: "user-alice", leadAccessToken: anonToken });
  assert.equal(claimed.leadId, ANON_LEAD, "signing in must not lock a user out of the lead they just created");
}

console.log("PASS lead ownership: another user's lead never resolves, the owner's always does");

// 4. Cookie forgery and tampering.
{
  const token = issueLeadAccessToken(ALICE_LEAD, Date.now(), env)!;
  const [encoded, signature] = token.split(".");

  assertOk(!verifyLeadAccessToken(`${encoded}.${signature}x`, Date.now(), env), "a mutated signature must be rejected");
  assertOk(!verifyLeadAccessToken(`${encoded}x.${signature}`, Date.now(), env), "a mutated payload must be rejected");
  assertOk(!verifyLeadAccessToken(encoded, Date.now(), env), "a token with no signature must be rejected");
  assertOk(!verifyLeadAccessToken("", Date.now(), env), "an empty token must be rejected");

  // Signed with the wrong key — i.e. an attacker who guessed the format.
  const forged = issueLeadAccessToken(ALICE_LEAD, Date.now(), { [LEAD_ACCESS_SECRET_KEY]: OTHER_SECRET } as NodeJS.ProcessEnv)!;
  assertOk(!verifyLeadAccessToken(forged, Date.now(), env), "a token signed with another secret must be rejected");

  // Re-pointing the payload at a different lead invalidates the signature.
  const swapped = Buffer.from(
    JSON.stringify({ ...JSON.parse(Buffer.from(encoded!, "base64url").toString()), leadId: BOB_LEAD }),
  ).toString("base64url");
  assertOk(
    !verifyLeadAccessToken(`${swapped}.${signature}`, Date.now(), env),
    "editing the leadId inside a signed token must break verification",
  );
}

// 5. Expiry, including a token that tries to grant itself a longer life.
{
  const now = Date.now();
  const token = issueLeadAccessToken(ALICE_LEAD, now, env)!;
  assertOk(verifyLeadAccessToken(token, now, env), "a fresh token verifies");
  assertOk(
    !verifyLeadAccessToken(token, now + (LEAD_ACCESS_MAX_AGE_SECONDS + 60) * 1000, env),
    "an expired token must be rejected",
  );

  // The max-age ceiling is defence in depth against a correctly signed token
  // that still claims too much — an issuer bug, or a code path added later that
  // passes its own lifetime. So this has to be signed properly: attaching a
  // greedy payload to the original signature only ever tests the signature
  // check, and would pass with the ceiling deleted.
  const greedy = signWith(SECRET, { ...payloadOf(token), expiresAt: payloadOf(token).issuedAt + LEAD_ACCESS_MAX_AGE_SECONDS * 10 });
  assertOk(verifySignatureOnly(greedy), "this fixture must be validly signed, or the ceiling below is never reached");
  assertOk(
    !verifyLeadAccessToken(greedy, now, env),
    "a validly signed token cannot buy itself a longer life than the policy allows",
  );

  // Same reasoning for the future-dated check.
  const nowSeconds = Math.floor(now / 1000);
  const fromTheFuture = signWith(SECRET, {
    ...payloadOf(token),
    issuedAt: nowSeconds + 3600,
    expiresAt: nowSeconds + 3600 + LEAD_ACCESS_MAX_AGE_SECONDS,
  });
  assertOk(!verifyLeadAccessToken(fromTheFuture, now, env), "a validly signed but future-dated token must be rejected");
}

console.log("PASS lead ownership: forged, tampered, expired and over-long tokens are all rejected");

// 6. Absent configuration must degrade to "no proof", never to "trust the body".
{
  const noSecret = {} as NodeJS.ProcessEnv;
  assertOk(
    issueLeadAccessToken(ALICE_LEAD, Date.now(), noSecret) === null,
    "without a signing secret no token is issued, rather than an unsigned one",
  );

  const token = issueLeadAccessToken(ALICE_LEAD, Date.now(), env)!;
  const result = await resolveOwnedLead(lookup, {
    requestedLeadId: ALICE_LEAD,
    leadAccessToken: token,
    env: noSecret,
  });
  assertOk(result.leadId === null, "a token must not be honoured when no secret is configured to verify it");
}

// 7. Placeholders and unknown ids resolve to nothing, without distinguishing
//    "does not exist" from "not yours" to the caller.
{
  for (const placeholder of ["", "   ", "anonymous", "local-1234567890"]) {
    const result = await resolve({ requestedLeadId: placeholder, sessionUserId: "user-alice" });
    assertOk(result.leadId === null, `"${placeholder}" is a client placeholder, not a lead id`);
    assert.equal(result.reason, "no_lead_requested");
  }

  const missing = await resolve({ requestedLeadId: "lead-does-not-exist", sessionUserId: "user-alice" });
  assertOk(missing.leadId === null, "an unknown lead must not resolve");
  // The reason is recorded for the audit trail, but the caller only ever sees
  // the same outcome as any other failed proof: a fresh lead.
  assert.equal(missing.reason, "lead_not_found");

  const noProof = await resolve({ requestedLeadId: ALICE_LEAD });
  assert.equal(noProof.reason, "no_proof_available", "no session and no cookie is not an authorisation");
  assertOk(noProof.leadId === null, "a bare id with no proof must never resolve");
}

console.log("PASS lead ownership: missing configuration and unknown ids fall back to no proof, never to trust");
