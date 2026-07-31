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

// The 400 contract changed with P0-3: `issues` became `fieldErrors`, keyed by
// field path, alongside `code` and `retryable`. The client needs `retryable` to
// tell a refusal from an outage — without it, saveDiagnosis treated a rejected
// payload exactly like a dropped connection and fabricated a local lead.
//
// These assertions are deliberately stronger than the ones they replace, which
// only checked that *some* array existed and never that the right field was
// named.
async function assertContractRejection(res: Response, field: string, label: string) {
  assert.equal(res.status, 400, `expected 400 for ${label}, got ${res.status}`);
  const json = await res.json() as {
    ok?: boolean;
    persisted?: boolean;
    code?: string;
    retryable?: boolean;
    fieldErrors?: Record<string, string[]>;
    requestId?: string;
  };
  assert.equal(json.ok, false, `${label}: a rejection must report ok:false`);
  assert.equal(json.persisted, false, `${label}: a rejection must report persisted:false`);
  assert.equal(json.code, "LEAD_PAYLOAD_INVALID", `${label}: expected LEAD_PAYLOAD_INVALID, got ${json.code}`);
  assert.equal(
    json.retryable,
    false,
    `${label}: a schema rejection is not retryable — retrying the same body cannot help, and marking it retryable is what let the client keep a local-only lead`,
  );
  assert.ok(json.requestId, `${label}: a rejection must carry a requestId so it can be traced`);
  assert.ok(
    json.fieldErrors && Array.isArray(json.fieldErrors[field]) && json.fieldErrors[field].length > 0,
    `${label}: fieldErrors must name "${field}", got ${JSON.stringify(json.fieldErrors)}`,
  );
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
  await assertContractRejection(res, "age", 'age:"abc"');
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

// 6. In-Korea diagnosis paths capture the student's current visa; a valid
// value persists and echoes back in the response.
{
  const res = await POST(req({ ...validBody, currentVisa: "D-2" }));
  assert.equal(res.status, 201, `expected 201 for currentVisa:"D-2", got ${res.status}`);
  const json = await res.json();
  assert.equal(json.lead.currentVisa, "D-2", "currentVisa should echo back D-2");
  const stored = await db.diagnosisLead.findUnique({ where: { id: json.lead.id } });
  assert.equal(stored?.currentVisa, "D-2", "currentVisa should persist as D-2");
}
console.log('PASS currentVisa:"D-2" persists and echoes');

// 7. Regression guard: an out-of-enum currentVisa must be rejected with 400,
// not silently coerced or persisted.
{
  const res = await POST(req({ ...validBody, currentVisa: "C-3" }));
  await assertContractRejection(res, "currentVisa", 'currentVisa:"C-3"');
}
console.log('PASS currentVisa:"C-3" is rejected with 400');

// 8. Omitted currentVisa defaults to "" (matches the education/goal
// omitted-optional-string convention).
{
  const res = await POST(req(validBody));
  assert.equal(res.status, 201, `expected 201, got ${res.status}`);
  const json = await res.json();
  assert.equal(json.lead.currentVisa, "", 'omitted currentVisa should default to ""');
}
console.log('PASS omitted currentVisa defaults to ""');

await db.$disconnect();

console.log(
  "PASS leads validation: zod schema rejects malformed numbers/missing required fields and defaults optional strings safely"
);
