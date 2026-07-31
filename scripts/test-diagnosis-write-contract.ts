import assert from "node:assert/strict";
import { leadSchema } from "../src/lib/data/lead-payload";
import { parseLocalizedTextArray } from "../src/lib/data/localized-text";
import { DIAGNOSIS_GOALS, recommendPath, type DiagnosisInput } from "../src/lib/data/diagnosis";

// The diagnosis engine and the endpoint that stores its output disagreed, and
// nothing compared them. POST /api/leads declared warnings and nextActions as
// z.array(z.string()); recommendPath() has always returned {ko,vi,mn,en} objects.
// So EVERY completed diagnosis was rejected 400, and useLeadStore.saveDiagnosis
// caught it, wrote a local-<timestamp> lead and returned its id — the wizard
// reported success and the admin inbox received nothing.
//
// The existing scripts/test-leads-validation.ts could not catch it: its fixture
// is three hand-written fields and never sends warnings or nextActions at all.
// That is the lesson here — a fixture the test author invents can agree with a
// schema the producer does not.
//
// So this builds the payload from the REAL engine, across every goal the wizard
// offers, and validates it with the REAL route schema. It needs no credentials,
// because the schema is now a module rather than a private const inside a route.

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assertOk(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

const NATIONALITIES = ["vn", "mn", "cn", "uz"] as const;
const KOREAN_LEVELS = ["none", "topik2", "topik3"] as const;

function inputFor(goal: DiagnosisInput["goal"], nationality: string, korean: DiagnosisInput["korean"]): DiagnosisInput {
  return {
    nationality,
    age: "24",
    education: "university",
    korean,
    goal,
    currentVisa: goal === "in_korea_job" || goal === "in_korea_employment" ? "D-2" : "",
    budget: 15_000_000,
    region: "seoul",
    usingBroker: false,
    brokerCost: 0,
    hasHistory: false,
  };
}

/** Exactly what src/store/kbridge.ts sends. Kept in this shape on purpose. */
function writePayload(input: DiagnosisInput) {
  const recommendation = recommendPath(input);
  return {
    nickname: "익명",
    nationality: input.nationality,
    age: Number(input.age) || 0,
    education: input.education,
    koreanLevel: input.korean,
    goal: input.goal,
    budget: input.budget,
    region: input.region,
    usingBroker: input.usingBroker,
    brokerCost: input.brokerCost,
    hasHistory: input.hasHistory,
    pathKey: recommendation.pathKey,
    estimatedCost: recommendation.estimatedCost,
    prepTime: recommendation.prepTime.en,
    requiredDocs: recommendation.requiredDocs,
    warnings: recommendation.warnings,
    nextActions: recommendation.nextActions,
  };
}

// 1. Every combination the wizard can produce must be accepted by the route
//    schema. This is the assertion that was missing.
{
  let checked = 0;
  const rejected: string[] = [];

  for (const goal of DIAGNOSIS_GOALS) {
    for (const nationality of NATIONALITIES) {
      for (const korean of KOREAN_LEVELS) {
        const label = `${goal}/${nationality}/${korean}`;
        const parsed = leadSchema.safeParse(writePayload(inputFor(goal, nationality, korean)));
        checked += 1;
        if (!parsed.success) {
          rejected.push(
            `${label}: ${parsed.error.issues.slice(0, 2).map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`,
          );
        }
      }
    }
  }

  assertOk(
    checked >= 24,
    `the matrix must cover at least the 24 combinations the plan asks for, covered ${checked}`,
  );
  assertOk(
    rejected.length === 0,
    `${rejected.length}/${checked} real diagnoses are rejected by the route schema:\n    ${rejected.slice(0, 6).join("\n    ")}`,
  );

  console.log(`PASS diagnosis write contract: ${checked} real engine payloads accepted by the route schema`);
}

// 2. The localized text must survive the round trip. Accepting the payload is
//    not enough if the four locales are flattened on the way in or out — an
//    operator would see a lead whose warnings exist but say nothing.
{
  const payload = writePayload(inputFor("degree", "vn", "topik3"));
  const parsed = leadSchema.parse(payload);

  assertOk(parsed.warnings.length > 0, "this fixture must produce at least one warning, or the check below is vacuous");

  const stored = JSON.stringify(parsed.warnings);
  const restored = parseLocalizedTextArray(stored);
  assert.deepEqual(restored, parsed.warnings, "warnings must survive the JSON column round trip unchanged");

  for (const entry of restored) {
    for (const locale of ["ko", "vi", "mn", "en"] as const) {
      assertOk(
        typeof entry[locale] === "string" && entry[locale].length > 0,
        `every warning must carry non-empty ${locale} text after the round trip`,
      );
    }
  }

  console.log("PASS diagnosis write contract: four-locale text survives the JSON column round trip");
}

// 3. Rows written before this fix can only hold plain strings, because that is
//    all the old schema let through. Reading one must widen rather than drop it,
//    or opening an old lead shows an empty warnings list.
{
  const legacy = parseLocalizedTextArray(JSON.stringify(["기존 문자열 경고"]));
  assert.equal(legacy.length, 1, "a legacy string row must not be dropped");
  assert.equal(legacy[0]!.ko, "기존 문자열 경고", "the legacy text must be preserved");
  assert.equal(legacy[0]!.en, "기존 문자열 경고", "a legacy string is shown in every locale rather than blanked");

  assert.deepEqual(parseLocalizedTextArray("not json"), [], "unparseable JSON reads as empty, never throws");
  assert.deepEqual(parseLocalizedTextArray(null), [], "a null column reads as empty");
  assert.deepEqual(
    parseLocalizedTextArray(JSON.stringify([{ ko: "부분" }])),
    [],
    "a partial locale object is not a LocalizedText and must not be presented as one",
  );

  console.log("PASS diagnosis write contract: legacy string rows widen, malformed rows read as empty");
}

// 4. The schema must not have been loosened into accepting anything. If someone
//    "fixes" a future mismatch by relaxing the field, this fails.
{
  const base = writePayload(inputFor("language", "vn", "none"));

  const withStrings = leadSchema.safeParse({ ...base, warnings: ["plain string"] });
  assertOk(
    !withStrings.success,
    "the schema must still reject a bare string[] — that shape is what silently dropped three locales",
  );

  const withPartial = leadSchema.safeParse({ ...base, nextActions: [{ ko: "한국어만" }] });
  assertOk(!withPartial.success, "a partial locale object must be rejected, not stored half-filled");

  console.log("PASS diagnosis write contract: the schema is specific, not permissive");
}
