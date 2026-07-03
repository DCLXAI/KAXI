import {
  analyzeAgentIntent,
  extractAgentSlots,
  parseKrwBudget,
  type AgentMissingSlot,
  type PlannedToolName,
} from "../src/lib/agent/planner";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string): void {
  if (!condition) fail(message);
}

function toolsFor(question: string): PlannedToolName[] {
  return analyzeAgentIntent(question, "ko").plan.map((item) => item.tool);
}

function expectTools(question: string, expected: PlannedToolName[]): void {
  const tools = toolsFor(question);
  for (const tool of expected) {
    assert(tools.includes(tool), `planner missed ${tool}: ${JSON.stringify({ question, tools })}`);
  }
}

function expectNoMissingSlots(slots: AgentMissingSlot[], unexpected: AgentMissingSlot[], context: unknown): void {
  for (const slot of unexpected) {
    assert(!slots.includes(slot), `planner should not ask for ${slot}: ${JSON.stringify(context)}`);
  }
}

function testBudgetParsing() {
  const cases: Array<[string, number]> = [
    ["500만원", 5_000_000],
    ["1,200만원", 12_000_000],
    ["1,200,000원", 1_200_000],
    ["5.5 million won", 5_500_000],
    ["5,5 million won", 5_500_000],
    ["1억원", 100_000_000],
  ];

  for (const [input, expected] of cases) {
    const actual = parseKrwBudget(input);
    assert(actual === expected, `budget parse failed for ${input}: expected=${expected} actual=${actual}`);
  }
}

function testSchoolAndCostIntent() {
  const result = analyzeAgentIntent("예산 500만원으로 서울 인증대학 어학당 찾아줘", "ko");
  const slots = extractAgentSlots("예산 500만원으로 서울 인증대학 어학당 찾아줘");

  assert(result.school, `school intent missing: ${JSON.stringify(result)}`);
  assert(result.cost, `cost intent missing: ${JSON.stringify(result)}`);
  assert(slots.signals.school && slots.signals.cost, `slot signals should capture school/cost: ${JSON.stringify(slots)}`);
  assert(result.budget === 5_000_000, `budget entity wrong: ${JSON.stringify(result)}`);
  assert(result.region === "seoul", `region entity wrong: ${JSON.stringify(result)}`);
  assert(result.program === "language", `program entity wrong: ${JSON.stringify(result)}`);
  assert(result.accreditation === "accredited", `accreditation entity wrong: ${JSON.stringify(result)}`);
  assert(result.evidence.detectedSignals.includes("school"), `school signal evidence missing: ${JSON.stringify(result)}`);
  assert(result.evidence.detectedSignals.includes("cost"), `cost signal evidence missing: ${JSON.stringify(result)}`);
  assert(
    result.evidence.resolvedSlots.some((slot) => slot.slot === "budget" && slot.value === 5_000_000),
    `budget evidence missing: ${JSON.stringify(result)}`
  );
  assert(
    result.structuredSlots.some(
      (slot) => slot.slot === "budget" && slot.status === "resolved" && slot.source === "explicit"
    ),
    `structured budget slot missing: ${JSON.stringify(result.structuredSlots)}`
  );
  assert(
    result.evidence.confidenceDrivers.includes("slots_complete"),
    `confidence evidence should show complete slots: ${JSON.stringify(result)}`
  );
  expectTools("예산 500만원으로 서울 인증대학 어학당 찾아줘", ["search_schools"]);
  expectNoMissingSlots(result.missingSlots, ["region", "program", "budget"], result);
}

function testGenericSchoolConditionsAreNotSchoolNames() {
  const result = analyzeAgentIntent("베트남 학생 D-4 서울 어학당 500만원 예산으로 추천하고 서류도 알려줘", "ko");
  const schoolSearch = result.plan.find((item) => item.tool === "search_schools");

  assert(result.schoolName === undefined, `generic conditions should not become schoolName: ${JSON.stringify(result)}`);
  assert(schoolSearch?.args.school_name === undefined, `school_name arg should stay empty for generic conditions: ${JSON.stringify(result)}`);
  assert(result.region === "seoul", `region should still be extracted: ${JSON.stringify(result)}`);
  assert(result.program === "language", `program should still be extracted: ${JSON.stringify(result)}`);
  assert(result.nationality === "vn", `nationality should still be extracted: ${JSON.stringify(result)}`);
}

