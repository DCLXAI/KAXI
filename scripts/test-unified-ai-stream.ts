import assert from "node:assert/strict";
import {
  AgentSessionResponseCache,
  agentResponseCacheKey,
  isCacheableAgentQuestion,
} from "../src/lib/ai/agent-response-cache";
import {
  chunkUnifiedAiAnswer,
  createUnifiedAiEventStream,
  encodeUnifiedAiStreamEvent,
  parseUnifiedAiStreamEvent,
  readUnifiedAiEventStream,
  unifiedAiStreamTimeoutMs,
  UnifiedAiStreamError,
  type UnifiedAiStreamEvent,
} from "../src/lib/ai/unified-stream";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function testTimeoutConfiguration() {
  assert.equal(unifiedAiStreamTimeoutMs({}), 20_000);
  assert.equal(unifiedAiStreamTimeoutMs({ UNIFIED_AI_STREAM_TIMEOUT_MS: "1000" }), 8_000);
  assert.equal(unifiedAiStreamTimeoutMs({ UNIFIED_AI_STREAM_TIMEOUT_MS: "45000" }), 30_000);
  assert.equal(unifiedAiStreamTimeoutMs({ UNIFIED_AI_STREAM_TIMEOUT_MS: "12000" }), 12_000);
}

function testChunkIntegrity() {
  const answer = "D-4 신청에는 입학허가서와 재정 증빙이 필요합니다.\n공식 기준을 함께 확인하세요.";
  const chunks = chunkUnifiedAiAnswer(answer, 24);
  assert.ok(chunks.length > 1);
  assert.equal(chunks.join(""), answer);
}

function testEventRoundTrip() {
  const event: UnifiedAiStreamEvent = {
    type: "progress",
    stage: "searching",
    capability: "expert",
    timestamp: 100,
  };
  const encoded = new TextDecoder().decode(encodeUnifiedAiStreamEvent(event));
  assert.deepEqual(parseUnifiedAiStreamEvent(encoded), event);
  assert.throws(() => parseUnifiedAiStreamEvent("{bad json"), UnifiedAiStreamError);
}

async function testImmediateFirstEvent() {
  const stream = createUnifiedAiEventStream({
    capability: "expert",
    timeoutMs: 1_000,
    progressDelayMs: 20,
    chunkDelayMs: 0,
    run: async () => {
      await sleep(100);
      return { ok: true, status: 200, data: { answer: "완료" } };
    },
  });
  const reader = stream.getReader();
  const startedAt = performance.now();
  const first = await reader.read();
  const firstByteMs = performance.now() - startedAt;
  assert.equal(first.done, false);
  assert.ok(firstByteMs < 50, `first progress event took ${firstByteMs.toFixed(1)}ms`);
  assert.equal(parseUnifiedAiStreamEvent(new TextDecoder().decode(first.value))?.type, "progress");
  await reader.cancel();
}

async function testCompleteStream() {
  const answer = "공식 출처를 확인한 답변입니다. 필요한 서류를 순서대로 준비하세요.";
  const stream = createUnifiedAiEventStream({
    capability: "expert",
    timeoutMs: 1_000,
    progressDelayMs: 5,
    chunkDelayMs: 0,
    run: async () => {
      await sleep(15);
      return { ok: true, status: 200, data: { answer, grounded: true } };
    },
  });
  const events: UnifiedAiStreamEvent[] = [];
  const result = await readUnifiedAiEventStream(new Response(stream), (event) => events.push(event));
  assert.equal(result.answer, answer);
  assert.equal(events.filter((event) => event.type === "delta").map((event) => event.type === "delta" ? event.delta : "").join(""), answer);
  assert.ok(events.some((event) => event.type === "progress" && event.stage === "searching"));
  assert.ok(events.some((event) => event.type === "progress" && event.stage === "generating"));
  assert.equal(events.at(-1)?.type, "complete");
}

async function testRecoverableTimeout() {
  const stream = createUnifiedAiEventStream({
    capability: "action",
    timeoutMs: 25,
    progressDelayMs: 5,
    chunkDelayMs: 0,
    run: () => new Promise(() => undefined),
  });
  await assert.rejects(
    () => readUnifiedAiEventStream(new Response(stream), () => undefined),
    (error: unknown) => error instanceof UnifiedAiStreamError
      && error.code === "stream_timeout"
      && error.status === 504
      && error.retryable,
  );
}

function testSessionCachePolicy() {
  assert.equal(isCacheableAgentQuestion("D-4 신청 서류가 뭐예요?"), true);
  assert.equal(isCacheableAgentQuestion("제 이메일 test@example.com으로 알려줘"), false);
  assert.equal(isCacheableAgentQuestion("불법 취업 방법을 알려줘"), false);
  assert.equal(isCacheableAgentQuestion("그럼 이 경우는?"), false);
  assert.equal(agentResponseCacheKey("  D-4   서류 ", "ko"), agentResponseCacheKey("d-4 서류", "ko"));

  const cache = new AgentSessionResponseCache<string>(100, 2);
  cache.set("a", "A", 1_000);
  cache.set("b", "B", 1_010);
  assert.equal(cache.get("a", 1_020), "A");
  cache.set("c", "C", 1_030);
  assert.equal(cache.get("b", 1_040), undefined);
  assert.equal(cache.get("a", 1_040), "A");
  assert.equal(cache.get("c", 1_040), "C");
  assert.equal(cache.get("a", 1_101), undefined);
  assert.equal(cache.size, 1);
  cache.clear();
  assert.equal(cache.size, 0);
}

testTimeoutConfiguration();
testChunkIntegrity();
testEventRoundTrip();
await testImmediateFirstEvent();
await testCompleteStream();
await testRecoverableTimeout();
testSessionCachePolicy();

console.log("PASS unified AI streaming, progress, timeout recovery, and session cache");
