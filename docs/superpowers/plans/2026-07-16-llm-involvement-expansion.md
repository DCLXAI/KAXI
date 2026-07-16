# LLM Involvement Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise the share of LLM-written chatbot output by retrying/repairing grounded-answer generation, LLM-writing clarification copy, and making agent/consult LLM fallbacks queryable — with every existing deterministic fallback preserved byte-identical.

**Architecture:** Three additive changes behind existing seams. (A) `generateGroundedRagAnswer` gains a tolerant parser and one condensed-prompt retry, mirroring the proven mediator retry (`question-mediator.ts:626-656`); new `search_meta` keys record attempts. (B) A new `clarification-writer` module LLM-writes the clarify copy only when the static template would ship; the routing decision itself stays deterministic. (C) A new `llm-fallback-events` wrapper records best-effort `ops_events` when agent/consult serve their non-LLM fallbacks.

**Tech Stack:** Next.js App Router, Bun test scripts (`assert` + `Bun.mock.module` gateway interception, pattern at `scripts/test-session-profile.ts:300-350`), existing LLM gateway (`generateLlmText`), Supabase `ops_events` via `recordOpsEvent`.

**Spec:** `docs/superpowers/specs/2026-07-16-llm-involvement-expansion-design.md`

## Global Constraints

- Branch: `feat/llm-involvement-expansion` (create from up-to-date `main`; never commit to `main`).
- LLM-unavailable behavior stays byte-identical to today except NEW metadata keys (`answerAttempts`, `answerRetryReason`, `clarificationSource`, `clarificationBackend/Model/LatencyMs`).
- Never rescue a missing/non-boolean `supported` flag — that is the grounding guarantee; parse failure → retry, not pass-through.
- No retry for `not_configured`; at most ONE retry per turn.
- Telemetry is best-effort: a `recordOpsEvent` failure must never fail or delay the user turn.
- Do NOT stage or commit `Capsomnia/` or `.superpowers/`.
- Commit trailer verbatim: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- Never run any `db:migrate*`/`prisma migrate` command — ambient DATABASE_URL points at PRODUCTION. DB-backed suites use the loopback test DB via `prepareTestDb`; the three NEW test scripts here are pure unit tests and must NOT touch any DB.
- Deterministic ROUTING conditions (`planDeterministicRagQuestion`, high-risk patterns, visa codes) must not change.
- Final gates: `bun run ci:types && bun run lint && bun run ci:domain && bun run ci:ops` (ci:domain is mandatory — PR #17 lesson).

---

### Task 1: Grounded answer tolerant parse + single retry

**Files:**
- Modify: `src/lib/chat/grounded-rag-answer.ts` (parser :107-129, generator :154-237, result types :39-59)
- Modify: `src/lib/chat/direct-lexical-fallback.ts:1401-1419` (surface new metadata)
- Create: `scripts/test-grounded-answer.ts`
- Modify: `package.json` (add `"test:grounded-answer": "bun run scripts/test-grounded-answer.ts"` next to line 62; append `&& bun run test:grounded-answer` to the `ci:domain` chain at line 117)

**Interfaces:**
- Produces: exported `parseGroundedModelOutput(value: string): GroundedModelOutput | null` (renamed from private `parseModelOutput`); `GroundedAnswerResult` variants gain `attempts: 1 | 2` and `retryReason: "invalid_generation" | "generation_failed" | null` (on the `unavailable` variant they are optional: absent only for the pre-call `not_configured` return). `search_meta` gains `answerAttempts` and `answerRetryReason`.
- Consumes: nothing from other tasks.

- [ ] **Step 1: Write the failing test** — create `scripts/test-grounded-answer.ts`:

```ts
import assert from "node:assert/strict";
import { mock } from "bun:test";

// Sequence-driven gateway mock: each call shifts the next scripted behavior.
type Scripted = { text?: string; throw?: Error };
let script: Scripted[] = [];
let calls = 0;
class FakeNotConfigured extends Error {}
mock.module("@/lib/ai/llm-gateway", () => ({
  isLlmConfigured: () => true,
  isLlmNotConfiguredError: (error: unknown) => error instanceof FakeNotConfigured,
  generateLlmText: async () => {
    calls += 1;
    const step = script.shift();
    if (!step) throw new Error("unscripted gateway call");
    if (step.throw) throw step.throw;
    return { text: step.text || "", backend: "kimi", model: "test-model", durationMs: 5 };
  },
}));

const { generateGroundedRagAnswer, parseGroundedModelOutput } = await import("../src/lib/chat/grounded-rag-answer");

const request = {
  question: "D-4에서 D-2로 바꾸려면 어떤 서류가 필요해?",
  category: "visa" as const,
  locale: "ko" as const,
  documents: [{ title: "체류자격 변경 안내", content: "통합신청서 등", source: "법무부", sourceUrl: "https://example.gov", checkedAt: "2026-07-01", checkedBy: "ops" }],
};
const VALID = JSON.stringify({ supported: true, answer: "통합신청서가 필요합니다 [1]", nextStep: "출입국사무소에 제출하세요.", usedSourceIndexes: [1] });

// 1. parser tolerance: nested container + snake_case + missing indexes
assert.ok(parseGroundedModelOutput(JSON.stringify({ result: { supported: true, answer: "a", next_step: "b" } })));
assert.deepEqual(parseGroundedModelOutput(JSON.stringify({ supported: "true", answer: "a", nextStep: "b" }))?.usedSourceIndexes, []);
// 2. the grounding guarantee is never rescued
assert.equal(parseGroundedModelOutput(JSON.stringify({ answer: "a", nextStep: "b", usedSourceIndexes: [] })), null);

// 3. invalid first output -> retry succeeds
script = [{ text: "지금부터 답변하겠습니다." }, { text: VALID }]; calls = 0;
let result = await generateGroundedRagAnswer(request);
assert.equal(result.status, "answered");
assert.equal(calls, 2);
assert.equal("attempts" in result && result.attempts, 2);
assert.equal("retryReason" in result && result.retryReason, "invalid_generation");

// 4. both invalid -> unavailable invalid_generation, attempts recorded
script = [{ text: "no json" }, { text: "still no json" }];
result = await generateGroundedRagAnswer(request);
assert.deepEqual(result, { status: "unavailable", reason: "invalid_generation", attempts: 2, retryReason: "invalid_generation" });

// 5. first attempt throws (generic) -> retry succeeds with retryReason generation_failed
script = [{ throw: new Error("upstream 500") }, { text: VALID }]; calls = 0;
result = await generateGroundedRagAnswer(request);
assert.equal(result.status, "answered");
assert.equal(calls, 2);
assert.equal("retryReason" in result && result.retryReason, "generation_failed");

// 6. not_configured -> NO retry, single call
script = [{ throw: new FakeNotConfigured("no key") }]; calls = 0;
result = await generateGroundedRagAnswer(request);
assert.equal(result.status, "unavailable");
assert.equal("reason" in result && result.reason, "not_configured");
assert.equal(calls, 1);

// 7. retry throws too -> generation_failed with attempts 2
script = [{ throw: new Error("boom") }, { throw: new Error("boom again") }];
result = await generateGroundedRagAnswer(request);
assert.deepEqual(result, { status: "unavailable", reason: "generation_failed", attempts: 2, retryReason: "generation_failed" });

console.log("PASS grounded answer: tolerant parse, single retry, no not_configured retry");
```

- [ ] **Step 2: Run it — must fail** — `bun run scripts/test-grounded-answer.ts`
Expected: FAIL (`parseGroundedModelOutput` is not exported; `attempts` absent).

- [ ] **Step 3: Implement in `grounded-rag-answer.ts`** —
(3a) Result types: extend `GenerationMetadata` (:39-43) with `attempts: 1 | 2; retryReason: "invalid_generation" | "generation_failed" | null;` and the `unavailable` variant (:56-59) with `attempts?: 1 | 2; retryReason?: "invalid_generation" | "generation_failed" | null;`.
(3b) Replace `parseModelOutput` (:107-129) with the exported tolerant version:

```ts
export function parseGroundedModelOutput(value: string): GroundedModelOutput | null {
  try {
    const unfenced = value.trim().startsWith("```")
      ? value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
      : value.trim();
    const start = unfenced.indexOf("{");
    const end = unfenced.lastIndexOf("}");
    const decoded = JSON.parse(start >= 0 && end > start ? unfenced.slice(start, end + 1) : unfenced) as unknown;
    const rootCandidate = Array.isArray(decoded) ? decoded[0] : decoded;
    if (!rootCandidate || typeof rootCandidate !== "object" || Array.isArray(rootCandidate)) return null;
    const root = rootCandidate as Record<string, unknown>;
    // Mirror the mediator parser's tolerance (question-mediator.ts:309-313):
    // models sometimes wrap the payload in a result/output/data container.
    const nested = [root.result, root.output, root.data].find(
      (candidate): candidate is Record<string, unknown> =>
        Boolean(candidate && typeof candidate === "object" && !Array.isArray(candidate)),
    );
    const parsed = nested || root;
    const read = (...keys: string[]) => keys.map((key) => parsed[key]).find((candidate) => candidate !== undefined);
    // supported is the grounding guarantee: coerce "true"/"false" strings, never default.
    const supportedValue = read("supported", "is_supported", "grounded");
    const supported = typeof supportedValue === "boolean"
      ? supportedValue
      : supportedValue === "true" ? true : supportedValue === "false" ? false : null;
    if (supported === null) return null;
    const answerValue = read("answer", "answer_text");
    const nextStepValue = read("nextStep", "next_step");
    if (typeof answerValue !== "string" || typeof nextStepValue !== "string") return null;
    const indexesValue = read("usedSourceIndexes", "used_source_indexes", "usedSources", "used_sources");
    const usedSourceIndexes = Array.isArray(indexesValue)
      ? indexesValue.filter((index): index is number => Number.isInteger(index)).map(Number)
      : [];
    return { supported, answer: answerValue.trim(), nextStep: nextStepValue.trim(), usedSourceIndexes };
  } catch {
    return null;
  }
}
```

(3c) In the generator, keep the existing `systemPrompt` construction, then replace the single try/catch (:189-236) with the attempt/retry orchestration. The retry prompt is condensed and harsher (mediator style, `question-mediator.ts:639` precedent) but keeps the sources:

```ts
  const retrySystemPrompt = `You write KAXI's grounded answer. Return ONLY one JSON object: {"supported": boolean, "answer": string, "nextStep": string, "usedSourceIndexes": number[]}. No prose, no code fences. Use only facts from the sources below; cite as [1], [2] and list every cited index in usedSourceIndexes. Write in ${language}. If the sources do not support the question, set supported=false with an empty answer and empty usedSourceIndexes.

Question focus: ${request.answerFocus || request.question}

Verified context:
${context}`;

  const attempt = async (attemptIndex: 1 | 2) => {
    const completion = await generateLlmText({
      feature: "structured",
      messages: [
        { role: "system", content: attemptIndex === 1 ? systemPrompt : retrySystemPrompt },
        { role: "user", content: request.question },
      ],
      temperature: 0.1,
      maxTokens: attemptIndex === 1 ? 420 : 320,
      timeoutMs: attemptIndex === 1 ? groundedRagAnswerTimeoutMs() : Math.min(groundedRagAnswerTimeoutMs(), 6_000),
      jsonSchema: {
        name: attemptIndex === 1 ? "kaxi_grounded_answer" : "kaxi_grounded_answer_retry",
        schema: OUTPUT_SCHEMA,
      },
    });
    return { completion, output: parseGroundedModelOutput(completion.text) };
  };

  let retryReason: "invalid_generation" | "generation_failed" | null = null;
  let current: Awaited<ReturnType<typeof attempt>> | null = null;
  try {
    current = await attempt(1);
  } catch (error) {
    if (isLlmNotConfiguredError(error)) {
      return { status: "unavailable", reason: "not_configured", attempts: 1, retryReason: null };
    }
    console.error("[grounded RAG answer generation failed]", error);
    retryReason = "generation_failed";
  }
  if (current && !current.output) retryReason = "invalid_generation";

  let attempts: 1 | 2 = 1;
  if (retryReason) {
    attempts = 2;
    try {
      current = await attempt(2);
    } catch (error) {
      if (isLlmNotConfiguredError(error)) {
        return { status: "unavailable", reason: "not_configured", attempts, retryReason };
      }
      console.error("[grounded RAG answer retry failed]", error);
      return { status: "unavailable", reason: "generation_failed", attempts, retryReason };
    }
    if (!current.output) {
      return { status: "unavailable", reason: "invalid_generation", attempts, retryReason };
    }
  }

  const output = current!.output!;
  const completion = current!.completion;
  const usedSourceIndexes = Array.from(new Set(output.usedSourceIndexes))
    .filter((index) => index >= 1 && index <= Math.min(request.documents.length, 3))
    .slice(0, 3);
  const metadata: GenerationMetadata = {
    backend: completion.backend,
    model: completion.model,
    durationMs: completion.durationMs,
    attempts,
    retryReason,
  };
  if (!output.supported || !output.answer || usedSourceIndexes.length === 0) {
    return {
      ...metadata,
      status: "no_context",
      nextStep: output.nextStep || NO_CONTEXT_NEXT_STEP[request.locale],
    };
  }
  return {
    ...metadata,
    status: "answered",
    answer: output.answer.slice(0, 2_400),
    nextStep: (output.nextStep || NO_CONTEXT_NEXT_STEP[request.locale]).slice(0, 500),
    usedSourceIndexes,
  };
