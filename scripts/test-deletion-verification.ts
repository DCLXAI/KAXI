import assert from "node:assert/strict";
import {
  DELETION_TOKEN_TTL_MS,
  checkDeletionToken,
  deletionTokenHashMatches,
  deletionVerificationCopy,
  deletionVerifyPath,
  hashDeletionToken,
  issueDeletionToken,
  type DeletionTokenRecord,
} from "../src/lib/privacy/deletion-verification";

// P0-1b. P0-1a made the deletion endpoint act only on records the caller proved
// were theirs, which left one gap open on purpose: someone who is not signed in
// and no longer holds their lead cookie could prove nothing, so their request
// was audited and dropped. They still have the right to have their data erased.
//
// The proof for a bare contact address is possession of the address. These are
// the rules that make that a proof rather than a formality, tested as pure
// functions — no database, no mail server.

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assertOk(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

const now = new Date("2026-08-01T12:00:00.000Z");
const pending = (overrides: Partial<DeletionTokenRecord> = {}): DeletionTokenRecord => ({
  status: "pending_verification",
  expiresAt: new Date(now.getTime() + DELETION_TOKEN_TTL_MS),
  verifiedAt: null,
  ...overrides,
});

// 1. Tokens must be unguessable and never stored in the clear.
{
  const seen = new Set<string>();
  for (let i = 0; i < 200; i += 1) {
    const { token, tokenHash } = issueDeletionToken();
    assertOk(!seen.has(token), "issueDeletionToken must not repeat a token");
    seen.add(token);

    // 32 bytes of CSPRNG output, base64url-encoded. A shorter token would be
    // worth grinding against an endpoint that tells you nothing but still acts.
    assertOk(token.length >= 43, `token is too short to resist guessing: ${token.length} chars`);
    assertOk(/^[A-Za-z0-9_-]+$/.test(token), "the token must be URL-safe or the link breaks");

    assert.equal(tokenHash, hashDeletionToken(token), "the stored digest must be derived from the token");
    assertOk(!tokenHash.includes(token), "the digest must not contain the token");
    assertOk(tokenHash.length === 64, "expected a hex sha256 digest");
  }

  // Distinct tokens must not collide into one row — the column is unique, so a
  // collision would be a write error, not a security hole, but it would also be
  // a redemption of the wrong request.
  assert.equal(new Set([...seen].map(hashDeletionToken)).size, seen.size, "digests must be as distinct as tokens");

  assertOk(deletionTokenHashMatches("abc", "abc"), "equal digests must compare equal");
  assertOk(!deletionTokenHashMatches("abc", "abd"), "different digests must not compare equal");
  assertOk(!deletionTokenHashMatches("abc", "abcd"), "a prefix must not compare equal");
}

console.log("PASS deletion verification: tokens are unguessable, URL-safe, and stored only as digests");

// 2. The lifecycle. Each of these is a way a link stops being a proof.
{
  assertOk(checkDeletionToken(pending(), now).ok, "a fresh pending token verifies");

  const cases: Array<[string, DeletionTokenRecord | null, string]> = [
    ["a token that does not exist", null, "not_found"],
    ["a token already redeemed", pending({ verifiedAt: new Date(now.getTime() - 1000) }), "already_used"],
    ["a request already verified", { status: "verified", expiresAt: null, verifiedAt: new Date() }, "already_used"],
    ["a superseded request", pending({ status: "superseded" }), "not_pending"],
    ["a request marked expired", pending({ status: "expired" }), "expired"],
    ["a token with no expiry", pending({ expiresAt: null }), "expired"],
    ["a token that expired a second ago", pending({ expiresAt: new Date(now.getTime() - 1000) }), "expired"],
  ];

  for (const [label, record, reason] of cases) {
    const result = checkDeletionToken(record, now);
    assertOk(!result.ok, `${label} must not be redeemable`);
    assert.equal(result.reason, reason, `wrong reason for ${label}`);
  }

  // The boundary: expiry is exclusive, so a token is dead exactly at its expiry
  // rather than a millisecond later.
  assertOk(
    !checkDeletionToken(pending({ expiresAt: now }), now).ok,
    "a token must not be redeemable at the instant it expires",
  );
  assertOk(
    checkDeletionToken(pending({ expiresAt: new Date(now.getTime() + 1) }), now).ok,
    "a token one millisecond from expiry is still live",
  );
}

console.log("PASS deletion verification: expired, reused, superseded and unknown tokens are all rejected");

// 3. The link, and the mail that carries it.
{
  const { token } = issueDeletionToken();
  const path = deletionVerifyPath(token);
  assertOk(path.startsWith("/api/privacy/delete-request/verify?token="), "the link must point at the verify route");

  // A base64url token contains no character that needs escaping, but the
  // encoding must be there anyway: a future token format that does would
  // otherwise silently produce a link that truncates at the first "&".
  assert.equal(new URL(`https://example.test${path}`).searchParams.get("token"), token);

  for (const locale of ["ko", "en", "vi", "mn"]) {
    const copy = deletionVerificationCopy(locale);
    assertOk(copy.subject.trim().length > 0, `${locale} needs a subject`);
    assertOk(copy.body.trim().length > 0, `${locale} needs a body`);

    // The mail goes to an address that may not have asked for anything. It must
    // say so, and it must not imply that anything has been deleted already.
    assertOk(copy.body.length > 80, `${locale} body is too short to explain what to do and what to ignore`);
  }

  assert.deepEqual(
    deletionVerificationCopy("zz"),
    deletionVerificationCopy("ko"),
    "an unknown locale must fall back rather than send an empty mail",
  );
}

console.log("PASS deletion verification: the link round-trips and every locale has usable copy");
