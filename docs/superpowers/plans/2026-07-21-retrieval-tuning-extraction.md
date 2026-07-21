# Retrieval Tuning Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the reranker's hand-tuned boost coefficients and the Korea-specific intent/operational/risk rule data out of `direct-lexical-fallback.ts` (1,520 lines) into a dedicated, documented tuning module — behavior byte-identical, proven by a characterization test written BEFORE the move.

**Architecture:** Two-step refactor. Step 1 pins current behavior: a new DB-free characterization suite drives the exported `searchServingRagDocuments(input, { createEmbedding, rpc })` seam with coefficient-isolating candidate PAIRS — two candidates identical except for the one attribute a coefficient rewards, so the rerank-score DELTA equals that coefficient exactly (no need to reimplement tokenizer math). Step 2 moves the data: a new `src/lib/chat/retrieval-tuning.ts` owns `RERANK_WEIGHTS` (all 10 magic numbers, named and documented) plus the rule/hint tables (`OPERATIONAL_QUERY_RULES`, `QUESTION_INTENTS`, `QUERY_HINTS`, `RISK_*`, `LANGUAGE_STUDY_*`); `direct-lexical-fallback.ts` imports them. The characterization suite must pass unchanged after the move — that IS the refactor's correctness proof.

**Tech Stack:** TypeScript, bun test scripts, existing dependency-injection seam (`DirectRagSearchDependencies`).

## Global Constraints

- Branch: `feat/retrieval-tuning-extraction` off `main`. Commit per task. Trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- NEVER stage `Capsomnia/` or `.superpowers/`; `git add <file> …` only. Never run prisma/db commands.
- **Behavior parity is the entire point**: Task 2 may not change any regex, string, number, or evaluation order — only MOVE them. The characterization suite from Task 1 must pass byte-unchanged after Task 2. If any Task 1 assertion needs editing during Task 2, that is a parity break: STOP and report BLOCKED.
- The 10 coefficients being extracted, verbatim from `parseCandidates` (current lines ~912-936): exactOperational **0.56**, operationalCoverageCap **0.3**, operationalCoverageWeight **0.6**, categoryExact **0.18**, categoryScope **0.08**, risk **0.58**, visaCode **0.34**, bodyCoverage **0.45**, headingCoverage **0.25**, bias **0.02**.
- Out of scope (do NOT touch): `CATEGORY_SCOPES`, `STOP_WORDS`, `COPY`, `FALLBACK_TITLES`, `HUMAN_REVIEW_REQUEST_PATTERN`, `NON_USER_FACING_EVIDENCE_PATTERN`, guardrails, the extractive answer builder, any RPC/LLM logic. No multi-jurisdiction machinery (YAGNI — this extraction is the precondition, not the feature).

---

### Task 1: Characterization suite (pins CURRENT behavior — written and committed before any move)

**Files:**
- Test: `scripts/test-retrieval-tuning.ts` (new)
- Modify: `package.json` (add `"test:retrieval-tuning": "bun run scripts/test-retrieval-tuning.ts"` next to `test:rag-fallback`; append ` && bun run test:retrieval-tuning` to the END of the `ci:domain` chain)

**Interfaces:**
- Consumes: `searchServingRagDocuments` and its `DirectRagSearchDependencies` seam (`createEmbedding`, `rpc`) — exactly as `scripts/test-rag-direct-fallback.ts` already uses them. Result documents carry `rerankScore` (the consult route reads `document.rerankScore`).
- Produces: the parity oracle Task 2 runs against.

- [ ] **Step 1: Write the suite**

Create `scripts/test-retrieval-tuning.ts`:

