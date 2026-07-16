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
