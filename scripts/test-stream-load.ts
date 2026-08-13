import assert from "node:assert/strict";
import {
  createUnifiedAiEventStream,
  parseUnifiedAiStreamEvent,
  type UnifiedAiStreamEvent,
} from "../src/lib/ai/unified-stream";

const concurrency = 200;
const firstByteDurations: number[] = [];
await Promise.all(Array.from({ length: concurrency }, async (_, index) => {
  const startedAt = performance.now();
  const stream = createUnifiedAiEventStream({
    capability: index % 2 === 0 ? "action" : "expert",
    mode: index % 3 === 0 ? "verified-delta" : "progress-only",
    timeoutMs: 2_000,
    run: async (progress, verifiedDelta) => {
      progress("searching");
      if (index % 3 === 0) verifiedDelta(`verified-${index}`);
      progress("generating");
      progress("finalizing");
      return { ok: true, status: 200, data: { answer: `answer-${index}` } };
    },
  });
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const events: UnifiedAiStreamEvent[] = [];
  let first = true;
  while (true) {
    const item = await reader.read();
    if (item.done) break;
    if (first) {
      firstByteDurations.push(performance.now() - startedAt);
      first = false;
    }
    const event = parseUnifiedAiStreamEvent(decoder.decode(item.value));
    if (event) events.push(event);
  }
  assert.equal(events.filter((event) => event.type === "complete").length, 1);
  assert.equal(events.filter((event) => event.type === "error").length, 0);
  if (index % 3 !== 0) assert.equal(events.filter((event) => event.type === "delta").length, 0);
}));

firstByteDurations.sort((left, right) => left - right);
const p95 = firstByteDurations[Math.ceil(firstByteDurations.length * 0.95) - 1];
assert(p95 < 250, `stream first-byte p95 ${p95.toFixed(1)}ms exceeded 250ms local budget`);
console.log(`PASS stream load: ${concurrency} concurrent streams, first-byte p95=${p95.toFixed(1)}ms, one terminal event each`);
