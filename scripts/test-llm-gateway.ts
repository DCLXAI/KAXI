import {
  generateLlmJson,
  generateLlmText,
  getConfiguredLlmBackend,
  getLlmGatewayDiagnostics,
  isLlmNotConfiguredError,
} from "../src/lib/ai/llm-gateway";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

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
    AI_PROVIDER: "kimi",
    OPENAI_API_KEY: "test-kimi-secret",
    OPENAI_BASE_URL: "https://kimi.test/v1",
    OPENAI_MODEL: "kimi-k2.6-test",
    AI_LLM_TIMEOUT_MS: "1000",
  });
  delete process.env.KIMI_API_KEY;
  delete process.env.MOONSHOT_API_KEY;
  delete process.env.KIMI_THINKING;

  let capturedUrl = "";
  let capturedAuthorization = "";
  let capturedBody: Record<string, unknown> = {};
  const mockFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = String(input);
    const headers = new Headers(init?.headers);
    capturedAuthorization = headers.get("authorization") || "";
    capturedBody = JSON.parse(String(init?.body || "{}")) as Record<string, unknown>;
    return Response.json({
      model: "kimi-k2.6-test",
      choices: [
        {
          message: {
            role: "assistant",
            content: JSON.stringify({ ok: true, label: "grounded" }),
          },
        },
      ],
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
        properties: {
          ok: { type: "boolean" },
          label: { type: "string" },
        },
      },
    },
    messages: [
      { role: "system", content: "Return JSON only." },
      {
        role: "user",
        content: [
          { type: "text", text: "Check user@example.com" },
          {
            type: "image",
            source: { type: "base64", media_type: "image/png", data: "aGVsbG8=" },
          },
        ],
      },
    ],
  });

  if (!output.ok || output.label !== "grounded") fail(`unexpected structured output: ${JSON.stringify(output)}`);
  if (capturedUrl !== "https://kimi.test/v1/chat/completions") fail(`unexpected endpoint: ${capturedUrl}`);
  if (capturedAuthorization !== "Bearer test-kimi-secret") fail("Kimi key was not sent as Bearer auth");
  if (capturedBody.model !== "kimi-k2.6-test") fail("configured Kimi model was not used");

  const serialized = JSON.stringify(capturedBody);
  if (serialized.includes("user@example.com")) fail("PII was not redacted before the Kimi request");
  if (!serialized.includes("[redacted-email]")) fail("redacted PII marker missing from Kimi request");
  if (!serialized.includes("data:image/png;base64,aGVsbG8=")) fail("Anthropic image block was not converted to OpenAI format");
  if (!serialized.includes('"thinking":{"type":"disabled"}')) {
    fail("structured Kimi requests must disable thinking unless explicitly configured");
  }
  if (!serialized.includes('"type":"json_schema"')) fail("structured output schema was not forwarded");

  const diagnostics = getLlmGatewayDiagnostics();
  if (
    getConfiguredLlmBackend() !== "kimi" ||
    diagnostics.backend !== "kimi" ||
    !diagnostics.apiKeyConfigured ||
    diagnostics.model !== "kimi-k2.6-test"
  ) {
    fail(`Kimi diagnostics mismatch: ${JSON.stringify(diagnostics)}`);
  }
  if (JSON.stringify(diagnostics).includes("test-kimi-secret")) fail("diagnostics leaked the Kimi API key");

  const pdfCalls: string[] = [];
  let pdfCompletionBody: Record<string, unknown> = {};
  const pdfFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    pdfCalls.push(`${init?.method || "GET"} ${url}`);
    if (url.endsWith("/files") && init?.method === "POST") return Response.json({ id: "file-test-1" });
    if (url.endsWith("/files/file-test-1/content")) return new Response("Passport Number P1234567", { status: 200 });
    if (url.endsWith("/files/file-test-1") && init?.method === "DELETE") return new Response(null, { status: 204 });
    if (url.endsWith("/chat/completions")) {
      pdfCompletionBody = JSON.parse(String(init?.body || "{}")) as Record<string, unknown>;
      return Response.json({
        model: "kimi-k2.6-test",
        choices: [{ message: { content: JSON.stringify({ ok: true, label: "pdf" }) } }],
      });
    }
    return new Response("not found", { status: 404 });
  };
  globalThis.fetch = Object.assign(pdfFetch, { preconnect: originalFetch.preconnect });

  const pdfOutput = await generateLlmJson<{ ok: boolean; label: string }>({
    feature: "structured",
    jsonSchema: { name: "pdf_contract", schema: { type: "object" } },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Extract the visible fields." },
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: "JVBERi0xLjQ=" },
          },
        ],
      },
    ],
  });
  if (!pdfOutput.ok || pdfOutput.label !== "pdf") fail("PDF extraction result mismatch");
  for (const expected of [
    "POST https://kimi.test/v1/files",
    "GET https://kimi.test/v1/files/file-test-1/content",
    "DELETE https://kimi.test/v1/files/file-test-1",
    "POST https://kimi.test/v1/chat/completions",
  ]) {
    if (!pdfCalls.includes(expected)) fail(`PDF provider flow missing: ${expected}`);
  }
  if (!JSON.stringify(pdfCompletionBody).includes("Passport Number P1234567")) {
    fail("extracted PDF text was not forwarded to the structured completion");
  }

  const truncatedFetch = async () => Response.json({
    model: "kimi-k2.6-test",
    choices: [{
      finish_reason: "length",
      message: { content: "This answer was cut off in the middle of a sent" },
    }],
  });
  globalThis.fetch = Object.assign(truncatedFetch, { preconnect: originalFetch.preconnect });
  let truncatedCompletionRejected = false;
  try {
    await generateLlmText({
      feature: "agent",
      maxTokens: 1200,
      messages: [{ role: "user", content: "Return a complete answer." }],
    });
  } catch (error) {
    truncatedCompletionRejected = error instanceof Error && error.message.includes("output budget");
  }
  if (!truncatedCompletionRejected) fail("Kimi length-truncated text must not be accepted as a complete answer");

  process.env.OPENAI_API_KEY = "";
  let missingKeyDetected = false;
  try {
    await generateLlmJson({
      feature: "structured",
      jsonSchema: { name: "missing_key", schema: { type: "object" } },
      messages: [{ role: "user", content: "test" }],
    });
  } catch (error) {
    missingKeyDetected = isLlmNotConfiguredError(error);
  }
  if (!missingKeyDetected) fail("missing Kimi key should produce LlmNotConfiguredError");
} finally {
  globalThis.fetch = originalFetch;
  restoreEnv(envSnapshot);
}

console.log("PASS managed LLM gateway (Kimi OpenAI-compatible)");
