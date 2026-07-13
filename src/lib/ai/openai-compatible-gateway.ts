import { redactSensitiveText } from "@/lib/privacy/pii";
import type { LlmGatewayContent, LlmGatewayMessage, LlmGatewayOptions, LlmGatewayResult } from "@/lib/ai/llm-types";

export const DEFAULT_KIMI_BASE_URL = "https://api.moonshot.ai/v1";
export const DEFAULT_KIMI_MODEL = "kimi-k2.6";

export class OpenAICompatibleNotConfiguredError extends Error {
  constructor(message = "Kimi API key is not configured") {
    super(message);
    this.name = "OpenAICompatibleNotConfiguredError";
  }
}

function configured(value: string | undefined): string {
  return value?.trim() || "";
}

export function getOpenAICompatibleApiKey(env: NodeJS.ProcessEnv = process.env): string {
  return configured(env.KIMI_API_KEY) || configured(env.MOONSHOT_API_KEY) || configured(env.OPENAI_API_KEY);
}

export function getOpenAICompatibleBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  return (configured(env.KIMI_BASE_URL) || configured(env.OPENAI_BASE_URL) || DEFAULT_KIMI_BASE_URL).replace(/\/+$/, "");
}

export function getOpenAICompatibleModel(env: NodeJS.ProcessEnv = process.env): string {
  return configured(env.KIMI_MODEL) || configured(env.OPENAI_MODEL) || DEFAULT_KIMI_MODEL;
}

export function isOpenAICompatibleConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(getOpenAICompatibleApiKey(env));
}

export function getOpenAICompatibleGatewayDiagnostics(env: NodeJS.ProcessEnv = process.env) {
  return {
    apiKeyConfigured: isOpenAICompatibleConfigured(env),
    model: getOpenAICompatibleModel(env),
    baseUrl: getOpenAICompatibleBaseUrl(env),
    protocol: "openai-chat-completions" as const,
    provider: "kimi" as const,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function timeoutMs(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number.parseInt(env.AI_LLM_TIMEOUT_MS || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 55_000;
}

function extensionFor(mediaType: string): string {
  if (mediaType === "application/pdf") return "pdf";
  if (mediaType === "image/png") return "png";
  if (mediaType === "image/webp") return "webp";
  return "jpg";
}

async function providerFetch(url: string, init: RequestInit, env: NodeJS.ProcessEnv = process.env): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs(env));
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function responseError(response: Response): Promise<Error> {
  let detail = "";
  try {
    const payload = asRecord(await response.json());
    const error = asRecord(payload?.error);
    detail = typeof error?.message === "string" ? error.message : JSON.stringify(payload || {});
  } catch {
    detail = await response.text().catch(() => "");
  }
  const safeDetail = redactSensitiveText(detail).replace(/\s+/g, " ").trim().slice(0, 500);
  return new Error(`Kimi API request failed (${response.status})${safeDetail ? `: ${safeDetail}` : ""}`);
}

async function extractDocumentText(input: {
  data: string;
  mediaType: string;
  apiKey: string;
  baseUrl: string;
}): Promise<string> {
  const form = new FormData();
  form.append("purpose", "file-extract");
  form.append(
    "file",
    new Blob([new Uint8Array(Buffer.from(input.data, "base64"))], { type: input.mediaType }),
    `document.${extensionFor(input.mediaType)}`
  );

  const upload = await providerFetch(`${input.baseUrl}/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${input.apiKey}` },
    body: form,
  });
  if (!upload.ok) throw await responseError(upload);
  const uploaded = asRecord(await upload.json());
  const fileId = typeof uploaded?.id === "string" ? uploaded.id : "";
  if (!fileId) throw new Error("Kimi file upload did not return a file id");

  try {
    const content = await providerFetch(`${input.baseUrl}/files/${encodeURIComponent(fileId)}/content`, {
      method: "GET",
      headers: { Authorization: `Bearer ${input.apiKey}` },
    });
    if (!content.ok) throw await responseError(content);
    return (await content.text()).trim();
  } finally {
    await providerFetch(`${input.baseUrl}/files/${encodeURIComponent(fileId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${input.apiKey}` },
    }).catch(() => undefined);
  }
}

