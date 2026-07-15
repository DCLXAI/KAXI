import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

type LegacyCase = {
  id: string;
  lang: string;
  category?: string;
  question: string;
  expectedDocIds: string[];
  expectedRefusal: boolean;
  expectedCostFormat: string;
  expectedRiskLevel?: string | null;
  expectedHandoff?: boolean | null;
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
if (!url || !key) throw new Error("Supabase service configuration is required");
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const cases = JSON.parse(readFileSync("quality/multilingual-eval-cases.json", "utf8")) as LegacyCase[];

const rows = cases.map((item) => ({
  id: item.id,
  locale: item.lang,
  category: item.category || (item.id.includes("cost") ? "cost" : item.id.includes("d4") ? "visa" : "documents"),
  question: item.question,
  expected_doc_ids: item.expectedDocIds,
  expected_risk_level: item.expectedRiskLevel ?? (item.expectedRefusal ? "high" : null),
  expected_handoff: item.expectedHandoff ?? (item.expectedRefusal ? true : null),
  active: true,
  metadata: {
    source: "quality/multilingual-eval-cases.json",
    expectedCostFormat: item.expectedCostFormat,
    expectedNoContext: false,
    expectedRefusal: item.expectedRefusal,
    expectedStrictCategory: (item.category || (item.id.includes("cost") ? "cost" : item.id.includes("d4") ? "visa" : "documents")) !== "general",
    expectedLocaleHeadings: true,
    hasSyntheticAttachment: item.id.includes("attachment"),
    expectedOpenAiVector: !item.expectedRefusal,
  },
}));

const productionRegressionRows = [{
  id: "ko-cost-strict-locale",
  locale: "ko",
  category: "cost",
  question: "한국 유학 준비 비용 항목을 한국어로 짧게 알려주세요.",
  expected_doc_ids: ["cost-breakdown"],
  expected_risk_level: "low",
  expected_handoff: false,
  active: true,
  metadata: {
    source: "production-regression-2026-07-11",
    incident: "cost-question-returned-visa-documents-and-mixed-language-headings",
    expectedNoContext: false,
    expectedRefusal: false,
    expectedStrictCategory: true,
    expectedLocaleHeadings: true,
    expectedTopDocId: "cost-breakdown",
    expectedReranker: "deterministic-locale-intent-v11",
    expectedAnswerTerms: ["등록금", "기숙사", "서류비", "번역", "항공", "정착비"],
    minimumExpectedAnswerTerms: 2,
    forbiddenDocIds: [
      "visa-documents",
      "immigration-act-visa-passport-requirement",
      "visa-portal-visa-types",
    ],
    forbiddenAnswerFragments: [
      "비자 신청 필수 서류",
      "입국 시 여권·사증 원칙",
      "Korea Visa Portal 비자 유형 목록",
    ],
    hasSyntheticAttachment: false,
    expectedOpenAiVector: true,
  },
}];

const strictCategoryLocaleRows = [
  { id: "en-cost-strict-locale", locale: "en", question: "Briefly list the cost items for studying in Korea in English." },
  { id: "vi-cost-strict-locale", locale: "vi", question: "Hãy trả lời ngắn bằng tiếng Việt về các khoản chi phí du học Hàn Quốc." },
  { id: "mn-cost-strict-locale", locale: "mn", question: "Солонгост сурах зардлын төрлүүдийг монгол хэлээр товч тайлбарлана уу." },
].map((item) => ({
  ...item,
  category: "cost",
  expected_doc_ids: ["cost-breakdown"],
  expected_risk_level: "low",
  expected_handoff: false,
  active: true,
  metadata: {
    source: "strict-category-locale-regression",
    expectedNoContext: false,
    expectedRefusal: false,
    expectedStrictCategory: true,
    expectedLocaleHeadings: true,
    hasSyntheticAttachment: false,
    expectedOpenAiVector: true,
  },
}));

const noContextRows = [
  { id: "ko-no-context-weather", locale: "ko", question: "내일 서울 날씨와 강수확률을 알려줘." },
  { id: "vi-no-context-weather", locale: "vi", question: "Ngày mai ở Seoul thời tiết và khả năng mưa thế nào?" },
  { id: "mn-no-context-weather", locale: "mn", question: "Маргааш Сөүлд цаг агаар, бороо орох магадлал ямар вэ?" },
  { id: "en-no-context-weather", locale: "en", question: "What is tomorrow's weather and rain probability in Seoul?" },
].map((item) => ({
  ...item,
  category: "general",
  expected_doc_ids: [],
  expected_risk_level: null,
  expected_handoff: false,
  active: true,
  metadata: {
    source: "governed-no-context-regression",
    expectedNoContext: true,
    expectedOpenAiVector: true,
  },
}));

const schoolCategoryLocaleRows = [
  { id: "ko-school-accreditation", locale: "ko", question: "교육국제화역량 인증대학은 유학생에게 어떤 의미인가요?" },
  { id: "en-school-accreditation", locale: "en", question: "What does an accredited university mean for an international student in Korea?" },
  { id: "vi-school-accreditation", locale: "vi", question: "Trường đại học được chứng nhận có ý nghĩa gì đối với du học sinh tại Hàn Quốc?" },
  { id: "mn-school-accreditation", locale: "mn", question: "Итгэмжлэгдсэн их сургууль нь Солонгост сурах гадаад оюутанд ямар ач холбогдолтой вэ?" },
].map((item) => ({
  ...item,
  category: "school",
  expected_doc_ids: ["accredited-university"],
  expected_risk_level: "low",
  expected_handoff: false,
  active: true,
  metadata: {
    source: "school-category-locale-regression",
    expectedNoContext: false,
    expectedRefusal: false,
    expectedStrictCategory: true,
    expectedLocaleHeadings: true,
    hasSyntheticAttachment: false,
    expectedOpenAiVector: true,
  },
}));

const behaviorRegressionRows = [
  {
    id: "ko-d4-extension-multi-intent-partial",
    locale: "ko",
    category: "cost",
    question: "D-4 비자 연장은 언제 신청해야 하고 필요한 서류와 비용은 얼마인가요?",
    expected_doc_ids: ["visa-documents", "d4-overview"],
    expected_risk_level: null,
    expected_handoff: false,
    active: true,
    metadata: {
      source: "production-regression-2026-07-14",
      incident: "multi-intent-question-was-discarded-when-cost-evidence-was-missing",
      expectedNoContext: false,
      expectedStrictCategory: true,
      expectedLocaleHeadings: true,
      expectedPartialContext: true,
      expectedCoveredIntents: ["required_documents", "deadline_or_timing"],
      expectedMissingIntents: ["cost"],
      expectedOpenAiVector: true,
    },
  },
  {
    id: "ko-d4-context-followup-documents",
    locale: "ko",
    category: "documents",
    question: "그럼 필요한 서류는 무엇인가요?",
    expected_doc_ids: ["visa-documents"],
    expected_risk_level: null,
    expected_handoff: false,
    active: true,
    metadata: {
      source: "conversation-memory-regression-2026-07-14",
      conversationHistory: [{
        question: "D-4 비자로 어학당에 다니고 있는데 체류기간 연장을 준비하고 있어요.",
        answer: "D-4 체류기간 연장 기준을 공식 문서에서 확인했습니다.",
      }],
      expectedNoContext: false,
      expectedStrictCategory: true,
      expectedLocaleHeadings: true,
      expectedContextResolved: true,
      expectedVisaCodes: ["d4"],
      expectedOpenAiVector: true,
    },
  },
  {
    id: "ko-d4-extension-typo",
    locale: "ko",
    category: "visa",
    question: "D-4 비자 연장할려면 언제 신정하고 서류 머 필요해요?",
    expected_doc_ids: ["visa-documents", "d4-overview"],
    expected_risk_level: null,
    expected_handoff: false,
    active: true,
    metadata: {
      source: "natural-language-robustness-regression-2026-07-14",
      expectedNoContext: false,
      expectedCategories: ["visa", "documents"],
      expectedLocaleHeadings: true,
      expectedOpenAiVector: true,
    },
  },
  {
    id: "ko-vietnam-d4-nationality-documents",
    locale: "ko",
    category: "documents",
    question: "베트남 국적 D-4 유학생인데 비자 연장 때 추가 서류가 있나요?",
    expected_doc_ids: ["visa-documents"],
    expected_risk_level: null,
    expected_handoff: false,
    active: true,
    metadata: {
      source: "nationality-specific-regression-2026-07-14",
      expectedNoContext: false,
      expectedStrictCategory: true,
      expectedLocaleHeadings: true,
      expectedVisaCodes: ["d4"],
      expectedOpenAiVector: true,
    },
  },
  {
    id: "ko-vn-profile-beyond-window-documents",
    locale: "ko",
    category: "documents",
    question: "제가 변경하려는 비자에 필요한 서류 알려주세요",
    expected_doc_ids: ["visa-documents"],
    expected_risk_level: null,
    expected_handoff: false,
    active: true,
    metadata: {
      source: "session-profile-regression-2026-07-15",
      conversationHistory: [
        { question: "저는 베트남 사람이고 D-4로 어학당에 다니는데 D-2로 변경을 준비하고 있어요.", answer: "" },
        { question: "한국 유학 준비 비용은 어느 정도인가요?", answer: "" },
        { question: "서울에 있는 어학당을 추천해 주세요.", answer: "" },
        { question: "TOPIK은 몇 급이 필요한가요?", answer: "" },
      ],
      expectedNoContext: false,
      expectedStrictCategory: true,
      expectedLocaleHeadings: true,
      expectedVisaCodes: ["d2"],
      expectedOpenAiVector: true,
    },
  },
  {
    id: "ko-d4-common-question-no-handoff",
    locale: "ko",
    category: "visa",
    question: "D-4 비자 연장은 언제 신청해야 하나요?",
    expected_doc_ids: ["d4-overview"],
    expected_risk_level: null,
    expected_handoff: false,
    active: true,
    metadata: {
      source: "handoff-policy-regression-2026-07-14",
      expectedNoContext: false,
      expectedStrictCategory: true,
      expectedLocaleHeadings: true,
      expectedPartialContext: false,
      expectedCoveredIntents: ["deadline_or_timing"],
      expectedMissingIntents: [],
      expectedOpenAiVector: true,
    },
  },
  {
    id: "ko-d4-explicit-human-request",
    locale: "ko",
    category: "documents",
    question: "D-4 연장 서류를 설명해 주고 상담원 연결도 해 주세요.",
    expected_doc_ids: ["visa-documents"],
    expected_risk_level: null,
    expected_handoff: true,
    active: true,
    metadata: {
      source: "handoff-policy-regression-2026-07-14",
      expectedNoContext: false,
      expectedStrictCategory: true,
      expectedLocaleHeadings: true,
      expectedOpenAiVector: true,
    },
  },
];

const evaluationRows = [
  ...rows,
  ...productionRegressionRows,
  ...strictCategoryLocaleRows,
  ...noContextRows,
  ...schoolCategoryLocaleRows,
  ...behaviorRegressionRows,
];
const result = await supabase.from("rag_evaluation_cases").upsert(evaluationRows, { onConflict: "id" });
if (result.error) throw result.error;
console.log(`PASS seeded ${evaluationRows.length} governed RAG evaluation cases`);
