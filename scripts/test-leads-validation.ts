import { strict as assert } from "assert";
import { prepareTestDb } from "./prepare-test-db";

// Pure PII-plumbing dependency for POST /api/leads (contact is optional in
// these fixtures, but preparePiiField/canPersistPiiValue still run).
process.env.DATA_ENCRYPTION_KEY = "leads-validation-test-key-0123456789abcdef0123456789abcdef01";
process.env.PII_HASH_SECRET = "leads-validation-test-hash-secret";
process.env.ADMIN_API_KEY = "leads-validation-admin-key";

prepareTestDb("leads validation");

const { NextRequest } = await import("next/server");
const { GET, POST } = await import("../src/app/api/leads/route");
const { db } = await import("../src/lib/db");
const { recommendPath } = await import("../src/lib/data/diagnosis");

function req(body: unknown) {
  return new NextRequest("http://localhost/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function adminReq(path: string) {
  return new NextRequest(`http://localhost${path}`, {
    headers: { "x-admin-key": "leads-validation-admin-key" },
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
  assert.equal(res.status, 400, `expected 400 for currentVisa:"C-3", got ${res.status}`);
  const json = await res.json();
  assert.ok(Array.isArray(json.issues), "expected a structured issues array in the 400 response");
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

// --- Read path: the shape the admin inbox is typed against -------------------
//
// DiagnosisLead stores three result fields as JSON *strings* (requiredDocs,
// warningsJson, nextActionsJson) but `Lead` in src/store/kbridge.ts declares
// them as arrays, and AdminLeadDetailModal maps over them. Nothing used to
// decode them on the way out, so `requiredDocs` reached the modal as the string
// '["docs_doc_passport",...]': the `.length > 0` guard passed (non-empty
// string) and `.map` then threw at render. `warnings`/`nextActions` were simply
// absent, because the response carried the raw `warningsJson` column name.
//
// These cases drive a real recommendation through the exact body saveDiagnosis
// POSTs, then read it back the way fetchLeads does. Both halves are load-bearing:
// the write path has to accept the localized objects the engine produces, and
// the read path has to hand back arrays.
const readPathNickname = `readpath-${Date.now()}`;
const recommendation = recommendPath({
  nationality: "vn",
  age: "22",
  education: "highschool",
  korean: "none",
  goal: "language",
  budget: 3_000_000,
  region: "seoul",
  usingBroker: true,
  brokerCost: 5_000_000,
  hasHistory: true,
});

// The fixture is only meaningful if the engine actually produced localized
// entries — an empty array would let a string-only schema pass by accident.
assert.ok(
  recommendation.requiredDocs.length > 0 &&
    recommendation.warnings.length > 0 &&
    recommendation.nextActions.length > 0,
  "fixture must produce docs, warnings and next actions, otherwise the shape assertions below are vacuous"
);
assert.equal(
  typeof recommendation.warnings[0],
  "object",
  "warnings are localized {ko,vi,mn,en} objects — if this became a string, revisit the leads schema"
);

// 9. The body saveDiagnosis sends is accepted. It used to 400: the schema
// declared warnings/nextActions as z.array(z.string()) while the engine emits
// {ko,vi,mn,en} objects, so every diagnosis carrying a warning or a next action
// (i.e. effectively all of them) silently fell back to a local-only lead.
let createdLeadId: string;
{
  const res = await POST(
    req({
      nickname: readPathNickname,
      nationality: "vn",
      age: 22,
      education: "highschool",
      koreanLevel: "none",
      goal: "language",
      budget: 3_000_000,
      region: "seoul",
      usingBroker: true,
      brokerCost: 5_000_000,
      hasHistory: true,
      pathKey: recommendation.pathKey,
      estimatedCost: recommendation.estimatedCost,
      prepTime: recommendation.prepTime.en,
      requiredDocs: recommendation.requiredDocs,
      warnings: recommendation.warnings,
      nextActions: recommendation.nextActions,
    })
  );
  const json = await res.json();
  assert.equal(
    res.status,
    201,
    `a real recommendation body must persist, got ${res.status}: ${JSON.stringify(json)}`
  );
  createdLeadId = json.lead.id;
}
console.log("PASS a real recommendation body (localized warnings/nextActions) is accepted, not 400");

// 10. Both responses that feed useLeadStore.leads — the POST echo used by
// saveDiagnosis and the GET list used by fetchLeads — must satisfy the `Lead`
// type the modal renders against.
{
  const listRes = await GET(adminReq(`/api/leads?q=${encodeURIComponent(readPathNickname)}`));
  assert.equal(listRes.status, 200, `expected 200 from GET /api/leads, got ${listRes.status}`);
  const { leads } = await listRes.json();
  const fromList = leads.find((lead: { id: string }) => lead.id === createdLeadId);
  assert.ok(fromList, "the created lead should come back from GET /api/leads");

  const postEcho = await (await POST(
    req({
      nickname: `${readPathNickname}-echo`,
      nationality: "vn",
      pathKey: recommendation.pathKey,
      requiredDocs: recommendation.requiredDocs,
      warnings: recommendation.warnings,
      nextActions: recommendation.nextActions,
    })
  )).json();

  for (const [source, lead] of [["GET /api/leads", fromList], ["POST /api/leads", postEcho.lead]] as const) {
    assert.ok(
      Array.isArray(lead.requiredDocs),
      `${source} must return requiredDocs as an array — AdminLeadDetailModal maps over it, and a JSON string passes the .length guard then throws. Got ${typeof lead.requiredDocs}: ${JSON.stringify(lead.requiredDocs)}`
    );
    assert.deepEqual(
      lead.requiredDocs,
      recommendation.requiredDocs,
      `${source} must round-trip the exact document keys`
    );

    assert.ok(
      Array.isArray(lead.warnings),
      `${source} must expose warnings as an array under the name the modal reads, not the raw warningsJson column`
    );
    assert.deepEqual(lead.warnings, recommendation.warnings, `${source} must round-trip localized warnings`);
    assert.ok(
      Array.isArray(lead.nextActions),
      `${source} must expose nextActions as an array under the name the client type declares`
    );
    assert.deepEqual(
      lead.nextActions,
      recommendation.nextActions,
      `${source} must round-trip localized next actions`
    );

    // The undecoded columns must not also ship: two names for one field is how
    // the modal ended up reading an always-undefined `warnings` in the first place.
    assert.ok(
      !("warningsJson" in lead) && !("nextActionsJson" in lead),
      `${source} must not leak the raw *Json column names alongside the decoded fields`
    );
  }

  // The precise render the modal performs, against the list payload.
  assert.doesNotThrow(() => {
    if (fromList.requiredDocs && fromList.requiredDocs.length > 0) fromList.requiredDocs.map((key: string) => key);
    if (fromList.warnings && fromList.warnings.length > 0) fromList.warnings.map((w: { ko: string }) => w.ko);
  }, "AdminLeadDetailModal's own access pattern must not throw on an API-fetched lead");
}
console.log("PASS API-fetched leads expose requiredDocs/warnings/nextActions as arrays the admin modal can render");

await db.$disconnect();

console.log(
  "PASS leads validation: zod schema rejects malformed numbers/missing required fields and defaults optional strings safely"
);