```

(3d) `direct-lexical-fallback.ts` — surface the new keys. In the unavailable branch (:1401-1410) add after `answerGenerationFailureReason`:
```ts
        answerAttempts: generation.attempts ?? 1,
        answerRetryReason: generation.retryReason ?? null,
```
and in `generatedMetadata` (:1413-1419) add:
```ts
    answerAttempts: generation.attempts,
    answerRetryReason: generation.retryReason,
```

- [ ] **Step 4: Run tests** — `bun run scripts/test-grounded-answer.ts` → PASS line printed. Then regressions: `bun run test:session-profile && bun run test:rag-fallback` → both PASS (session-profile's grounded mock returns a valid payload on the first call, so `attempts: 1` flows through untouched).

- [ ] **Step 5: Wire the script** — add to `package.json` scripts: `"test:grounded-answer": "bun run scripts/test-grounded-answer.ts"` (alphabetically near `test:rag-fallback`), and append `&& bun run test:grounded-answer` to the END of the `ci:domain` value (line 117).

- [ ] **Step 6: Commit**

```bash
git add src/lib/chat/grounded-rag-answer.ts src/lib/chat/direct-lexical-fallback.ts scripts/test-grounded-answer.ts package.json
git commit -m "feat: retry and repair grounded answer generation

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: LLM-written clarifications

