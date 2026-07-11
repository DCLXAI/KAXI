import { strict as assert } from "assert";
import { prepareTestDb } from "./prepare-test-db";

// Pure PII-plumbing dependency for POST /api/leads (contact is optional in
// these fixtures, but preparePiiField/canPersistPiiValue still run).
process.env.DATA_ENCRYPTION_KEY = "leads-validation-test-key-0123456789abcdef0123456789abcdef01";
process.env.PII_HASH_SECRET = "leads-validation-test-hash-secret";

prepareTestDb("leads validation");

const { NextRequest } = await import("next/server");
const { POST } = await import("../src/app/api/leads/route");
const { db } = await import("../src/lib/db");

function req(body: unknown) {
  return new NextRequest("http://localhost/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  nickname: "테스트유저",
  nationality: "vn",
  pathKey: "goal_language",
};

// 1. A well-formed body is accepted, and an omitted numeric field defaults to 0
// instead of being required.
{
  const res = await POST(req(validBody));
  assert.equal(res.status, 201, `expected 201 for a valid body, got ${res.status}`);
  const json = await res.json();
  assert.equal(json.lead.age, 0, "omitted age should default to 0");
}
console.log("PASS valid lead body -> 201, omitted age defaults to 0");

// 2. Regression guard: age:"abc" used to silently coerce to 0 via
// `Number(age) || 0`. zod must reject it with 400 instead of persisting junk.
{
  const res = await POST(req({ ...validBody, age: "abc" }));
  assert.equal(res.status, 400, `expected 400 for age:"abc", got ${res.status}`);
  const json = await res.json();
  assert.ok(Array.isArray(json.issues), "expected a structured issues array in the 400 response");
}
console.log('PASS age:"abc" is rejected with 400 (no more silent 0-coercion)');

// 3. A numeric field supplied as a numeric *string* is still accepted
// (coercion is intentionally preserved for legitimate form-encoded values).
{
  const res = await POST(req({ ...validBody, age: "25" }));
  assert.equal(res.status, 201, `expected 201 for age:"25", got ${res.status}`);
  const json = await res.json();
  assert.equal(json.lead.age, 25, "numeric string age should coerce to a number");
}
console.log('PASS age:"25" (numeric string) still coerces and persists as 25');

// 4. Missing a required field (nickname) is rejected with 400.
{
  const { nickname: _nickname, ...withoutNickname } = validBody;
  const res = await POST(req(withoutNickname));
  assert.equal(res.status, 400, `expected 400 for missing nickname, got ${res.status}`);
}
console.log("PASS missing required field nickname -> 400");

// 5. Regression guard: education used to be persisted via String(undefined),
// producing the literal string "undefined" when the field was omitted.
{
  const res = await POST(req(validBody));
  assert.equal(res.status, 201, `expected 201, got ${res.status}`);
  const json = await res.json();
  const stored = await db.diagnosisLead.findUnique({ where: { id: json.lead.id } });
  assert.equal(
    stored?.education,
    "",
    `expected education to default to "" for an omitted field, got ${JSON.stringify(stored?.education)}`
  );
}
console.log('PASS missing education stored as "" (regression guard: previously String(undefined) = "undefined")');

await db.$disconnect();

console.log(
  "PASS leads validation: zod schema rejects malformed numbers/missing required fields and defaults optional strings safely"
);