```ts
import assert from "node:assert/strict";
const { searchServingRagDocuments } = await import("../src/lib/chat/direct-lexical-fallback");
const { createRagQueryEmbedding } = await import("../src/lib/chat/query-embedding");
import type { QueryEmbeddingResult } from "../src/lib/chat/query-embedding";

// Characterization suite for the deterministic reranker in parseCandidates.
// Method: coefficient-isolating pairs — two candidates identical except for
// the ONE attribute a boost rewards, so the rerank-score delta IS the
// coefficient. This pins every magic number without reimplementing the
// tokenizer. It must pass byte-unchanged across the retrieval-tuning
// extraction refactor.

const noEmbedding: QueryEmbeddingResult = await createRagQueryEmbedding("probe", {
  env: {} as NodeJS.ProcessEnv,
});
assert.equal(noEmbedding.status, "not_configured");

let rowCounter = 0;
function candidateRow(overrides: {
  docId: string;
  title: string;
  content: string;
  category?: string;
  keywords?: string;
}) {
  rowCounter += 1;
  return {
    id: rowCounter,
    content: overrides.content,
    metadata: {
      doc_id: overrides.docId,
      title: overrides.title,
      source: "Hi Korea",
      source_url: `https://www.hikorea.go.kr/${overrides.docId}`,
      last_checked_at: "2026-07-10T00:00:00.000Z",
      checked_by: "kaxi-legal-review",
      language: "ko",
      category: overrides.category || "visa",
      lexical_score: 0.5,
      keywords: overrides.keywords || "",
    },
    similarity: 0,
  };
}

async function scores(question: string, rows: unknown[], category: "visa" | "documents" | "cost" | "school" | "general" = "visa") {
  const result = await searchServingRagDocuments(
    {
      question,
      category,
      locale: "ko",
      tenantId: "default",
      requestId: "11111111-1111-4111-8111-111111111111",
      fallbackReason: "characterization",
      maxDocuments: 6,
    },
    {
      createEmbedding: async () => noEmbedding,
      rpc: async () => ({ data: rows }),
    },
  );
  return new Map(result.documents.map((document) => [document.id, document.rerankScore]));
}

function delta(map: Map<string, number>, a: string, b: string) {
  const left = map.get(a);
  const right = map.get(b);
  assert.ok(left !== undefined && right !== undefined, `both ${a} and ${b} must survive parsing`);
  return Number((left! - right!).toFixed(4));
}

// Shared neutral body: Korean (locale gate), no query-token overlap with the
// questions below, no visa codes, no risk/operational vocabulary.
const NEUTRAL_CONTENT = "## 안내 문서\n대한민국 생활 정보에 대한 일반적인 안내입니다. 지역 행사와 편의시설 정보를 담고 있습니다.";
const NEUTRAL_TITLE = "안내 문서";

// ── categoryExact (0.18), categoryScope (0.08), bias (0.02) ──
// Question is deliberately boost-inert. Base lexical_score is 0.5, so the
// absolute scores pin bias and both category coefficients at once.
{
  const map = await scores("공항 라운지 이용 방법을 알려줘", [
    candidateRow({ docId: "cat-exact", title: NEUTRAL_TITLE, content: NEUTRAL_CONTENT, category: "visa" }),
    candidateRow({ docId: "cat-scope", title: NEUTRAL_TITLE, content: NEUTRAL_CONTENT, category: "legal" }),
  ]);
  assert.equal(map.get("cat-exact"), 0.7, "base 0.5 + categoryExact 0.18 + bias 0.02");
  assert.equal(map.get("cat-scope"), 0.6, "base 0.5 + categoryScope 0.08 + bias 0.02");
  assert.equal(delta(map, "cat-exact", "cat-scope"), 0.1);
  console.log("PASS retrieval tuning: category boosts + bias (absolute anchors)");
}

// ── risk (0.58) ── risk marker lives in docId only (docId is NOT part of
// body/heading coverage text), so the pair isolates the risk coefficient.
{
  const map = await scores("허위 서류를 내면 어떤 처벌을 받나요", [
    candidateRow({ docId: "fake-documents-warning", title: NEUTRAL_TITLE, content: NEUTRAL_CONTENT }),
    candidateRow({ docId: "ordinary-guide", title: NEUTRAL_TITLE, content: NEUTRAL_CONTENT }),
  ]);
  assert.equal(delta(map, "fake-documents-warning", "ordinary-guide"), 0.58);
  console.log("PASS retrieval tuning: risk boost");
}