function testVisaDocumentIntent() {
  const result = analyzeAgentIntent("베트남 학생 D-2 체류기간 연장 서류와 수수료 근거 알려줘", "ko");
  const tools = result.plan.map((item) => item.tool);

  assert(result.documents, `document intent missing: ${JSON.stringify(result)}`);
  assert(result.knowledge, `knowledge intent missing: ${JSON.stringify(result)}`);
  assert(result.visaType === "D-2", `visa entity wrong: ${JSON.stringify(result)}`);
  assert(result.nationality === "vn", `nationality entity wrong: ${JSON.stringify(result)}`);
  assert(tools.includes("get_documents") && tools.includes("search_knowledge"), `document tools missing: ${JSON.stringify(result)}`);
  assert(
    result.evidence.planReasons.includes("visa_document_request") &&
      result.evidence.planReasons.includes("official_knowledge_required"),
    `planner evidence should expose plan reasons: ${JSON.stringify(result)}`
  );
  expectNoMissingSlots(result.missingSlots, ["visa_type", "nationality"], result);
}

function testPartnerAndSafetyIntent() {
  const partner = analyzeAgentIntent("D-2 거절 이력이 있어서 행정사 상담 연결해줘", "ko");
  const partnerSlots = extractAgentSlots("D-2 거절 이력이 있어서 행정사 상담 연결해줘");
  assert(partner.partner, `partner intent missing: ${JSON.stringify(partner)}`);
  assert(partner.hasHistory, `refusal history missing: ${JSON.stringify(partner)}`);
  assert(partnerSlots.signals.partner && partnerSlots.hasHistory, `partner slot extraction wrong: ${JSON.stringify(partnerSlots)}`);
  assert(partner.partnerType === "admin", `partner type wrong: ${JSON.stringify(partner)}`);
  assert(partner.plan.some((item) => item.tool === "request_partner"), `partner tool missing: ${JSON.stringify(partner)}`);

  const safety = analyzeAgentIntent("브로커가 허위 서류로 비자 보장한다고 하는데 괜찮아?", "ko");
  const safetySlots = extractAgentSlots("브로커가 허위 서류로 비자 보장한다고 하는데 괜찮아?");
  assert(safety.safety, `safety intent missing: ${JSON.stringify(safety)}`);
  assert(safety.usingBroker, `broker signal missing: ${JSON.stringify(safety)}`);
  assert(safetySlots.signals.safety && safetySlots.usingBroker, `safety slot extraction wrong: ${JSON.stringify(safetySlots)}`);
  assert(safety.knowledge, `safety question should force knowledge: ${JSON.stringify(safety)}`);
  assert(safety.confidence === "high", `safety question should be high confidence: ${JSON.stringify(safety)}`);
}

function testDiagnosisSlotFilling() {
  const result = analyzeAgentIntent(
    "베트남 고졸 TOPIK 2급 예산 700만원, 한국어 어학 후 학위 목표로 맞춤 로드맵 진단해줘",
    "ko"
  );

  assert(result.diagnosis, `diagnosis intent missing: ${JSON.stringify(result)}`);
  assert(result.budget === 7_000_000, `diagnosis budget wrong: ${JSON.stringify(result)}`);
  assert(result.nationality === "vn", `diagnosis nationality wrong: ${JSON.stringify(result)}`);
  assert(result.education === "highschool", `diagnosis education wrong: ${JSON.stringify(result)}`);
  assert(result.koreanLevel === "topik2", `diagnosis Korean level wrong: ${JSON.stringify(result)}`);
  assert(result.plan.some((item) => item.tool === "diagnose_path"), `diagnosis tool missing: ${JSON.stringify(result)}`);
  expectNoMissingSlots(result.missingSlots, ["nationality", "education", "korean_level", "goal", "budget"], result);
}

