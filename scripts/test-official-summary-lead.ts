import assert from "node:assert/strict";
const { buildOfficialSummaryLead } = await import("../src/lib/chat/official-summary-lead");

const extensionDoc = {
  index: 1,
  content: [
    "체류기간을 초과해 계속 체류하려는 외국인은 체류기간연장허가를 받아야 합니다.",
    "연장 신청은 현재 체류기간 만료 전 4개월부터 만료 당일까지 가능합니다.",
    "기본 제출 서류는 체류기간연장허가 신청서, 여권, 외국인등록증, 수수료입니다.",
    "해외 체류 중에는 민원 신청이 불가할 수 있습니다.",
  ].join(" "),
};
const financeDoc = {
  index: 2,
  content: "재정능력 증빙은 은행 잔고증명서로 제출하며 발급일 기준이 적용됩니다. 잔고 기준 금액은 과정에 따라 다릅니다.",
};

// A documents-intent question pulls evidence sentences (서류/제출/증명서 evidence
// pattern) and cites the doc index each sentence came from.
const lead = buildOfficialSummaryLead({
  question: "연장 신청에 필요한 서류를 알려주세요",
  docContents: [extensionDoc, financeDoc],
  lang: "ko",
});
assert.ok(lead, "documents intent must produce a lead");
assert.ok(lead!.includes("바로 확인할 핵심"), "localized heading");
assert.ok(lead!.includes("기본 제출 서류"), "must surface the direct documents sentence");
assert.ok(lead!.includes("[1]"), "must cite the source doc index");
assert.ok(!lead!.includes("해외 체류 중"), "non-evidence sentences must not be pulled");
const bulletCount = (lead!.match(/^- /gm) || []).length;
assert.ok(bulletCount >= 1 && bulletCount <= 3, `1-3 bullets, got ${bulletCount}`);

// Deadline intent picks the timing sentence.
const timingLead = buildOfficialSummaryLead({
  question: "연장은 언제까지 신청해야 하나요",
  docContents: [extensionDoc],
  lang: "ko",
});
assert.ok(timingLead && timingLead.includes("만료 전 4개월"), "timing evidence sentence expected");

// No intent match -> null (renders as today).
assert.equal(
  buildOfficialSummaryLead({ question: "안녕하세요", docContents: [extensionDoc], lang: "ko" }),
  null,
);

// Intent match but no evidence sentences in docs -> null.
assert.equal(
  buildOfficialSummaryLead({
    question: "연장 신청에 필요한 서류를 알려주세요",
    docContents: [{ index: 1, content: "오늘 날씨가 맑습니다. 내일도 맑겠습니다." }],
    lang: "ko",
  }),
  null,
);

// English heading localizes.
const enLead = buildOfficialSummaryLead({
  question: "What documents do I need to submit for the extension?",
  docContents: [{ index: 1, content: "You must submit the application form, passport, and alien registration card. Fees apply." }],
  lang: "en",
});
assert.ok(enLead && enLead.includes("Key points first"), "English heading");

console.log("PASS official summary lead: intent-driven evidence sentences with citations");
