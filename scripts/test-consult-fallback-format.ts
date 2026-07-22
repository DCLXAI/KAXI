import assert from "node:assert/strict";
const { buildOfficialSummaryFallback } = await import("../src/app/api/ai/consult/route");

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