function testExactSchoolRefinement() {
  const result = analyzeAgentIntent(
    "다음 조건을 반영해서 다시 추천/계산해줘.\n- 예산: 1,200만원\n- 학교명: 연세대학교\n\n원래 요청: 비용 계산해줘",
    "ko"
  );
  const schoolSearch = result.plan.find((item) => item.tool === "search_schools");

  assert(schoolSearch, `school refinement should search schools: ${JSON.stringify(result)}`);
  assert(schoolSearch?.args.school_name === "연세대학교", `school_name arg wrong: ${JSON.stringify(result)}`);
  assert(schoolSearch?.args.max_tuition === 12_000_000, `refined budget arg wrong: ${JSON.stringify(result)}`);
  expectNoMissingSlots(result.missingSlots, ["region", "program", "budget"], result);
}

function testKeywordCollisionCases() {
  const d4AtUniversity = analyzeAgentIntent("연세대학교 어학당 D-4 비자 서류 알려줘", "ko");
  assert(
    d4AtUniversity.visaType === "D-4",
    `explicit D-4 should beat university-name/degree keywords: ${JSON.stringify(d4AtUniversity)}`
  );
  assert(
    d4AtUniversity.program === "language",
    `university language institute should still be treated as language program: ${JSON.stringify(d4AtUniversity)}`
  );
  expectNoMissingSlots(d4AtUniversity.missingSlots, ["visa_type"], d4AtUniversity);

  const d2WithKoreanPrep = analyzeAgentIntent("D-2 학위과정인데 한국어 보충이 필요해. 서류도 알려줘", "ko");
  assert(
    d2WithKoreanPrep.visaType === "D-2",
    `explicit D-2 should beat Korean-language prep keywords: ${JSON.stringify(d2WithKoreanPrep)}`
  );

  const gyeonggiGwangju = analyzeAgentIntent("경기 광주 근처 어학당 500만원 예산으로 찾아줘", "ko");
  assert(
    gyeonggiGwangju.region === "gyeonggi",
    `경기 광주는 전남/광주광역시가 아니라 gyeonggi로 유지해야 함: ${JSON.stringify(gyeonggiGwangju)}`
  );

  const cityGwangju = analyzeAgentIntent("광주 어학당 500만원 예산으로 찾아줘", "ko");
  assert(cityGwangju.region === "gwangju", `광주 단독 지역 감지가 깨짐: ${JSON.stringify(cityGwangju)}`);
}

function testStructuredSlotRequirements() {
  const vague = analyzeAgentIntent("비자 서류랑 학교 추천해줘", "ko");

  assert(
    vague.structuredSlots.some(
      (slot) =>
        slot.slot === "region" &&
        slot.status === "missing" &&
        slot.missingSlot === "region" &&
        slot.requiredFor.includes("search_schools")
    ),
    `structured region requirement missing: ${JSON.stringify(vague.structuredSlots)}`
  );
  assert(
    vague.structuredSlots.some(
      (slot) =>
        slot.slot === "visaType" &&
        slot.status === "missing" &&
        slot.value === "D-4" &&
        slot.requiredFor.includes("get_documents")
    ),
    `structured visa requirement should preserve default value while marking missing: ${JSON.stringify(vague.structuredSlots)}`
  );
  assert(
    vague.slotRequirements.some(
      (requirement) =>
        requirement.slot === "nationality" &&
        requirement.requiredFor.includes("get_documents") &&
        requirement.reason === "visa_or_diagnosis_request_without_nationality"
    ),
    `slot requirements should explain why nationality is needed: ${JSON.stringify(vague.slotRequirements)}`
  );
  assert(
    vague.evidence.slotRequirements.length === vague.slotRequirements.length &&
      vague.evidence.structuredSlots.length === vague.structuredSlots.length,
    `evidence should mirror structured slot registry output: ${JSON.stringify(vague.evidence)}`
  );

  const exactSchool = analyzeAgentIntent("학교명: 연세대학교 예산 500만원으로 비용 계산해줘", "ko");
  assert(
    exactSchool.structuredSlots.some((slot) => slot.slot === "schoolName" && slot.status === "resolved"),
    `exact school name should be a resolved structured slot: ${JSON.stringify(exactSchool.structuredSlots)}`
  );
  expectNoMissingSlots(exactSchool.missingSlots, ["region", "program", "budget"], exactSchool);
}

