import type { DiagnosisInput } from "../src/lib/data/diagnosis";
import { prepareTestDb } from "./prepare-test-db";

prepareTestDb("diagnosis rules");

const [{ recommendPath }, { KNOWLEDGE_DOCS }, { TOOL_MAP, isRecord }, { evaluateVisaRules }] =
  await Promise.all([
    import("../src/lib/data/diagnosis"),
    import("../src/lib/data/knowledge"),
    import("../src/lib/agent/tools"),
    import("../src/lib/rules/visa-rules"),
  ]);

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

function assertNoPublicDebugFields(value: unknown, label: string): void {
  const serialized = JSON.stringify(value);
  for (const forbidden of ["appliedRules", "applied_rules", "sourceRefs", "source_refs", "compliance_rule_meta"]) {
    assert(!serialized.includes(forbidden), `${label} should not expose ${forbidden}: ${serialized}`);
  }
}

const base: DiagnosisInput = {
  nationality: "vn",
  age: "20",
  education: "highschool",
  korean: "none",
  goal: "language",
  budget: 10_000_000,
  region: "any",
  usingBroker: false,
  brokerCost: 0,
  hasHistory: false,
};
const knowledgeIds = new Set(KNOWLEDGE_DOCS.map((doc) => doc.id));

function assertSourceRefsExist(result: ReturnType<typeof recommendPath>) {
  for (const ref of result.sourceRefs) {
    if (!ref.startsWith("knowledge:")) continue;
    const docId = ref.slice("knowledge:".length);
    assert(knowledgeIds.has(docId), `diagnosis sourceRef should point to an existing knowledge doc: ${ref}`);
  }
}

function testLanguagePathKeepsCoreOutputShape() {
  const result = recommendPath(base);

  assert(result.pathKey === "goal_language", `language profile should be selected: ${JSON.stringify(result)}`);
  assert(result.visaType === "D-4", `language profile should expose D-4 visa type: ${JSON.stringify(result)}`);
  assert(result.estimatedCost === 8_000_000, `language cost should remain 8M baseline: ${JSON.stringify(result)}`);
  assert(result.requiredDocs.includes("docs_doc_business"), `language path should include school business doc: ${JSON.stringify(result)}`);
  assert(result.requiredDocs.includes("docs_doc_tuberculosis"), `Vietnamese student should include TB doc: ${JSON.stringify(result)}`);
  assert(result.riskLevel === "low", `baseline language path should be low risk: ${JSON.stringify(result)}`);
  assert(result.confidence === "high", `specific baseline should be high confidence: ${JSON.stringify(result)}`);
  assert(result.appliedRules.includes("profile:goal_language"), `profile rule should be recorded: ${JSON.stringify(result)}`);
  assertSourceRefsExist(result);
}

function testReadinessScoreIsComputed() {
  const result = recommendPath(base);
  assert(result.readiness !== undefined, "readiness must be attached to recommendation");
  assert(typeof result.readiness!.score === "number", "readiness score must be a number");
  assert(result.readiness!.score >= 0 && result.readiness!.score <= 100, "score must be 0-100");
  assert(["low", "medium", "high"].includes(result.readiness!.riskLevel), "riskLevel must be valid");
  assert(Array.isArray(result.readiness!.factors), "factors must be an array");
}

function testReadinessBlockedReasonsForceHighRisk() {
  const compliance = evaluateVisaRules({
    visa_type: "D-2",
    nationality: "vn",
    asks_for_fake_documents: true,
  });
  const result = recommendPath(
    {
      ...base,
      goal: "degree",
      korean: "topik3",
      budget: 20_000_000,
    },
    { visaRuleEvaluation: compliance }
  );

  const readiness = result.readiness;
  assert(readiness, `blocked profile should include readiness: ${JSON.stringify(result)}`);
  assert(readiness.score <= 29, `blocked reasons must cap score below 30: ${JSON.stringify(readiness)}`);
  assert(readiness.riskLevel === "high", `blocked reasons must force high risk: ${JSON.stringify(readiness)}`);
  assert(readiness.confidence !== "high", `blocked reasons must not show high confidence: ${JSON.stringify(readiness)}`);
  assert(
    readiness.factors[0]?.id === "compliance_blocked",
    `blocked factor should be the top influence: ${JSON.stringify(readiness.factors)}`
  );

  const withAccreditedSchools = recommendPath(
    {
      ...base,
      goal: "degree",
      korean: "topik3",
      budget: 20_000_000,
    },
    {
      visaRuleEvaluation: compliance,
      selectedSchoolAccreditations: ["accredited", "accredited"],
    }
  ).readiness;
  assert(withAccreditedSchools, "blocked profile with selected schools should include readiness");
  assert(
    withAccreditedSchools.score <= 29 && withAccreditedSchools.riskLevel === "high",
    `selected accredited schools must not override blocked hard cap: ${JSON.stringify(withAccreditedSchools)}`
  );
}

