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
    expectedReranker: "deterministic-locale-intent-v9",
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
  metadata: { source: "governed-no-context-regression", expectedNoContext: true },
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
  },
}));

const evaluationRows = [...rows, ...productionRegressionRows, ...strictCategoryLocaleRows, ...noContextRows, ...schoolCategoryLocaleRows];
const result = await supabase.from("rag_evaluation_cases").upsert(evaluationRows, { onConflict: "id" });
if (result.error) throw result.error;
console.log(`PASS seeded ${evaluationRows.length} governed RAG evaluation cases`);
