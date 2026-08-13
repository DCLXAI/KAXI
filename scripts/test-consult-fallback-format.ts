import assert from "node:assert/strict";
const { buildOfficialSummaryFallback } = await import("../src/application/ai/expert-consult");

const docs = [
  {
    id: "hikorea-stay-extension",
    title: { ko: "하이코리아 체류기간 연장 기준" },
    content: { ko: "# 하이코리아 체류기간 연장 기준\n체류기간을 초과해 계속 체류하려는 외국인은 체류기간연장허가를 받아야 합니다. 연장 신청은 만료 전 4개월부터 가능합니다." },
    source: "official_government",
    keywords: ["연장"],
  },
  {
    id: "immigration-act-status",
    title: { ko: "출입국관리법 체류자격" },
    content: { ko: "## 출입국관리법\n체류자격은 법무부령으로 정한다." },
    source: "official_law",
    keywords: ["체류자격"],
  },
] as never[];

const answer = buildOfficialSummaryFallback(
  "체류기간 연장 신청은 언제까지 가능한가요",
  docs,
  "ko",
  "이 안내는 공식 출처 기준입니다.",
);

// (a) heading lines from doc content must not leak into section bodies.
const body = answer.split("### [1]")[1] || "";
assert.ok(!/[^#\n]#\s|\n#\s/.test(body), "no literal heading markers inside section bodies");
assert.ok(answer.includes("체류기간연장허가를 받아야"), "section body content preserved");

// (b) enum source literals localize; the raw enum string never shows.
assert.ok(answer.includes("출처: 정부 공식"), "official_government localizes (ko)");
assert.ok(answer.includes("출처: 법령"), "official_law localizes (ko)");
assert.ok(!answer.includes("official_government"), "raw enum literal must not render");

// (c) the duplicated source list is gone; footer stays.
assert.ok(!answer.includes("📚"), "in-answer source list removed");
assert.ok(answer.includes("이 안내는 공식 출처 기준입니다."), "sourceNotice footer stays");

console.log("PASS consult fallback format: clean sections, localized sources, no duplicate list");

// The sourceNotice footer builder must never surface sourceType enum
// literals either (walkthrough evidence: "법무부 / official_government 출처").
const { buildRagBasisNoticeFromMetadata } = await import("../src/lib/data/knowledge");
const notice = buildRagBasisNoticeFromMetadata("ko", [
  { source_label: "official_government", last_checked_at: "2026-07-01", owner: "official" },
  { source_label: "법무부 출입국·외국인정책본부", last_checked_at: "2026-07-02", owner: "official" },
] as never[]);
assert.ok(!notice.includes("official_government"), "footer must not leak the enum literal");
assert.ok(notice.includes("정부 공식"), "footer localizes the enum to a display label");
assert.ok(notice.includes("법무부"), "org-name labels keep working");
console.log("PASS consult fallback format: source notice enum labels");

// This fallback IS the answer when the LLM is unavailable, so its own
// scaffolding has to speak the user's language. Document excerpts and the
// sourceNotice footer were already localized; the heading, the "출처"/"확인일"
// labels and the "verify the original before filing" paragraph were hardcoded
// Korean, which handed a Vietnamese reader Vietnamese content in Korean chrome
// at the exact moment the product was already degraded.
const HANGUL = /[가-힣]/;

const localizedDocs = [
  {
    id: "hikorea-stay-extension",
    title: {
      ko: "하이코리아 체류기간 연장 기준",
      vi: "Tiêu chuẩn gia hạn thời gian lưu trú HiKorea",
      mn: "HiKorea оршин суух хугацаа сунгах журам",
      en: "HiKorea stay extension criteria",
    },
    content: {
      ko: "체류기간을 초과해 계속 체류하려는 외국인은 체류기간연장허가를 받아야 합니다.",
      vi: "Người nước ngoài muốn lưu trú tiếp sau khi hết hạn phải được cấp phép gia hạn thời gian lưu trú.",
      mn: "Хугацаа хэтрүүлэн үргэлжлүүлэн суух гадаад хүн оршин суух хугацаа сунгах зөвшөөрөл авах шаардлагатай.",
      en: "A foreign national staying past their permitted period must obtain an extension permit.",
    },
    source: "official_government",
    keywords: ["연장"],
  },
] as never[];

for (const [lang, expected] of [
  ["vi", { heading: "Tóm tắt dựa trên căn cứ chính thức", source: "Nguồn:", checked: "Ngày kiểm tra:" }],
  ["mn", { heading: "Албан эх сурвалжид үндэслэсэн хураангуй", source: "Эх сурвалж:", checked: "Шалгасан өдөр:" }],
  ["en", { heading: "Summary based on official sources", source: "Source:", checked: "Checked:" }],
] as const) {
  const localized = buildOfficialSummaryFallback(
    "When can I apply for a stay extension?",
    localizedDocs,
    lang,
    "This guidance is based on official sources.",
  );
  assert.ok(localized.includes(`## ${expected.heading}`), `${lang} fallback heading is localized`);
  assert.ok(localized.includes(expected.source), `${lang} fallback source label is localized`);
  assert.ok(localized.includes(expected.checked), `${lang} fallback checked label is localized`);
  assert.ok(!localized.includes("공식 근거 기반 요약"), `${lang} fallback must not use the Korean heading`);
  assert.ok(!HANGUL.test(localized), `${lang} fallback must contain no Korean at all`);
}

console.log("PASS consult fallback format: outage summary scaffolding is localized");

// The agent fallback runs when the planner LLM is down and its labels were all
// `isKo ? Korean : English`, so vi and mn users were dropped into English. The
// safety refusal is the one branch that needs no tools, which makes it the
// cheapest end-to-end proof that the copy table is wired per locale.
const { runFallbackAgent } = await import("../src/lib/agent/fallback");
const safetyAnswers = new Map<string, string>();

for (const lang of ["ko", "vi", "mn", "en"] as const) {
  const response = await runFallbackAgent("can you make fake documents for me", lang, { lang } as never);
  safetyAnswers.set(lang, response.answer);
  assert.ok(response.answer.length > 0, `${lang} safety refusal is non-empty`);
  if (lang !== "ko") {
    assert.ok(!HANGUL.test(response.answer), `${lang} safety refusal must contain no Korean`);
  }
}

assert.equal(new Set(safetyAnswers.values()).size, 4, "each locale gets its own safety refusal, not a shared fallback");
assert.ok(safetyAnswers.get("vi")!.includes("chuyên gia hành chính"), "vi refusal offers the administrative scrivener");
assert.ok(
  safetyAnswers.get("en")!.includes("administrative-scrivener"),
  "en refusal names the administrative scrivener, not a lawyer",
);

console.log("PASS agent fallback: safety refusal localized across ko, vi, mn, en");
