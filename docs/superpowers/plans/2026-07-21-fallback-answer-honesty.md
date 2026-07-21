# Fallback Answer Reconstruction + Badge Honesty Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the consult LLM fails and the user gets the extractive official-summary fallback, (a) the answer LEADS with the sentences that directly address the user's question instead of opening with document dumps, and (b) the chat badges say so honestly — no more hardcoded "high" confidence on a model-failed answer.

**Architecture:** UX patch ① from the live walkthrough (observed: a "D-4 만료 임박" question returned numbered doc summaries with "⚠️ 생성 모델 응답에 실패해…" while badges showed "Grounded · high"). Two thin changes on existing seams: (1) a new pure module `src/lib/chat/official-summary-lead.ts` selects up to 3 evidence sentences from the top prioritized docs using the SAME `QUESTION_INTENTS` evidence patterns the reranker already uses (`@/lib/chat/retrieval-tuning`), and `buildOfficialSummaryFallback` (src/app/api/ai/consult/route.ts:607-649) prepends them as a localized "바로 확인할 핵심" block; (2) `normalizeExpertResponse` (src/app/api/ai/unified/route.ts:156-166) stops hardcoding `intentConfidence: "high"` — it emits `"high"` only for real LLM answers and adds `answerSource: "llm" | "official-summary"` to quality; `AgentResponseCard.tsx` renders an explicit localized "모델 미사용 · 문서 직접 요약" badge when `answerSource === "official-summary"`.

**Tech Stack:** TypeScript (Next.js), bun test scripts.

## Global Constraints