// ── visaCode (0.34) ── code appears in docId only; content/title carry none.
{
  const map = await scores("D-4 비자 정보를 알려줘", [
    candidateRow({ docId: "guide-d4-info", title: NEUTRAL_TITLE, content: NEUTRAL_CONTENT }),
    candidateRow({ docId: "guide-plain-info", title: NEUTRAL_TITLE, content: NEUTRAL_CONTENT }),
  ]);
  assert.equal(delta(map, "guide-d4-info", "guide-plain-info"), 0.34);
  console.log("PASS retrieval tuning: visa-code boost");
}

// ── exactOperational (0.56) ── question triggers the stay-extension rule;
// the hyphenated hint token in docId marks an exact operational identity.
{
  const map = await scores("체류기간 연장 신청은 어떻게 하나요", [
    candidateRow({ docId: "hikorea-stay-extension", title: NEUTRAL_TITLE, content: NEUTRAL_CONTENT }),
    candidateRow({ docId: "unrelated-guide", title: NEUTRAL_TITLE, content: NEUTRAL_CONTENT }),
  ]);
  assert.equal(delta(map, "hikorea-stay-extension", "unrelated-guide"), 0.56);
  console.log("PASS retrieval tuning: exact operational identity boost");
}

// ── operationalCoverageCap (0.3) ── keywords stuffed with the rule's hint
// vocabulary (non-Korean tokens only, so body coverage is untouched; no
// hyphenated token in docId/title, so the exact-identity path stays off).
// Two different stuffing levels both landing on the cap prove the cap.
{
  const map = await scores("체류기간이 만료되기 전에 무엇을 해야 하나요", [
    candidateRow({ docId: "capped-a", title: NEUTRAL_TITLE, content: NEUTRAL_CONTENT, keywords: "stay extension gia hạn хугацаа сунгах" }),
    candidateRow({ docId: "capped-b", title: NEUTRAL_TITLE, content: NEUTRAL_CONTENT, keywords: "stay extension gia hạn хугацаа сунгах hikorea-stay-extension immigration-act-stay-extension" }),
    candidateRow({ docId: "no-keywords", title: NEUTRAL_TITLE, content: NEUTRAL_CONTENT }),
  ]);
  assert.equal(delta(map, "capped-a", "capped-b"), 0, "both stuffing levels must hit the cap");
  assert.equal(delta(map, "capped-a", "no-keywords"), 0.3, "cap value");
  console.log("PASS retrieval tuning: operational coverage cap");
}

// ── bodyCoverage (0.45) and headingCoverage (0.25) ── query tokens appear
// only in keywords (body-only: +0.45) or only in the title (title text is
// part of the body text too: +0.45 + 0.25 = 0.70).
{
  const map = await scores("환승공항 라운지 위치", [
    candidateRow({ docId: "kw-only", title: NEUTRAL_TITLE, content: NEUTRAL_CONTENT, keywords: "환승공항 라운지 위치" }),
    // localizedTitle prefers the CONTENT's first heading over metadata.title,
    // so the tokens must live in the heading line itself.
    candidateRow({ docId: "title-hit", title: "환승공항 라운지 위치", content: "## 환승공항 라운지 위치\n대한민국 생활 정보에 대한 일반적인 안내입니다." }),
    candidateRow({ docId: "no-hit", title: NEUTRAL_TITLE, content: NEUTRAL_CONTENT }),
  ]);
  assert.equal(delta(map, "kw-only", "no-hit"), 0.45, "body coverage weight");
  assert.equal(delta(map, "title-hit", "no-hit"), 0.7, "heading 0.25 + body 0.45 (title feeds both)");
  console.log("PASS retrieval tuning: coverage weights");
}