**Files:**
- Create: `src/lib/chat/clarification-writer.ts`
- Modify: `src/lib/chat/question-mediator.ts` (add two exports near `clarificationNextStep`, :804-806)
- Modify: `src/app/api/typebot-rag/route.ts:575-599` (clarify branch)
- Create: `scripts/test-clarification-writer.ts`
- Modify: `package.json` (script `"test:clarification-writer"`, append to `ci:domain`)

**Interfaces:**
- Consumes: `generateLlmText`/`isLlmConfigured` from the gateway; `profilePromptBlock`, `SessionProfile`.
- Produces: `generateLlmClarification(input: { question: string; locale: GuardrailLocale; profile?: SessionProfile }): Promise<LlmClarification | null>` where `LlmClarification = { question: string; nextStep: string; backend: string; model: string; durationMs: number }` (null = ship the template); from question-mediator: `clarificationTemplateQuestion(locale): string` and `isTemplateClarification(text: string, locale): boolean`.

- [ ] **Step 1: Write the failing test** — `scripts/test-clarification-writer.ts`:

```ts
import assert from "node:assert/strict";
import { mock } from "bun:test";

type Scripted = { text?: string; throw?: Error; notConfigured?: boolean };
let script: Scripted[] = [];
let calls = 0;
let configured = true;
mock.module("@/lib/ai/llm-gateway", () => ({
  isLlmConfigured: () => configured,
  generateLlmText: async () => {
    calls += 1;
    const step = script.shift();
    if (!step) throw new Error("unscripted gateway call");
    if (step.throw) throw step.throw;
    return { text: step.text || "", backend: "kimi", model: "test-model", durationMs: 7 };
  },
}));

const { generateLlmClarification } = await import("../src/lib/chat/clarification-writer");
const { clarificationTemplateQuestion, isTemplateClarification } = await import("../src/lib/chat/question-mediator");

// template helpers
assert.equal(isTemplateClarification(clarificationTemplateQuestion("ko"), "ko"), true);
assert.equal(isTemplateClarification("D-2 관련해서 어떤 서류가 궁금하세요?", "ko"), false);

// 1. valid output -> LlmClarification
script = [{ text: JSON.stringify({ clarificationQuestion: "현재 비자가 무엇인가요?", nextStep: "예: D-4 연장 시기" }) }];
const ok = await generateLlmClarification({ question: "비자", locale: "ko" });
assert.equal(ok?.question, "현재 비자가 무엇인가요?");
assert.equal(ok?.nextStep, "예: D-4 연장 시기");
assert.equal(ok?.backend, "kimi");

// 2. invalid JSON -> null (template ships)
script = [{ text: "그럼요, 물어보세요!" }];
assert.equal(await generateLlmClarification({ question: "비자", locale: "ko" }), null);

// 3. gateway throws -> null, never propagates
script = [{ throw: new Error("timeout") }];
assert.equal(await generateLlmClarification({ question: "비자", locale: "ko" }), null);

// 4. not configured -> null WITHOUT calling the gateway
configured = false; calls = 0;
assert.equal(await generateLlmClarification({ question: "비자", locale: "ko" }), null);
assert.equal(calls, 0);

console.log("PASS clarification writer: llm copy, template fallback, no unconfigured call");
```