async function normalizeContent(
  content: LlmGatewayContent,
  credentials: { apiKey: string; baseUrl: string }
): Promise<LlmGatewayContent> {
  if (typeof content === "string") return redactSensitiveText(content);

  const normalized: Array<Record<string, unknown>> = [];
  for (const rawPart of content) {
    const part = asRecord(rawPart);
    if (!part) continue;

    if (part.type === "text") {
      normalized.push({ ...part, text: redactSensitiveText(String(part.text || "")) });
      continue;
    }

    const source = asRecord(part.source);
    if ((part.type === "image" || part.type === "document") && source?.type === "base64") {
      const mediaType = typeof source.media_type === "string" ? source.media_type : "application/octet-stream";
      const data = typeof source.data === "string" ? source.data : "";
      if (!data) continue;

      if (part.type === "document" || mediaType === "application/pdf") {
        const extracted = await extractDocumentText({ ...credentials, data, mediaType });
        normalized.push({ type: "text", text: `[Extracted document content]\n${extracted}` });
      } else {
        normalized.push({
          type: "image_url",
          image_url: { url: `data:${mediaType};base64,${data}` },
        });
      }
      continue;
    }

    normalized.push(part);
  }
  return normalized;
}

async function normalizeMessages(
  messages: LlmGatewayMessage[],
  credentials: { apiKey: string; baseUrl: string }
): Promise<LlmGatewayMessage[]> {
  return Promise.all(
    messages.map(async (message) => ({
      role: message.role,
      content: await normalizeContent(message.content, credentials),
    }))
  );
}

function completionText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!Array.isArray(value)) return "";
  return value
    .map((part) => {
      const block = asRecord(part);
      if (!block) return "";
      if (typeof block.text === "string") return block.text;
      if (typeof block.content === "string") return block.content;
      return "";
    })
    .join("")
    .trim();
}

function textFromResponse(value: unknown): { text: string; model: string } {
  const payload = asRecord(value);
  const choices = Array.isArray(payload?.choices) ? payload.choices : [];
  const first = asRecord(choices[0]);
  const message = asRecord(first?.message);
  const text = completionText(message?.content);
  const model = typeof payload?.model === "string" ? payload.model : getOpenAICompatibleModel();
  const finishReason = typeof first?.finish_reason === "string" ? first.finish_reason : "unknown";
  const reasoningLength = typeof message?.reasoning_content === "string"
    ? message.reasoning_content.length
    : 0;
  if (finishReason === "length") {
    throw new Error(
      `Kimi API exhausted the output budget before completing the final answer${reasoningLength > 0 ? " after reasoning" : ""}`,
    );
  }
  if (!text) {
    throw new Error(`Kimi API returned an empty completion (finish_reason=${finishReason})`);
  }
  return { text, model };
}

export async function generateOpenAICompatibleText(options: LlmGatewayOptions): Promise<LlmGatewayResult> {
  const startedAt = Date.now();
  const apiKey = getOpenAICompatibleApiKey();
  if (!apiKey) throw new OpenAICompatibleNotConfiguredError();

  const baseUrl = getOpenAICompatibleBaseUrl();
  const model = getOpenAICompatibleModel();
  const messages = await normalizeMessages(options.messages, { apiKey, baseUrl });
  const body: Record<string, unknown> = {
    model,
    messages,
    max_completion_tokens: options.maxTokens ?? 1600,
  };

  const configuredThinking = configured(process.env.KIMI_THINKING).toLowerCase();
  const thinking = configuredThinking === "enabled" || configuredThinking === "disabled"
    ? configuredThinking
    : options.feature === "structured"
      ? "disabled"
      : "";
  if (thinking && !model.startsWith("kimi-k2.7-code")) {
    body.thinking = { type: thinking };
  }
  if (options.jsonSchema) {
    body.response_format = {
      type: "json_schema",
      json_schema: {
        name: options.jsonSchema.name,
        strict: true,
        schema: options.jsonSchema.schema,
      },
    };
  }

  const response = await providerFetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw await responseError(response);

  const completion = textFromResponse(await response.json());
  return {
    text: completion.text,
    model: completion.model,
    backend: "kimi",
    durationMs: Date.now() - startedAt,
    inputChars: JSON.stringify(messages).length,
    outputChars: completion.text.length,
  };
}

export function isOpenAICompatibleNotConfiguredError(
  error: unknown
): error is OpenAICompatibleNotConfiguredError {
  return error instanceof OpenAICompatibleNotConfiguredError;
}
