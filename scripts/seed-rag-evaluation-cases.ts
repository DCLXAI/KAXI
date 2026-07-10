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

const result = await supabase.from("rag_evaluation_cases").upsert([...rows, ...noContextRows], { onConflict: "id" });
if (result.error) throw result.error;
console.log(`PASS seeded ${rows.length + noContextRows.length} governed RAG evaluation cases`);
