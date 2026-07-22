# Answer Rendering Cleanup Implementation Plan (UX patch ③)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chat answers stop looking like raw documents: headings render at chat scale, the duplicated in-answer source list disappears (the SourceAnnotations component is the one source surface, its long evidence block collapsed by default), and internal jargon ("openai-pgvector", "official_government", "검수 approved · partner_agent_001") is replaced with localized user-facing labels.

**Architecture:** Four thin rendering/format changes on mapped seams. (1) `buildOfficialSummaryFallback` (src/app/api/ai/consult/route.ts:607-649): strip markdown heading lines from section excerpts (same regex the lead module uses), localize the source-type enum literals, and DROP the in-answer "📚 출처:" list — its only runtime consumer is the unified /agent surface, which always renders `SourceAnnotations` (verified; typebot-rag uses its own builder, untouched). (2) `MessageResponse` (src/components/ai-elements/message.tsx:322-342): Streamdown accepts a react-markdown-style `components` prop (verified in its .d.ts) — add default chat-scale heading renderers. (3) `SourceAnnotations` (src/components/kbridge/SourceAnnotations.tsx): wrap the detail-card list in one collapsed-by-default `<details>`, drop the internal `checkedBy` id, localize the review status. (4) `AgentResponseCard` (:115-123): localized labels for the two possible backend ids ("openai-pgvector", "legal-basis" — the only values ever emitted, tools.ts:343), fixing the dead `includes("pgvector")` exact-match variant condition, and localizing the "Grounded" badge.

**Tech Stack:** TypeScript/React (Next.js), Streamdown `components` overrides, bun test scripts.

## Global Constraints

- Branch: `feat/answer-rendering-cleanup` off `main`. Commit per task. Trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- NEVER stage `Capsomnia/` or `.superpowers/`; `git add <file> …` only. Never run prisma/db commands.
- Rendering/labels ONLY — no retrieval, scoring, persistence, or answer-content logic changes beyond the fallback's format. The LLM-path answer content is untouched (heading components apply to all bubbles — that is the point — but no text changes).
- The typebot-rag builder (`direct-lexical-fallback.ts` COPY/answerWithSources) is OUT of scope — its surface has no SourceAnnotations, so its in-answer source list stays.
- All new user-facing strings in 4 locales (ko/vi/mn/en) following each file's existing locale pattern.
- Deploy canary compatibility: `release:check:backend` asserts consult answers by length/failure-text only — verify no canary assertion references "📚 출처" before removing (grep scripts/check-production-cutover.ts).
- Accessibility: heading overrides keep semantic heading TAGS (h2 stays h2) with chat-scale classes; the `<details>` uses a real `<summary>`.

---

### Task 1: Consult fallback format (strip glued headings, localize source labels, drop the duplicate list)

**Files:**
- Modify: `src/app/api/ai/consult/route.ts` (`buildOfficialSummaryFallback`, export it for the test seam like `normalizeExpertResponse` was)
- Test: `scripts/test-consult-fallback-format.ts` (new)
- Modify: `package.json` (add `"test:consult-fallback-format": "bun run scripts/test-consult-fallback-format.ts"` next to `test:official-summary-lead`; append ` && bun run test:consult-fallback-format` to the END of `ci:domain`)

**Interfaces:**
- Consumes: existing `KnowledgeDoc`/`pickLangText`/`getRagDocumentMetadata` in the route.
- Produces: fallback answers with (a) no literal `#` heading residue in section bodies, (b) `출처:` lines showing localized labels for the enum literals (`official_government` → 정부 공식 / Chính phủ / Засгийн газрын / Government official; `official_law` → 법령 / Pháp luật / Хууль / Law; `internal_analysis`·`internal_policy` → KAXI), any other value passed through unchanged (real org-name strings stay), (c) NO `📚 출처:` block (per-section 출처 lines and the sourceNotice footer stay).

- [ ] **Step 1: Grep the canary + tests for format dependencies**