function testSelectedSchoolsAffectReadinessFactors() {
  const baseDegree = {
    ...base,
    goal: "degree" as const,
    korean: "topik3" as const,
    budget: 20_000_000,
  };
  const noSchool = recommendPath(baseDegree).readiness;
  const accredited = recommendPath(baseDegree, {
    selectedSchoolAccreditations: ["accredited"],
  }).readiness;
  const caution = recommendPath(baseDegree, {
    selectedSchoolAccreditations: ["caution"],
  }).readiness;

  assert(noSchool && accredited && caution, "school readiness scenarios should include readiness");
  assert(
    accredited.score > noSchool.score,
    `accredited school should improve readiness score: ${JSON.stringify({ noSchool, accredited })}`
  );
  assert(
    caution.score < noSchool.score,
    `caution school should reduce readiness score: ${JSON.stringify({ noSchool, caution })}`
  );
  assert(
    accredited.factors.some((factor) => factor.id === "school_accredited"),
    `accredited school should add school_accredited factor: ${JSON.stringify(accredited.factors)}`
  );
  assert(
    caution.factors.some((factor) => factor.id === "school_caution"),
    `caution school should add school_caution factor: ${JSON.stringify(caution.factors)}`
  );
}

function testDegreePathExplainsLanguageAndBudgetRisk() {
  const result = recommendPath({
    ...base,
    goal: "degree",
    korean: "topik1",
    budget: 5_000_000,
    region: "seoul",
  });

  assert(result.pathKey === "goal_degree", `degree goal should select degree profile: ${JSON.stringify(result)}`);
  assert(result.estimatedCost === 13_200_000, `Seoul degree cost should include region multiplier: ${JSON.stringify(result)}`);
  assert(result.riskLevel === "high", `degree + low Korean + budget gap should be high risk: ${JSON.stringify(result)}`);
  assert(result.confidence === "medium", `budget gap should lower confidence: ${JSON.stringify(result)}`);
  assert(result.appliedRules.includes("rule:korean-language-bridge"), `low Korean bridge rule missing: ${JSON.stringify(result)}`);
  assert(result.appliedRules.includes("rule:budget-gap"), `budget gap rule missing: ${JSON.stringify(result)}`);
  assert(result.warnings.length >= 2, `degree risk should produce warnings: ${JSON.stringify(result)}`);
  assertSourceRefsExist(result);
}

function testHistoryAndBrokerEscalateRisk() {
  const result = recommendPath({
    ...base,
    goal: "transfer",
    korean: "topik3",
    budget: 20_000_000,
    usingBroker: true,
    brokerCost: 6_000_000,
    hasHistory: true,
  });

  assert(result.pathKey === "goal_transfer", `transfer goal should select transfer profile: ${JSON.stringify(result)}`);
  assert(result.riskLevel === "high", `visa history + broker cost should be high risk: ${JSON.stringify(result)}`);
  assert(result.appliedRules.includes("rule:visa-history-escalation"), `history rule missing: ${JSON.stringify(result)}`);
  assert(result.appliedRules.includes("rule:broker-cost-review"), `broker rule missing: ${JSON.stringify(result)}`);
  assert(/행정사|chuyên gia|мэргэжлийн|administrative/.test(JSON.stringify(result.warnings)), `history warning should recommend expert review: ${JSON.stringify(result)}`);
  assertSourceRefsExist(result);
}