// ── ordering + dedup + result-size clamp ──
{
  const dupA = candidateRow({ docId: "dup-doc", title: NEUTRAL_TITLE, content: NEUTRAL_CONTENT });
  const dupB = candidateRow({ docId: "dup-doc", title: NEUTRAL_TITLE, content: NEUTRAL_CONTENT });
  const distinct = Array.from({ length: 7 }, (_, index) =>
    candidateRow({ docId: `doc-${index}`, title: NEUTRAL_TITLE, content: NEUTRAL_CONTENT }));
  const map = await scores("공항 라운지 이용 방법을 알려줘", [dupA, dupB, ...distinct]);
  assert.equal(map.size, 6, "dedup by docId + clamp to maxDocuments");
  assert.equal(map.has("dup-doc"), true);
  console.log("PASS retrieval tuning: dedup and result clamp");
}

console.log("PASS retrieval tuning characterization: every rerank coefficient pinned");
```

- [ ] **Step 2: Wire the script and run it against CURRENT code**

Add the package.json script + `ci:domain` append (Files section above), then:

Run: `bun run test:retrieval-tuning`
Expected: all 7 `PASS retrieval tuning: …` lines against the UNMODIFIED `direct-lexical-fallback.ts`.

Characterization caveat (the ONLY permitted adjustment): if an assertion fails because a pair was not perfectly isolated (e.g. an unexpected tokenizer interaction), print the actual scores, understand WHY, and adjust the FIXTURE (question/keywords/title) to restore isolation — never adjust a coefficient delta to a value other than the plan's ten constants. If isolation cannot be achieved for some pin, keep the remaining pins, record the gap in the report, and continue.

- [ ] **Step 3: Also run neighbors + gates**

Run: `bun run test:rag-fallback && bun run ci:types && bun run lint`
Expected: PASS (proves the new suite coexists with the existing fallback suite).

- [ ] **Step 4: Commit**

```bash
git add scripts/test-retrieval-tuning.ts package.json
git commit -m "test(rag): characterization suite pinning every rerank coefficient

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Extract the tuning module

**Files:**
- Create: `src/lib/chat/retrieval-tuning.ts`
- Modify: `src/lib/chat/direct-lexical-fallback.ts` (delete the moved declarations, import them; replace inline coefficient literals with `RERANK_WEIGHTS.*`)

**Interfaces:**
- Consumes: type imports for `GuardrailLocale` and `ChatCategory` — mirror exactly the import sources `direct-lexical-fallback.ts` already uses for those two types (check its import block; do not invent new type homes).
- Produces (all consumed back by `direct-lexical-fallback.ts`):
  - `RERANK_WEIGHTS` (as const object, fields: `exactOperational, operationalCoverageCap, operationalCoverageWeight, categoryExact, categoryScope, risk, visaCode, bodyCoverage, headingCoverage, bias`)
  - `QUERY_HINTS`, `RISK_QUERY_HINTS`, `LANGUAGE_STUDY_QUERY_HINTS` (verbatim moves)
  - `RISK_QUERY_PATTERN`, `LANGUAGE_STUDY_PATTERN` (verbatim moves)
  - `RISK_EVIDENCE_IDENTITY_PATTERN` — the currently-inline regex at the risk boost site (`/fake|false|forg|violation|warning|위조|허위|가짜|giả|хуурамч|хуурмаг/iu`), named for the first time
  - `OPERATIONAL_QUERY_RULES`, `QUESTION_INTENTS`, `type QuestionIntent` (verbatim moves)

- [ ] **Step 1: Create the module**

Create `src/lib/chat/retrieval-tuning.ts`. Header comment (adapt wording, keep substance):

```ts
// Deterministic retrieval tuning for the direct RAG path: every reranker
// coefficient and every Korea-jurisdiction intent/operational/risk rule
// lives HERE, as data. direct-lexical-fallback.ts owns the mechanism
// (tokenizing, coverage, scoring); this module owns the numbers and the
// domain vocabulary. A second jurisdiction means a second set of THESE
// tables — never a fork of the mechanism.
```

Then move, verbatim (cut from `direct-lexical-fallback.ts`, paste here, add `export`): `QUERY_HINTS`, `RISK_QUERY_HINTS`, `RISK_QUERY_PATTERN`, `LANGUAGE_STUDY_QUERY_HINTS`, `LANGUAGE_STUDY_PATTERN`, `OPERATIONAL_QUERY_RULES`, `QuestionIntent` type, `QUESTION_INTENTS`. Add the two new named exports:

```ts
export const RISK_EVIDENCE_IDENTITY_PATTERN = /fake|false|forg|violation|warning|위조|허위|가짜|giả|хуурамч|хуурмаг/iu;

// Hand-tuned on the Korea corpus (2026-07). Change only alongside a
// test-retrieval-tuning update — each field is pinned there by a
// coefficient-isolating pair.
export const RERANK_WEIGHTS = {
  exactOperational: 0.56,
  operationalCoverageCap: 0.3,
  operationalCoverageWeight: 0.6,
  categoryExact: 0.18,
  categoryScope: 0.08,
  risk: 0.58,
  visaCode: 0.34,
  bodyCoverage: 0.45,
  headingCoverage: 0.25,
  bias: 0.02,
} as const;
```

- [ ] **Step 2: Rewire `direct-lexical-fallback.ts`**

Delete the moved declarations; add one import from `@/lib/chat/retrieval-tuning`. In `parseCandidates`, replace the literals:

```ts
    const operationalBoost = exactOperationalHint
      ? RERANK_WEIGHTS.exactOperational
      : Math.min(RERANK_WEIGHTS.operationalCoverageCap, operationalCoverage * RERANK_WEIGHTS.operationalCoverageWeight);
    const categoryBoost = input.category === "general"
      ? 0
      : candidateCategory === input.category ? RERANK_WEIGHTS.categoryExact : RERANK_WEIGHTS.categoryScope;
    const riskBoost = RISK_QUERY_PATTERN.test(input.question)
      && RISK_EVIDENCE_IDENTITY_PATTERN.test(`${docId || ""} ${title}`)
      ? RERANK_WEIGHTS.risk
      : 0;
```

and in the `rerankScore` sum: `bodyCoverage * RERANK_WEIGHTS.bodyCoverage`, `headingCoverage * RERANK_WEIGHTS.headingCoverage`, `+ RERANK_WEIGHTS.bias`. The `visaCodeBoost` ternary uses `RERANK_WEIGHTS.visaCode`. Nothing else in the file changes. If any OTHER file imports the moved names from `direct-lexical-fallback` (grep before deleting), re-export them from `direct-lexical-fallback.ts` via `export { … } from "@/lib/chat/retrieval-tuning";` to keep external imports stable, and say so in the report.

- [ ] **Step 3: The parity proof**

Run: `bun run test:retrieval-tuning && bun run test:rag-fallback && bun run test:citations && bun run ci:types && bun run lint`
Expected: ALL PASS with `scripts/test-retrieval-tuning.ts` byte-identical to Task 1's commit (verify: `git diff --stat HEAD -- scripts/test-retrieval-tuning.ts` prints nothing).

- [ ] **Step 4: Commit**

```bash
git add src/lib/chat/retrieval-tuning.ts src/lib/chat/direct-lexical-fallback.ts
git commit -m "refactor(rag): extract rerank weights + intent rules into retrieval-tuning

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Docs + full gates + rollout

**Files:** none — the tuning module's header comment is the documentation. This task is gates + rollout only.

- [ ] **Step 1: Full relevant gates**

Run: `bun run ci:types && bun run lint && bun run test:retrieval-tuning && bun run test:rag-fallback && bun run test:citations && bun run test:grounded-answer && bun run test:vector`
(`test:vector` and `test:grounded-answer` may need the local test DB via prepareTestDb — if the session's consent gate blocks it, record "deferred to CI" and rely on the PR's hermetic CI run; never fabricate consent.)

- [ ] **Step 2: Rollout (operator-gated)**

Open PR; CI green (ci:domain now includes test:retrieval-tuning); merge; `gh workflow run "Vercel Production Deploy"`; post-deploy checks (`/api/health` commit match, readiness, documents 401). Behavior-parity live probe: one heavy consult question via the deploy canary is already covered (`release:check:backend` runs /api/ai/agent + /api/ai/consult with content assertions during the deploy) — additionally spot-check `POST /api/ai/consult` once post-promotion and confirm `searchMeta` document scores are populated and non-zero.