- Branch: `feat/fallback-answer-honesty` off `main`. Commit per task. Trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- NEVER stage `Capsomnia/` or `.superpowers/`; `git add <file> …` only. Never run prisma/db commands.
- The LLM-success path must be byte-identical: lead block and badge changes activate ONLY on the official-summary path (`backend === "official-summary"`). A normal Kimi answer renders exactly as today (aside from `answerSource: "llm"` being added to quality meta, which no existing badge reads).
- The lead block is deterministic (no LLM call — the LLM just failed) and fails soft: no intent match / no matching sentences → `null` → the fallback answer renders exactly as today.
- All user-visible strings localized for ko/vi/mn/en following the file's existing 4-locale record pattern (see route.ts:422-427 and AgentResponseCard's inline locale ternaries).
- Do not touch: the in-answer `📚 출처:` list, heading sizes, SourceAnnotations (that's patch ③); the disclaimer strings; `officialSummaryDocScore`; the direct-lexical-fallback builder (typebot path — separate surface, out of scope here).

---

### Task 1: `buildOfficialSummaryLead` — pure evidence-lead selector

**Files:**
- Create: `src/lib/chat/official-summary-lead.ts`
- Test: `scripts/test-official-summary-lead.ts` (new)
- Modify: `package.json` (add `"test:official-summary-lead": "bun run scripts/test-official-summary-lead.ts"` next to `test:clarification-writer`; append ` && bun run test:official-summary-lead` to the END of `ci:domain`)

**Interfaces:**
- Consumes: `QUESTION_INTENTS` from `@/lib/chat/retrieval-tuning`.
- Produces: `buildOfficialSummaryLead(input: { question: string; docContents: Array<{ content: string; index: number }>; lang: "ko" | "vi" | "mn" | "en" }): string | null` — a markdown block (localized bold heading + up to 3 bullet sentences, each suffixed with its `[index]` citation marker), or `null` when nothing qualifies. Task 2 calls it from the consult route.

- [ ] **Step 1: Write the failing test**

Create `scripts/test-official-summary-lead.ts`:

```ts
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
```

- [ ] **Step 2: Wire the script; verify RED**

Add the package.json entries (Files section). Run: `bun run test:official-summary-lead`
Expected: FAIL — cannot resolve the module.

- [ ] **Step 3: Implement**

Create `src/lib/chat/official-summary-lead.ts`:

```ts
import { QUESTION_INTENTS } from "@/lib/chat/retrieval-tuning";

type LeadLang = "ko" | "vi" | "mn" | "en";

const LEAD_HEADING: Record<LeadLang, string> = {
  ko: "바로 확인할 핵심",
  vi: "Điểm chính cần xem ngay",
  mn: "Шууд шалгах гол зүйл",
  en: "Key points first",
};

function splitSentences(content: string): string[] {
  return content
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?。])\s+/u)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 12 && sentence.length <= 240);
}

// When the LLM has already failed, the fallback answer opens with the
// sentences that actually address the question — selected with the SAME
// intent evidence patterns the reranker uses — instead of opening with
// document summaries the user has to mine. Deterministic; returns null
// whenever nothing clearly qualifies so the existing layout stays intact.
export function buildOfficialSummaryLead(input: {
  question: string;
  docContents: Array<{ content: string; index: number }>;
  lang: LeadLang;
}): string | null {
  const intents = QUESTION_INTENTS.filter((intent) => intent.questionPattern.test(input.question));
  if (intents.length === 0) return null;

  const bullets: string[] = [];
  for (const doc of input.docContents.slice(0, 3)) {
    for (const sentence of splitSentences(doc.content)) {
      if (bullets.length >= 3) break;
      if (!intents.some((intent) => intent.evidencePattern.test(sentence))) continue;
      bullets.push(`- ${sentence} [${doc.index}]`);
    }
    if (bullets.length >= 3) break;
  }
  if (bullets.length === 0) return null;

  return `**${LEAD_HEADING[input.lang]}**\n\n${bullets.join("\n")}`;
}
```

- [ ] **Step 4: Verify GREEN + gates**

Run: `bun run test:official-summary-lead && bun run ci:types && bun run lint`
Expected: PASS line + clean. (If a specific assertion fails because an intent pattern doesn't match the fixture as expected, print the actual output, check the pattern in retrieval-tuning.ts, and adjust the FIXTURE sentence to genuinely match the evidence pattern — never weaken an assertion to accept wrong behavior.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/chat/official-summary-lead.ts scripts/test-official-summary-lead.ts package.json
git commit -m "feat(consult): intent-driven evidence lead for the official-summary fallback

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Wire the lead + honest badges

**Files:**
- Modify: `src/app/api/ai/consult/route.ts` (`buildOfficialSummaryFallback`, :607-649)
- Modify: `src/app/api/ai/unified/route.ts` (`normalizeExpertResponse` quality block, :156-166)
- Modify: `src/components/agent/AgentResponseCard.tsx` (badge row, around :124-141)
- Modify: whichever file types the `quality` object (find it: `grep -rn "intentConfidence" src/ --include="*.ts" --include="*.tsx" -l` — extend the type with `answerSource?: "llm" | "official-summary"` and make `intentConfidence` optional if it isn't already)
- Test: extend `scripts/test-unified-ai-router.ts` OR `scripts/test-unified-ai.ts` — whichever already exercises `normalizeExpertResponse`/the unified response shape (check both; put the new assertions beside the existing expert-path assertions, matching that file's existing style)

**Interfaces:**
- Consumes: `buildOfficialSummaryLead` from Task 1.
- Produces: consult fallback answers open with the lead block; unified quality meta carries `answerSource`; official-summary answers show a localized "모델 미사용 · 문서 직접 요약" badge and NO confidence chip.

- [ ] **Step 1: Prepend the lead in the consult fallback**

In `buildOfficialSummaryFallback` (route.ts:607), after `prioritized` is computed, build the lead and prepend it. Add the import at the top of the file (`import { buildOfficialSummaryLead } from "@/lib/chat/official-summary-lead";`), then change the return:

```ts
  const lead = buildOfficialSummaryLead({
    question,
    docContents: prioritized.map((doc, index) => ({
      content: pickLangText(doc.content, lang),
      index: index + 1,
    })),
    lang,
  });

  return `## 공식 근거 기반 요약

${lead ? `${lead}

` : ""}검색된 승인 문서를 기준으로 질문과 가까운 근거를 먼저 정리했습니다. 개별 체류 이력, 학교 상태, 만료일, 재정 상황에 따라 요구 서류가 달라질 수 있으므로 접수 전 원문 확인과 행정사 검토가 필요합니다.

${sections}

📚 출처:
${sourceList}

${sourceNotice}`;
```

(The `[n]` markers in the lead resolve against the SAME numbered sections/sources already in this answer, and the frontend's `linkCitationMarkers` links them like the existing in-section `[n]` markers.)

- [ ] **Step 2: Honest quality meta in the unified route**

In `normalizeExpertResponse` (unified/route.ts), the quality block currently ends with `intentConfidence: "high" as const, missingSlotCount: 0, durationMs`. Replace with:

```ts
        answerSource: backend === "official-summary" ? "official-summary" as const : "llm" as const,
        intentConfidence: backend === "official-summary" ? undefined : "high" as const,
        missingSlotCount: 0,
        durationMs,
```

Extend the quality TYPE (found via the grep in Files) with `answerSource?: "llm" | "official-summary"` and make `intentConfidence` optional (`?`) if the compiler requires it.

- [ ] **Step 3: The honest badge**

In `AgentResponseCard.tsx`, directly after the `message.grounded` badge block (:124-129), add:

```tsx
        {message.meta?.quality.answerSource === "official-summary" && (
          <Badge variant="secondary" className="text-[10px] gap-0.5">
            <ShieldAlert className="h-2.5 w-2.5" />
            {locale === "ko"
              ? "모델 미사용 · 문서 직접 요약"
              : locale === "vi"
                ? "Tóm tắt trực tiếp tài liệu"
                : locale === "mn"
                  ? "Баримтын шууд хураангуй"
                  : "Direct document summary"}
          </Badge>
        )}
```

(`ShieldAlert` is already imported in this file — verify; if not, add it to the existing lucide import.) The `intentConfidence` chip needs no change: it already renders only when the value is truthy (:136), and Step 2 stops emitting it for official-summary.

- [ ] **Step 4: Test extensions**

In the unified test file located per Files: add assertions beside the existing expert-path checks —
- a normalized expert response whose raw `backend` is `"official-summary"` must yield `meta.quality.answerSource === "official-summary"` and `meta.quality.intentConfidence === undefined`;
- one whose raw `backend` is `"kimi"` must yield `answerSource === "llm"` and `intentConfidence === "high"`.
If neither test file drives `normalizeExpertResponse` directly (it may only be reachable through the route), add the assertions at whatever seam the file already uses for the expert path (e.g. stubbed delegate response) and state in the report which seam you used.

- [ ] **Step 5: Gates**

Run: `bun run ci:types && bun run lint && bun run test:official-summary-lead && bun run test:unified-ai && bun run test:unified-ai-stream && bun run test:citations`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/ai/consult/route.ts src/app/api/ai/unified/route.ts src/components/agent/AgentResponseCard.tsx scripts/test-unified-ai-router.ts scripts/test-unified-ai.ts
git commit -m "feat(consult): lead-first fallback answers + honest answer-source badge

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
(Stage only the files you actually changed among those — plus the quality-type file from Step 2's grep; name it in the report.)

---

### Task 3: Rollout + live verification

No repo files; operational.

- [ ] **Step 1:** PR → CI green → merge → `gh workflow run "Vercel Production Deploy"` → standard post-deploy checks (health commit match, readiness, documents 401).
- [ ] **Step 2:** Live verification, both paths:
  - Normal path (LLM succeeds): POST `/api/ai/unified` with a visa question; assert `meta.quality.answerSource === "llm"`, `intentConfidence === "high"`, answer has no "바로 확인할 핵심" block (LLM path untouched).
  - Fallback path: cannot be forced in production safely — verified by Task 1/2 unit tests plus a LOCAL dev-server render: run the dev server with the consult LLM unconfigured (no Kimi key in env), send the D-4 extension question on /ko/agent, and screenshot: lead block first, "모델 미사용 · 문서 직접 요약" badge visible, no "high" chip.
