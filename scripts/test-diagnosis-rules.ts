import { recommendPath, type DiagnosisInput } from "../src/lib/data/diagnosis";
import { KNOWLEDGE_DOCS } from "../src/lib/data/knowledge";

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

testLanguagePathKeepsCoreOutputShape();
testDegreePathExplainsLanguageAndBudgetRisk();
testHistoryAndBrokerEscalateRisk();
testUnsureGoalUsesLanguageBridgeForLowKorean();
console.log("PASS diagnosis rules");
