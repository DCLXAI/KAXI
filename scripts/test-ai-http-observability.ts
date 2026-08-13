import assert from "node:assert/strict";
import {
  attachAiResponseIdentity,
  createAiHttpRequestIdentity,
  observeAiHttpRequest,
} from "../src/adapters/http/ai/trace-observer";
import {
  registerTraceExporter,
  type SpanRecord,
} from "../src/infrastructure/observability/tracing";

const inboundTraceId = "a".repeat(32);
const inboundParentSpanId = "b".repeat(16);
const headers = new Headers({
  "x-request-id": "request-observability-1",
  traceparent: `00-${inboundTraceId}-${inboundParentSpanId}-01`,
});
const identity = createAiHttpRequestIdentity(headers);
assert.equal(identity.requestId, "request-observability-1");
assert.equal(identity.traceId, inboundTraceId);

const rejectedIdentity = createAiHttpRequestIdentity(new Headers({
  "x-request-id": "bad request id with spaces",
}));
assert.notEqual(rejectedIdentity.requestId, "bad request id with spaces");
assert.match(rejectedIdentity.requestId, /^[0-9a-f-]{36}$/i);

const spans: SpanRecord[] = [];
registerTraceExporter((span) => {
  spans.push(span);
});
const result = await observeAiHttpRequest({
  identity,
  operation: "observability-contract-test",
  run: async (observeStage) => {
    await observeStage("rate_limit", async () => true);
    await observeStage("validation", async () => true);
    await observeStage("auth", async () => true);
    await observeStage("provider_attempt", async () => true);
    return "ok";
  },
});
assert.equal(result, "ok");
const root = spans.find((span) => span.name === "ai.request");
assert(root, "ai.request root span must be exported");
for (const name of ["ai.rate_limit", "ai.validation", "ai.auth", "ai.provider_attempt"]) {
  const span = spans.find((candidate) => candidate.name === name);
  assert(span, `${name} span must be exported`);
  assert.equal(span.traceId, inboundTraceId);
  assert.equal(span.parentSpanId, root.spanId);
  assert.equal(span.attributes.requestId, identity.requestId);
}

const correlated = await attachAiResponseIdentity(
  Response.json({ error: "Invalid JSON body" }, { status: 400 }),
  identity,
);
assert.equal(correlated.headers.get("x-request-id"), identity.requestId);
assert.equal(correlated.headers.get("traceparent"), identity.traceparent);
assert.deepEqual(await correlated.json(), {
  error: "Invalid JSON body",
  requestId: identity.requestId,
  traceId: identity.traceId,
});

const previousRateLimitBackend = process.env.RATE_LIMIT_BACKEND;
try {
  process.env.RATE_LIMIT_BACKEND = "memory";
  const { POST: typebotRagPost } = await import("../src/app/api/typebot-rag/route");
  const typebotResponse = await typebotRagPost(new (await import("next/server")).NextRequest(
    "http://localhost/api/typebot-rag",
    {
      method: "POST",
      headers: { "content-type": "application/json", traceparent: identity.traceparent },
      body: JSON.stringify({
        question: "visa question",
        sessionId: "invalid-typebot-session",
        source: "typebot",
        typebotResultId: "result-1",
        requestId: "123e4567-e89b-42d3-a456-426614174000",
      }),
    },
  ));
  assert(typebotResponse, "Typebot RAG admission must return an HTTP response");
  assert.equal(typebotResponse.status, 400);
  const typebotPayload = await typebotResponse.json() as Record<string, unknown>;
  assert.equal(typebotResponse.headers.get("x-request-id"), typebotPayload.requestId);
  assert.equal(typebotPayload.traceId, inboundTraceId);
  for (const name of ["rag.rate_limit", "rag.auth"]) {
    const span = spans.find((candidate) => candidate.name === name);
    assert(span, `${name} span must be exported`);
    assert.equal(span.traceId, inboundTraceId);
    assert.equal(span.attributes.requestId, typebotPayload.requestId);
  }
} finally {
  if (previousRateLimitBackend === undefined) delete process.env.RATE_LIMIT_BACKEND;
  else process.env.RATE_LIMIT_BACKEND = previousRateLimitBackend;
}

registerTraceExporter(() => {
  throw new Error("telemetry backend unavailable");
});
const survivedExporterFailure = await observeAiHttpRequest({
  identity,
  operation: "exporter-failure-test",
  run: async (observeStage) => observeStage("auth", async () => "survived"),
});
assert.equal(survivedExporterFailure, "survived");
registerTraceExporter(null);

console.log("PASS AI HTTP observability: validated request identity, admission spans, correlation response and fail-open exporter");