Run: `grep -rn "📚" scripts/ src/ && grep -rn "buildOfficialSummaryFallback" scripts/ src/`
Expected: the emoji appears only in consult/route.ts (and possibly typebot's own builder — untouched); no script asserts the consult 📚 block. If any does, STOP and report BLOCKED with the reference.

- [ ] **Step 2: Write the failing test**

Create `scripts/test-consult-fallback-format.ts`:

```ts
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
```

(If `buildOfficialSummaryFallback`'s doc access requires more `KnowledgeDoc` fields than the fixture carries — e.g. `getRagDocumentMetadata` needs `ragMeta` — extend the fixture minimally so the function runs; keep `as never[]` casting only if the type demands unrelated fields. Note adjustments in the report.)

- [ ] **Step 3: Wire the script; verify RED**

package.json entries per Files. Run: `bun run test:consult-fallback-format`
Expected: FAIL — `buildOfficialSummaryFallback` not exported.

- [ ] **Step 4: Implement**

In `src/app/api/ai/consult/route.ts`:

a. Export the function (add a comment: exported as a test seam, not a public API — same convention as `normalizeExpertResponse` in unified/route.ts).

b. Add the label helper above it:

```ts
const SOURCE_TYPE_LABELS: Record<string, Record<Lang, string>> = {
  official_government: { ko: "정부 공식", vi: "Chính phủ", mn: "Засгийн газрын", en: "Government official" },
  official_law: { ko: "법령", vi: "Pháp luật", mn: "Хууль", en: "Law" },
  internal_analysis: { ko: "KAXI 분석", vi: "Phân tích KAXI", mn: "KAXI шинжилгээ", en: "KAXI analysis" },
  internal_policy: { ko: "KAXI 정책", vi: "Chính sách KAXI", mn: "KAXI бодлого", en: "KAXI policy" },
};

function sourceDisplayLabel(source: string, lang: Lang): string {
  return SOURCE_TYPE_LABELS[source]?.[lang] || source;
}
```

c. In the `sections` map: strip heading lines from content BEFORE the whitespace collapse —

```ts
      const content = pickLangText(doc.content, lang)
        .replace(/^#{1,6}\s.*$/gm, " ")
        .replace(/\s+/g, " ")
        .trim();
```

and change the 출처 line to use `sourceDisplayLabel(doc.source, lang)`.

d. Delete the `sourceList` construction and remove the `📚 출처:\n${sourceList}\n\n` segment from the returned template (sections + sourceNotice remain, with clean blank-line joins).

- [ ] **Step 5: GREEN + gates**

Run: `bun run test:consult-fallback-format && bun run test:official-summary-lead && bun run ci:types && bun run lint`
Expected: all PASS (`test:official-summary-lead` guards the lead module is unaffected).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/ai/consult/route.ts scripts/test-consult-fallback-format.ts package.json
git commit -m "feat(consult): clean fallback sections, localized source labels, single source surface

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Chat-scale headings + collapsed evidence + de-jargoned badges

**Files:**
- Modify: `src/components/ai-elements/message.tsx` (`MessageResponse`)
- Modify: `src/components/kbridge/SourceAnnotations.tsx`
- Modify: `src/components/agent/AgentResponseCard.tsx`

**Interfaces:** presentation-only; no prop contract changes visible to callers (new `components` default is overridable via the existing props spread).

- [ ] **Step 1: Heading scale in MessageResponse**

In `message.tsx`, define above `MessageResponse`:

```tsx
// Answers quote official documents whose markdown headings would otherwise
// render at page scale inside a chat bubble. Chat-scale sizes, semantic tags
// kept for accessibility. Callers can still override via the props spread.
const chatHeading = (Tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6", className: string) => {
  const Heading = ({ node: _node, ...props }: React.ComponentProps<typeof Tag> & { node?: unknown }) => (
    <Tag {...props} className={className} />
  );
  Heading.displayName = `Chat${Tag.toUpperCase()}`;
  return Heading;
};

const CHAT_MARKDOWN_COMPONENTS = {
  h1: chatHeading("h2", "mt-4 mb-2 text-base font-semibold"),
  h2: chatHeading("h2", "mt-4 mb-2 text-base font-semibold"),
  h3: chatHeading("h3", "mt-3 mb-1.5 text-sm font-semibold"),
  h4: chatHeading("h4", "mt-3 mb-1.5 text-sm font-semibold"),
  h5: chatHeading("h5", "mt-2 mb-1 text-sm font-medium"),
  h6: chatHeading("h6", "mt-2 mb-1 text-sm font-medium"),
} as const;
```

and pass `components={CHAT_MARKDOWN_COMPONENTS}` to `Streamdown` BEFORE the `{...props}` spread (so explicit callers can still override). Adapt typing to Streamdown's `Components` type if the compiler complains (import the type or use a satisfies cast); h1 deliberately renders as h2 (a chat bubble is not a page).

- [ ] **Step 2: SourceAnnotations — collapse + de-jargon**

In `SourceAnnotations.tsx`:
a. Wrap the detail-card list (the block at ~:147-218, NOT the compact chip row) in:

```tsx
      <details className="mt-2 group">
        <summary className="cursor-pointer text-xs text-muted-foreground select-none">
          {detailsLabel}
        </summary>
        {/* existing detail-card list */}
      </details>
```

with `detailsLabel` localized: ko `출처 근거 자세히 보기` · vi `Xem chi tiết căn cứ nguồn` · mn `Эх сурвалжийн үндэслэлийг харах` · en `Show source evidence` — derive the locale the same way the file already localizes `sourceKind()` labels (read how it decides ko vs En; mirror it, extending to vi/mn if the file's mechanism supports it, else follow the file's existing two-branch convention and note it).
b. Remove the ` · ${source.checkedBy}` concatenation (internal reviewer ids are not user-facing).
c. Localize the review status: where `"검수 " + status` renders, map `approved` → ko `검수 완료` / vi `Đã duyệt` / mn `Баталгаажсан` / en `Reviewed`, other statuses → keep current raw rendering.

- [ ] **Step 3: AgentResponseCard badges**

a. Backend label map (above the component, following the file's locale-ternary style):

```tsx
const RETRIEVAL_BACKEND_LABELS: Record<string, { ko: string; vi: string; mn: string; en: string }> = {
  "openai-pgvector": { ko: "공식 문서 검색", vi: "Tìm tài liệu chính thức", mn: "Албан баримт хайлт", en: "Document search" },
  "legal-basis": { ko: "법령 근거", vi: "Căn cứ pháp luật", mn: "Хуулийн үндэслэл", en: "Legal basis" },
};
```

In the badge (:115-123): render `retrievalBackends.map((backend) => RETRIEVAL_BACKEND_LABELS[backend]?.[locale] ?? backend).join("/")`, and fix the dead variant condition `retrievalBackends.includes("pgvector")` (Array exact-match never true — the value is "openai-pgvector") to `retrievalBackends.some((backend) => backend.includes("pgvector"))`.
b. Localize the Grounded badge text: ko `공식 근거` · vi `Có căn cứ` · mn `Баримттай` · en `Grounded` (icon unchanged).

- [ ] **Step 4: Gates**

Run: `bun run ci:types && bun run lint`
Expected: clean. (No component-test infra exists; visual proof is Task 3.)

- [ ] **Step 5: Commit**

```bash
git add src/components/ai-elements/message.tsx src/components/kbridge/SourceAnnotations.tsx src/components/agent/AgentResponseCard.tsx
git commit -m "feat(chat): chat-scale headings, collapsed source evidence, localized badges

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Visual proof + rollout

Operational (orchestrator-driven):

- [ ] **Local visual proof (before PR)**: dev server with LLM keys blanked (`.claude/launch.json` "kaxi-dev-no-llm"), POST the D-4 extension question through the page context, render /ko/agent and screenshot: headings at chat scale (no giant text), NO in-answer 📚 list, source evidence collapsed behind "출처 근거 자세히 보기", badges reading "공식 문서 검색" / "공식 근거" / "모델 미사용 · 문서 직접 요약", no "partner_agent_001" anywhere.
- [ ] PR → CI green → merge → deploy → post-deploy checks + a prod consult probe confirming the answer contains no `📚` and no raw `official_government`.