- [ ] **Step 2: Run it — must fail** — `bun run scripts/test-clarification-writer.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement** —
(3a) `question-mediator.ts`, next to `clarificationNextStep` (:804-806):

```ts
export function clarificationTemplateQuestion(locale: GuardrailLocale) {
  return CLARIFICATION_COPY[locale].question;
}

export function isTemplateClarification(text: string, locale: GuardrailLocale): boolean {
  return text.trim() === CLARIFICATION_COPY[locale].question;
}
```

(3b) `src/lib/chat/clarification-writer.ts` (new):

```ts
import { generateLlmText, isLlmConfigured } from "@/lib/ai/llm-gateway";
import type { GuardrailLocale } from "@/lib/chat/response-guardrail";
import { profilePromptBlock, type SessionProfile } from "@/lib/chat/session-profile";

export const CLARIFICATION_WRITER_PROMPT_VERSION = "kaxi-clarification-writer@2026-07-16";

const LOCALE_NAMES: Record<GuardrailLocale, string> = {
  ko: "Korean",
  en: "English",
  vi: "Vietnamese",
  mn: "Mongolian",
};

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    clarificationQuestion: { type: "string" },
    nextStep: { type: "string" },
  },
  required: ["clarificationQuestion", "nextStep"],
} satisfies Record<string, unknown>;