function testUnsureGoalUsesLanguageBridgeForLowKorean() {
  const result = recommendPath({
    ...base,
    goal: "unsure",
    korean: "none",
    nationality: "other",
  });

  assert(result.pathKey === "goal_language", `unsure + no Korean should start with language path: ${JSON.stringify(result)}`);
  assert(result.confidence === "medium", `unsure or other nationality should lower confidence: ${JSON.stringify(result)}`);
  assertSourceRefsExist(result);
}

function testComplianceEvaluationGroundsDiagnosisRecommendation() {
  const compliance = evaluateVisaRules({
    visa_type: "D-2",
    nationality: "vn",
    has_refusal_history: true,
  });
  const result = recommendPath(
    {
      ...base,
      goal: "degree",
      korean: "topik3",
      budget: 20_000_000,
      hasHistory: true,
    },
    { visaRuleEvaluation: compliance }
  );

  assert(result.visaType === "D-2", `degree profile should expose D-2 visa type: ${JSON.stringify(result)}`);
  assert(result.compliance, `diagnosis should embed compliance evaluation: ${JSON.stringify(result)}`);
  assert(
    result.compliance?.documents.some((doc) => doc.id === "financial_proof"),
    `compliance documents should include financial proof: ${JSON.stringify(result.compliance)}`
  );
  assert(
    result.compliance?.documents.some((doc) => doc.id === "tuberculosis_certificate"),
    `Vietnamese compliance documents should include TB certificate: ${JSON.stringify(result.compliance)}`
  );
  assert(
    result.appliedRules.some((rule) => rule.startsWith("compliance:")),
    `diagnosis appliedRules should include compliance rule IDs: ${JSON.stringify(result)}`
  );
  assert(
    result.sourceRefs.some((ref) => ref.startsWith("compliance:")),
    `diagnosis sourceRefs should include compliance sources: ${JSON.stringify(result)}`
  );
  assert(
    result.complianceCoverage.status === "rule_engine" && result.complianceCoverage.visaType === "D-2",
    `diagnosis should declare D-2 rule-engine coverage: ${JSON.stringify(result.complianceCoverage)}`
  );
}

function testD10CareerPathDeclaresRagOnlyCompliancePolicy() {
  const result = recommendPath({
    ...base,
    goal: "career",
    korean: "topik3",
    budget: 20_000_000,
  });

  assert(result.pathKey === "goal_career", `career goal should select D-10 path: ${JSON.stringify(result)}`);
  assert(result.visaType === "D-10", `career path should expose D-10 visa type: ${JSON.stringify(result)}`);
  assert(
    result.complianceCoverage.status === "rag_only" &&
      result.complianceCoverage.unsupportedReason === "d10_compliance_rule_engine_not_implemented",
    `D-10 path should explicitly declare RAG-only compliance coverage: ${JSON.stringify(result.complianceCoverage)}`
  );
  assert(
    result.appliedRules.includes("policy:d10-rag-only-compliance"),
    `D-10 path should record the explicit coverage policy: ${JSON.stringify(result.appliedRules)}`
  );
  assert(result.riskLevel === "medium", `D-10 RAG-only policy should raise risk to medium: ${JSON.stringify(result)}`);
  assert(result.confidence === "medium", `D-10 RAG-only policy should avoid high confidence: ${JSON.stringify(result)}`);
  assert(/D-10|rule engine|RAG/.test(JSON.stringify(result.warnings)), `D-10 warning should explain coverage limit: ${JSON.stringify(result.warnings)}`);
}

