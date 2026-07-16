import assert from "node:assert/strict";
import { mock } from "bun:test";

type Scripted = { text?: string; throw?: Error; notConfigured?: boolean };
let script: Scripted[] = [];
let calls = 0;
let configured = true;
mock.module("@/lib/ai/llm-gateway", () => ({
  isLlmConfigured: () => configured,
  isLlmNotConfiguredError: () => false,
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