export type LlmClarification = {
  question: string;
  nextStep: string;
  backend: string;
  model: string;
  durationMs: number;
};

export function clarificationWriterTimeoutMs(env: NodeJS.ProcessEnv = process.env) {
  const configured = Number.parseInt(env.RAG_CLARIFICATION_TIMEOUT_MS || "", 10);
  return Number.isFinite(configured) ? Math.min(Math.max(configured, 2_000), 8_000) : 4_000;
}

function parseOutput(value: string): { question: string; nextStep: string } | null {
  try {
    const trimmed = value.trim().startsWith("```")
      ? value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
      : value.trim();
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    const parsed = JSON.parse(start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed) as Record<string, unknown>;
    const question = typeof parsed.clarificationQuestion === "string" ? parsed.clarificationQuestion.trim().slice(0, 500) : "";
    const nextStep = typeof parsed.nextStep === "string" ? parsed.nextStep.trim().slice(0, 300) : "";
    return question ? { question, nextStep } : null;
  } catch {
    return null;
  }
}

// Writes ONE clarifying question when the static template would otherwise
// ship. Returns null on any failure so the caller keeps the template —
// routing is unaffected; this generates copy only.
export async function generateLlmClarification(input: {
  question: string;
  locale: GuardrailLocale;
  profile?: SessionProfile;
}): Promise<LlmClarification | null> {
  if (!isLlmConfigured()) return null;
  try {
    const completion = await generateLlmText({
      feature: "structured",
      messages: [
        {
          role: "system",
          content: `You write ONE short clarifying question for KAXI, a Korea study and immigration assistant. The user's question was too vague to route. Ask, in ${LOCALE_NAMES[input.locale]}, for the single most useful missing detail (current visa or program, target status, or which of eligibility/documents/costs/timing/refusal they mean). Use the stored profile to avoid asking what is already known. Never answer the question itself. Return ONLY JSON: {"clarificationQuestion": string, "nextStep": string} where nextStep is one short example of a well-formed question.

Stored user profile: ${input.profile ? profilePromptBlock(input.profile) : "No stored user profile."}`,
        },
        { role: "user", content: input.question.slice(0, 600) },
      ],
      temperature: 0.3,
      maxTokens: 200,
      timeoutMs: clarificationWriterTimeoutMs(),
      jsonSchema: { name: "kaxi_clarification", schema: OUTPUT_SCHEMA },
    });
    const parsed = parseOutput(completion.text);
    if (!parsed) return null;
    return {
      question: parsed.question,
      nextStep: parsed.nextStep,
      backend: completion.backend,
      model: completion.model,
      durationMs: completion.durationMs,
    };
  } catch (error) {
    console.warn("[clarification writer failed]", error instanceof Error ? error.message : error);
    return null;
  }
}
```

(3c) `typebot-rag/route.ts` clarify branch — replace :575-599 with (imports: add `generateLlmClarification` from `@/lib/chat/clarification-writer` and `isTemplateClarification` to the existing question-mediator import):

```ts
    if (mediation.action === "clarify") {
      provenance = questionMediationProvenance(mediation);
      let clarificationAnswer = mediation.clarificationQuestion;
      let clarificationStep = clarificationNextStep(locale);
      let clarificationSource: "llm" | "template" =
        mediation.status === "llm" && !isTemplateClarification(clarificationAnswer, locale)
          ? "llm"
          : "template";
      let clarificationMeta: Record<string, unknown> = {};
      if (clarificationSource === "template") {
        const written = await generateLlmClarification({ question, locale, profile });
        if (written) {
          clarificationAnswer = written.question;
          if (written.nextStep) clarificationStep = written.nextStep;
          clarificationSource = "llm";
          clarificationMeta = {
            clarificationBackend: written.backend,
            clarificationModel: written.model,
            clarificationLatencyMs: written.durationMs,
          };
        }
      }
      upstreamPayload = {
        answer: clarificationAnswer,
        nextStep: clarificationStep,
        needsHuman: false,
        riskLevel: "low",
        leadStage: "none",
        sources: [],
        searchMeta: {
          type: "question-mediation",
          retrievalMode: "not-run",
          scoreVersion: "not-applicable",
          runtimePath: "kaxi-question-mediator",
          answerMode: "clarification",
          retrievedCount: 0,
          noContext: false,
          noContextReason: null,
          category,
          locale,
          clarificationSource,
          ...clarificationMeta,
        },
        executionId: `mediator-${identity.requestId}`,
        runtimePath: "kaxi-question-mediator",
        ...provenance,
      };
    } else if (ragRuntimePrimary() === "direct") {
```

- [ ] **Step 4: Run tests** — `bun run scripts/test-clarification-writer.ts` → PASS. Regression: `bun run test:rag-fallback` → PASS (its clarify assertions exercise mediation, not the route branch; template copy unchanged).

- [ ] **Step 5: Wire the script** — `package.json`: add `"test:clarification-writer": "bun run scripts/test-clarification-writer.ts"`; append `&& bun run test:clarification-writer` to `ci:domain`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/chat/clarification-writer.ts src/lib/chat/question-mediator.ts src/app/api/typebot-rag/route.ts scripts/test-clarification-writer.ts package.json
git commit -m "feat: LLM-write clarification copy with template fallback

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Agent/consult fallback telemetry

**Files:**
- Create: `src/lib/ops/llm-fallback-events.ts`
- Modify: `src/app/api/ai/agent/route.ts:287-290` (fallback branch)
- Modify: `src/app/api/ai/consult/route.ts:379-392` (official-summary branch)
- Create: `scripts/test-llm-fallback-events.ts`
- Modify: `package.json` (script `"test:llm-fallback-events"`, append to `ci:domain`)

**Interfaces:**
- Consumes: `recordOpsEvent` from `@/lib/ops/events` (signature at `events.ts:101`).
- Produces: `reportLlmFallback(input: { feature: "action" | "consult"; failureReason: string; detail?: string }): Promise<void>` — never throws.

- [ ] **Step 1: Write the failing test** — `scripts/test-llm-fallback-events.ts`:

```ts
import assert from "node:assert/strict";
import { mock } from "bun:test";

let recorded: Array<Record<string, unknown>> = [];
let shouldThrow = false;
mock.module("@/lib/ops/events", () => ({
  recordOpsEvent: async (input: Record<string, unknown>) => {
    if (shouldThrow) throw new Error("supabase down");
    recorded.push(input);
    return { id: "evt", duplicate: false, alert: null };
  },
}));

const { reportLlmFallback } = await import("../src/lib/ops/llm-fallback-events");

await reportLlmFallback({ feature: "action", failureReason: "llm_backend_fallback", detail: "upstream 500" });
assert.equal(recorded[0].eventType, "agent.llm_fallback");
assert.equal(recorded[0].source, "ai-agent");
assert.equal(recorded[0].severity, "warning");
assert.deepEqual(
  (recorded[0].payload as Record<string, unknown>).failureReason,
  "llm_backend_fallback",
);

await reportLlmFallback({ feature: "consult", failureReason: "llm_not_configured_fallback" });
assert.equal(recorded[1].eventType, "consult.llm_fallback");
assert.equal(recorded[1].source, "ai-consult");

// telemetry failure never propagates
shouldThrow = true;
await reportLlmFallback({ feature: "action", failureReason: "llm_backend_fallback" });

console.log("PASS llm fallback telemetry: event mapping, best-effort on failure");
```

- [ ] **Step 2: Run it — must fail** — `bun run scripts/test-llm-fallback-events.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement** —
(3a) `src/lib/ops/llm-fallback-events.ts` (new):

```ts
import { recordOpsEvent } from "@/lib/ops/events";

export type LlmFallbackFeature = "action" | "consult";

// Best-effort telemetry for the moment a user turn is served by the non-LLM
// fallback. Must never throw or delay the turn — callers may fire-and-forget.
export async function reportLlmFallback(input: {
  feature: LlmFallbackFeature;
  failureReason: string;
  detail?: string;
}): Promise<void> {
  try {
    await recordOpsEvent({
      source: input.feature === "action" ? "ai-agent" : "ai-consult",
      severity: "warning",
      eventType: input.feature === "action" ? "agent.llm_fallback" : "consult.llm_fallback",
      message: `${input.feature} LLM failed; served the non-LLM fallback (${input.failureReason})`,
      payload: {
        feature: input.feature,
        failureReason: input.failureReason,
        detail: (input.detail || "").slice(0, 300),
      },
    });
  } catch (error) {
    console.warn("[llm-fallback telemetry failed]", error instanceof Error ? error.message : error);
  }
}
```

(3b) `agent/route.ts` — in the fallback branch (after `errorMessage = ...`, before `result = await runFallbackAgent(...)`, :287-290), add (import `reportLlmFallback` from `@/lib/ops/llm-fallback-events`):

```ts
      void reportLlmFallback({ feature: "action", failureReason: errorType, detail: errorMessage });
```

(3c) `consult/route.ts` — immediately before `return buildOfficialSummaryExpertResult({` (:382), add (same import):

```ts
    void reportLlmFallback({
      feature: "consult",
      failureReason: configurationFallback ? "llm_not_configured_fallback" : "llm_backend_fallback",
      detail: message,
    });
```

- [ ] **Step 4: Run tests** — `bun run scripts/test-llm-fallback-events.ts` → PASS. Regression: `bun run test:agent && bun run test:unified-ai` → PASS (`recordOpsEvent` short-circuits in the isolated test runtime, so agent-suite fallback paths do not hit Supabase).

- [ ] **Step 5: Wire the script** — `package.json`: add `"test:llm-fallback-events": "bun run scripts/test-llm-fallback-events.ts"`; append `&& bun run test:llm-fallback-events` to `ci:domain`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ops/llm-fallback-events.ts src/app/api/ai/agent/route.ts src/app/api/ai/consult/route.ts scripts/test-llm-fallback-events.ts package.json
git commit -m "feat: record ops events when agent/consult serve non-LLM fallbacks

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Full gates + verification report

- [ ] **Step 1: Gates** — `bun run ci:types && bun run lint && bun run ci:domain && bun run ci:ops`
Expected: all exit 0. (`ci:domain`/`ci:ops` need the loopback test DB; run with the repo's standard hermetic setup — never against the ambient DATABASE_URL.)

- [ ] **Step 2: Report** — write `.superpowers/sdd/llm-expansion-report.md` (NOT committed): per-task disposition, TDD evidence (RED/GREEN command output), gate tails, and any judgment calls.

## Self-review notes

- Spec coverage: A → Task 1 (tolerant parse, single retry, `answerAttempts`/`answerRetryReason` in both search_meta branches); B → Task 2 (routing untouched, copy-only LLM, `clarificationSource` + backend/model/latency keys, template byte-identical on failure); C → Task 3 (both event types, best-effort, retro-diagnosis already closed in the spec); testing section → each task's script + Task 4 gates including ci:domain.
- Type consistency: `attempts`/`retryReason` defined in Task 1 types and read by Task 1's direct-lexical edit only; `LlmClarification`/`generateLlmClarification` defined and consumed within Task 2; `reportLlmFallback` defined in Task 3 and used only there.
- The three new test scripts are DB-free by construction (gateway/ops-events mocked); `not_configured` no-retry is pinned by an explicit call-count assertion.