async function testDiagnoseToolReturnsComplianceMeta() {
  const output = await TOOL_MAP.diagnose_path.execute(
    {
      nationality: "vn",
      age: 20,
      education: "highschool",
      korean_level: "topik3",
      goal: "degree",
      budget: 20_000_000,
      has_history: true,
    },
    { lang: "ko", dryRun: true }
  );

  const result = output.result;
  if (!isRecord(result)) fail(`diagnose_path should return an object result: ${JSON.stringify(output)}`);

  assert(result.visa_type === "D-2", `diagnose_path should expose visa_type: ${JSON.stringify(result)}`);
  assert(
    Array.isArray(result.compliance_documents) &&
      result.compliance_documents.some((doc) => isRecord(doc) && doc.id === "financial_proof"),
    `diagnose_path should include compliance documents: ${JSON.stringify(result)}`
  );
  // User payload is sanitized (no raw compliance_rule_meta / source_refs at top level for user)
  assert(
    !("compliance_rule_meta" in result) || result.compliance_rule_meta == null,
    `user payload should not expose raw compliance_rule_meta: ${JSON.stringify(result)}`
  );
  assertNoPublicDebugFields(result, "diagnose_path user payload");
  assert(
    Array.isArray(result.compliance_documents) &&
      result.compliance_documents.some((doc) => isRecord(doc) && doc.id === "financial_proof"),
    `diagnose_path should include compliance documents: ${JSON.stringify(result)}`
  );
  // Readiness should be present
  assert(
    isRecord(result.readiness) && typeof result.readiness.score === "number",
    `diagnose_path should include readiness score: ${JSON.stringify(result)}`
  );
}

async function testDiagnoseToolReturnsD10CoveragePolicy() {
  const output = await TOOL_MAP.diagnose_path.execute(
    {
      nationality: "vn",
      age: 24,
      education: "university",
      korean_level: "topik3",
      goal: "career",
      budget: 20_000_000,
    },
    { lang: "ko", dryRun: true }
  );

  const result = output.result;
  if (!isRecord(result)) fail(`diagnose_path should return an object result: ${JSON.stringify(output)}`);

  assert(result.visa_type === "D-10", `diagnose_path should expose D-10 visa_type: ${JSON.stringify(result)}`);
  assert(
    isRecord(result.compliance_coverage) &&
      result.compliance_coverage.status === "rag_only" &&
      result.compliance_coverage.unsupportedReason === "d10_compliance_rule_engine_not_implemented",
    `diagnose_path should expose D-10 RAG-only compliance coverage: ${JSON.stringify(result)}`
  );
  assert(
    !("compliance_rule_meta" in result) || result.compliance_rule_meta == null,
    `D-10 user payload should not include rule-engine metadata: ${JSON.stringify(result)}`
  );
  assertNoPublicDebugFields(result, "D-10 diagnose_path user payload");
}

async function testDiagnosisApiReturnsPublicReadinessPayload() {
  const { NextRequest } = await import("next/server");
  const { POST } = await import("../src/app/api/diagnosis/route");
  const input: DiagnosisInput = {
    ...base,
    goal: "degree",
    korean: "topik3",
    budget: 20_000_000,
    hasHistory: true,
  };
  const response = await POST(
    new NextRequest("http://localhost/api/diagnosis", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    })
  );
  const body = await response.json();

  assert(response.status === 200, `diagnosis API should accept valid input: ${JSON.stringify(body)}`);
  assert(body.complianceCoverage?.status === "rule_engine", `diagnosis API should use compliance engine: ${JSON.stringify(body)}`);
  assert(body.readiness?.score >= 0, `diagnosis API should include readiness score: ${JSON.stringify(body)}`);
  assertNoPublicDebugFields(body, "diagnosis API public payload");

  const invalid = await POST(
    new NextRequest("http://localhost/api/diagnosis", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ goal: "degree" }),
    })
  );
  assert(invalid.status === 400, `diagnosis API should reject invalid payloads, got ${invalid.status}`);
}

