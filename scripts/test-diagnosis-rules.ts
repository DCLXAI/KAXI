import { recommendPath, type DiagnosisInput } from "../src/lib/data/diagnosis";
import { KNOWLEDGE_DOCS } from "../src/lib/data/knowledge";
import { TOOL_MAP, isRecord } from "../src/lib/agent/tools";
import { evaluateVisaRules } from "../src/lib/rules/visa-rules";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string): void {
  if (!condition) fail(message);
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
  assert(
    isRecord(result.compliance_rule_meta) &&
      Array.isArray(result.compliance_rule_meta.applied_rule_ids) &&
      result.compliance_rule_meta.applied_rule_ids.length > 0,
    `diagnose_path should include compliance rule metadata: ${JSON.stringify(result)}`
  );
  assert(
    Array.isArray(result.source_refs) &&
      result.source_refs.some((ref) => typeof ref === "string" && ref.startsWith("compliance:")),
    `diagnose_path should expose compliance source refs: ${JSON.stringify(result)}`
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
  assert(result.compliance_rule_meta === null, `D-10 should not pretend rule-engine metadata exists: ${JSON.stringify(result)}`);
}

testLanguagePathKeepsCoreOutputShape();
testDegreePathExplainsLanguageAndBudgetRisk();
testHistoryAndBrokerEscalateRisk();
testUnsureGoalUsesLanguageBridgeForLowKorean();
testComplianceEvaluationGroundsDiagnosisRecommendation();
testD10CareerPathDeclaresRagOnlyCompliancePolicy();
await testDiagnoseToolReturnsComplianceMeta();
await testDiagnoseToolReturnsD10CoveragePolicy();
console.log("PASS diagnosis rules");
