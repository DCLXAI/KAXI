import assert from "node:assert/strict";
import {
  classifyLlmFailure,
  generateLlmJson,
  generateLlmText,
  getConfiguredLlmBackend,
  getLlmGatewayDiagnostics,
  isLlmNotConfiguredError,
} from "../src/lib/ai/llm-gateway";

function restoreEnv(snapshot: NodeJS.ProcessEnv) {
  for (const key of Object.keys(process.env)) {
    if (!(key in snapshot)) delete process.env[key];
  }
  Object.assign(process.env, snapshot);
}

const envSnapshot = { ...process.env };
const originalFetch = globalThis.fetch;

try {
  Object.assign(process.env, {
    AI_PROVIDER: "openai",
    OPENAI_API_KEY: "test-openai-secret",
    OPENAI_BASE_URL: "https://api.openai.com/v1",
    OPENAI_MODEL: "gpt-4.1-mini-test",
    ANTHROPIC_API_KEY: "",
    ANTHROPIC_BASE_URL: "https://api.anthropic.com",
    ANTHROPIC_MODEL: "claude-opus-4-8",
    AI_LLM_TIMEOUT_MS: "1000",
  });
  delete process.env.KIMI_API_KEY;
  delete process.env.MOONSHOT_API_KEY;

  let capturedUrl = "";
  let capturedAuthorization = "";
  let capturedBody: Record<string, unknown> = {};
  const mockFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = String(input);
    capturedAuthorization = new Headers(init?.headers).get("authorization") || "";
    capturedBody = JSON.parse(String(init?.body || "{}")) as Record<string, unknown>;
    return Response.json({
      model: "gpt-4.1-mini-test",
      choices: [{ message: { content: JSON.stringify({ ok: true, label: "grounded" }) } }],
    });
  };
  globalThis.fetch = Object.assign(mockFetch, { preconnect: originalFetch.preconnect });

  const output = await generateLlmJson<{ ok: boolean; label: string }>({
    feature: "structured",
    maxTokens: 200,
    jsonSchema: {
      name: "gateway_contract",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["ok", "label"],
        properties: { ok: { type: "boolean" }, label: { type: "string" } },
      },
    },
    messages: [
      { role: "system", content: "Return JSON only." },
      {
        role: "user",
        content: [
          { type: "text", text: "Check user@example.com" },
          { type: "image", source: { type: "base64", media_type: "image/png", data: "aGVsbG8=" } },
        ],
      },
    ],
  });

  assert.deepEqual(output, { ok: true, label: "grounded" });
  assert.equal(capturedUrl, "https://api.openai.com/v1/chat/completions");
  assert.equal(capturedAuthorization, "Bearer test-openai-secret");
  assert.equal(capturedBody.model, "gpt-4.1-mini-test");
  const serialized = JSON.stringify(capturedBody);
  assert.doesNotMatch(serialized, /user@example\.com/);
  assert.match(serialized, /\[redacted-email\]/);
  assert.match(serialized, /data:image\/png;base64,aGVsbG8=/);
  assert.match(serialized, /"type":"json_schema"/);

  const diagnostics = getLlmGatewayDiagnostics();
  assert.equal(getConfiguredLlmBackend(), "openai");
  assert.equal(diagnostics.backend, "openai");
  assert.equal(diagnostics.openai.genuineProvider, true);
  assert.equal(diagnostics.apiKeyConfigured, true);
  assert.doesNotMatch(JSON.stringify(diagnostics), /test-openai-secret/);

  process.env.AI_PROVIDER = "anthropic";
  const fallbackOutput = await generateLlmText({
    feature: "structured",
    jsonSchema: { name: "fallback_contract", schema: { type: "object" } },
    messages: [{ role: "user", content: "Use the configured managed provider." }],
  });
  assert.equal(fallbackOutput.backend, "openai");
  assert.equal(fallbackOutput.primaryBackend, "anthropic");
  assert.equal(fallbackOutput.attempts, 2);
  assert.equal(fallbackOutput.fallbackReason, "anthropic:not_configured");

  process.env.AI_PROVIDER = "openai";
  await assert.rejects(
    () => generateLlmText({
      feature: "structured",
      messages: [{
        role: "user",
        content: [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: "JVBERi0xLjQ=" } }],
      }],
    }),
    /document extraction pipeline/,
  );

  assert.equal(classifyLlmFailure(Object.assign(new Error("usage limit reached for billing cycle"), { status: 403 })), "quota_exhausted");
  assert.equal(classifyLlmFailure(Object.assign(new Error("too many requests"), { status: 429 })), "rate_limited");

  Object.assign(process.env, {
    AI_PROVIDER: "kimi",
    OPENAI_BASE_URL: "https://api.moonshot.ai/v1",
    OPENAI_MODEL: "kimi-k2.6",
  });
  assert.equal(getConfiguredLlmBackend(), "anthropic");
  assert.equal(getLlmGatewayDiagnostics().openai.genuineProvider, false);
  await assert.rejects(
    () => generateLlmText({ feature: "agent", messages: [{ role: "user", content: "test" }] }),
    (error: unknown) => isLlmNotConfiguredError(error),
  );
} finally {
  globalThis.fetch = originalFetch;
  restoreEnv(envSnapshot);
}

console.log("PASS LLM gateway: genuine OpenAI, provider failover, quota classification, compatibility endpoint rejection");