async function testDiagnosisApiTransferUsesD4ToD2ComplianceRule() {
  const { NextRequest } = await import("next/server");
  const { POST } = await import("../src/app/api/diagnosis/route");
  const response = await POST(
    new NextRequest("http://localhost/api/diagnosis", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...base,
        goal: "transfer",
        korean: "topik2",
        budget: 12_000_000,
      }),
    })
  );
  const body = await response.json();

  assert(response.status === 200, `transfer diagnosis API should accept valid input: ${JSON.stringify(body)}`);
  assert(body.visaType === "D-2", `transfer path should still recommend D-2 target: ${JSON.stringify(body)}`);
  assert(body.riskLevel === "high", `D-4 to D-2 transfer human review should force high risk: ${JSON.stringify(body)}`);
  assert(body.compliance?.visaType === "D-4", `compliance should evaluate current D-4 transfer facts: ${JSON.stringify(body)}`);
  assert(
    body.compliance?.documents?.some((doc: { id?: string }) => doc.id === "d4_d2_transfer_docs"),
    `transfer compliance should include D-4 to D-2 documents: ${JSON.stringify(body)}`
  );
  assert(
    Array.isArray(body.compliance?.partnerEscalationReasons) &&
      body.compliance.partnerEscalationReasons.length > 0,
    `transfer compliance should include partner escalation reasons: ${JSON.stringify(body)}`
  );
  assert(
    body.readiness?.riskLevel === "high" && body.readiness?.score <= 44,
    `transfer readiness should reflect human-review high risk: ${JSON.stringify(body.readiness)}`
  );
}

async function testDiagnosisApiZodValidation() {
  const { NextRequest } = await import("next/server");
  const { POST } = await import("../src/app/api/diagnosis/route");
  const req = (body: unknown) =>
    new NextRequest("http://localhost/api/diagnosis", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

  // 1. Comma-formatted budget string must be parsed exactly like the old
  // hand-rolled numberField helper (regression guard for the zod migration).
  const commaResponse = await POST(
    req({ ...base, goal: "language", budget: "6,000,000" })
  );
  const commaBody = await commaResponse.json();
  assert(commaResponse.status === 200, `comma-formatted budget should be accepted: ${JSON.stringify(commaBody)}`);
  assert(
    commaBody.warnings.some((w: { ko?: string }) => typeof w.ko === "string" && w.ko.includes("2,000,000")),
    `budget "6,000,000" should be parsed as 6,000,000 KRW, producing a 2,000,000 KRW gap warning: ${JSON.stringify(commaBody.warnings)}`
  );

  // 2. Missing required enum field (education) -> 400 with structured issues.
  const { education: _education, ...withoutEducation } = base;
  const missingResponse = await POST(req(withoutEducation));
  const missingBody = await missingResponse.json();
  assert(missingResponse.status === 400, `missing education should be rejected: ${missingResponse.status}`);
  assert(Array.isArray(missingBody.issues), `400 response should include structured issues: ${JSON.stringify(missingBody)}`);

  // 3. Invalid enum value (goal) -> 400.
  const invalidEnumResponse = await POST(req({ ...base, goal: "not-a-real-goal" }));
  assert(invalidEnumResponse.status === 400, `invalid goal enum should be rejected: ${invalidEnumResponse.status}`);

  // 4. Non-required fields with garbage values fall back exactly like the
  // old helpers instead of erroring (region typo -> "any", non-numeric
  // brokerCost -> 0, boolean-ish string usingBroker -> true).
  const fallbackResponse = await POST(
    req({ ...base, region: "not-a-real-region", brokerCost: "abc", usingBroker: "yes" })
  );
  const fallbackBody = await fallbackResponse.json();
  assert(fallbackResponse.status === 200, `garbage optional fields should fall back, not 400: ${JSON.stringify(fallbackBody)}`);
}

testLanguagePathKeepsCoreOutputShape();
testReadinessScoreIsComputed();
testReadinessBlockedReasonsForceHighRisk();
testSelectedSchoolsAffectReadinessFactors();
testDegreePathExplainsLanguageAndBudgetRisk();
testHistoryAndBrokerEscalateRisk();
testUnsureGoalUsesLanguageBridgeForLowKorean();
testComplianceEvaluationGroundsDiagnosisRecommendation();
testD10CareerPathDeclaresRagOnlyCompliancePolicy();
await testDiagnoseToolReturnsComplianceMeta();
await testDiagnoseToolReturnsD10CoveragePolicy();
await testDiagnosisApiReturnsPublicReadinessPayload();
await testDiagnosisApiTransferUsesD4ToD2ComplianceRule();
await testDiagnosisApiZodValidation();
console.log("PASS diagnosis rules");