function testMultilingualIntentCorpus() {
  const greeting = analyzeAgentIntent("xin chào", "vi");
  assert(greeting.smallTalk, `Vietnamese greeting should be small talk: ${JSON.stringify(greeting)}`);
  assert(greeting.plan.length === 0, `small talk should not call tools: ${JSON.stringify(greeting)}`);

  const vi = analyzeAgentIntent(
    "Tôi là người Việt Nam, ngân sách 5 triệu won, muốn tìm trường tiếng Hàn ở Seoul và tư vấn hồ sơ D-4",
    "vi"
  );
  assert(vi.nationality === "vn", `Vietnamese corpus nationality failed: ${JSON.stringify(vi)}`);
  assert(vi.budget === 5_000_000, `Vietnamese corpus budget failed: ${JSON.stringify(vi)}`);
  assert(vi.region === "seoul", `Vietnamese corpus region failed: ${JSON.stringify(vi)}`);
  assert(vi.program === "language", `Vietnamese corpus program failed: ${JSON.stringify(vi)}`);
  assert(vi.school && vi.cost && vi.documents && vi.partner, `Vietnamese corpus signals failed: ${JSON.stringify(vi)}`);
  assert(
    ["search_schools", "get_documents", "request_partner"].every((tool) => vi.plan.some((item) => item.tool === tool)),
    `Vietnamese corpus plan failed: ${JSON.stringify(vi)}`
  );

  const mn = analyzeAgentIntent(
    "Монгол оюутан, солонгос хэлгүй, хэлний сургууль Сеулд 6 сая won зардалтай хайж байна",
    "mn"
  );
  assert(mn.nationality === "mn", `Mongolian corpus nationality failed: ${JSON.stringify(mn)}`);
  assert(mn.budget === 6_000_000, `Mongolian corpus budget failed: ${JSON.stringify(mn)}`);
  assert(mn.region === "seoul", `Mongolian corpus region failed: ${JSON.stringify(mn)}`);
  assert(mn.program === "language", `Mongolian corpus program failed: ${JSON.stringify(mn)}`);
  assert(mn.koreanLevel === "none", `Mongolian corpus Korean level failed: ${JSON.stringify(mn)}`);
  assert(mn.plan.some((item) => item.tool === "search_schools"), `Mongolian corpus plan failed: ${JSON.stringify(mn)}`);

  const en = analyzeAgentIntent("I have a D-2 refusal and need an administrative consult", "en");
  assert(en.visaType === "D-2", `English corpus visa type failed: ${JSON.stringify(en)}`);
  assert(en.hasHistory, `English corpus refusal history failed: ${JSON.stringify(en)}`);
  assert(en.partner, `English corpus partner signal failed: ${JSON.stringify(en)}`);
  assert(en.plan.some((item) => item.tool === "request_partner"), `English corpus partner plan failed: ${JSON.stringify(en)}`);
}

testBudgetParsing();
testSchoolAndCostIntent();
testGenericSchoolConditionsAreNotSchoolNames();
testVisaDocumentIntent();
testPartnerAndSafetyIntent();
testDiagnosisSlotFilling();
testExactSchoolRefinement();
testKeywordCollisionCases();
testStructuredSlotRequirements();
testMultilingualIntentCorpus();
console.log("PASS agent planner regressions");
