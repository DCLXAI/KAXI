import { runtimeEnvironment } from "@/infrastructure/config/runtime-environment";
import { redactSensitiveText } from "@/lib/privacy/pii";
import type { LlmGatewayContent, LlmGatewayMessage, LlmGatewayOptions, LlmGatewayResult } from "@/lib/ai/llm-types";

export const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
export const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";

export class OpenAICompatibleNotConfiguredError extends Error {
  constructor(message = "A genuine OpenAI API key is not configured") {
    super(message);
    this.name = "OpenAICompatibleNotConfiguredError";
  }
}

export class OpenAIProviderError extends Error {
  readonly status: number;
  readonly providerCode: string | null;

  constructor(status: number, detail: string, providerCode: string | null = null) {
    super(`OpenAI API request failed (${status})${detail ? `: ${detail}` : ""}`);
    this.name = "OpenAIProviderError";
    this.status = status;
    this.providerCode = providerCode;
  }
}

function configured(value: string | undefined): string {
  return value?.trim() || "";
}

export function getOpenAICompatibleApiKey(env: NodeJS.ProcessEnv = runtimeEnvironment()): string {
  return configured(env.OPENAI_LLM_API_KEY) || configured(env.OPENAI_API_KEY);
}

export function getOpenAICompatibleBaseUrl(env: NodeJS.ProcessEnv = runtimeEnvironment()): string {
  return (configured(env.OPENAI_LLM_BASE_URL) || configured(env.OPENAI_BASE_URL) || DEFAULT_OPENAI_BASE_URL).replace(/\/+$/, "");
}

export function getOpenAICompatibleModel(env: NodeJS.ProcessEnv = runtimeEnvironment()): string {
  return configured(env.OPENAI_LLM_MODEL) || configured(env.OPENAI_MODEL) || DEFAULT_OPENAI_MODEL;
}

export function isGenuineOpenAIConfiguration(env: NodeJS.ProcessEnv = runtimeEnvironment()): boolean {
  const baseUrl = getOpenAICompatibleBaseUrl(env);
  const model = getOpenAICompatibleModel(env);
  return /^https:\/\/api\.openai\.com(?:\/|$)/i.test(baseUrl)
    && !/kimi|moonshot/i.test(`${baseUrl} ${model}`);
}

export function isOpenAICompatibleConfigured(env: NodeJS.ProcessEnv = runtimeEnvironment()): boolean {
  return Boolean(getOpenAICompatibleApiKey(env)) && isGenuineOpenAIConfiguration(env);
}

export function getOpenAICompatibleGatewayDiagnostics(env: NodeJS.ProcessEnv = runtimeEnvironment()) {
  return {
    apiKeyConfigured: isOpenAICompatibleConfigured(env),
    model: getOpenAICompatibleModel(env),
    baseUrl: getOpenAICompatibleBaseUrl(env),
    protocol: "openai-chat-completions" as const,
    provider: "openai" as const,
    genuineProvider: isGenuineOpenAIConfiguration(env),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function timeoutMs(env: NodeJS.ProcessEnv = runtimeEnvironment()): number {
  const parsed = Number.parseInt(env.AI_LLM_TIMEOUT_MS || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 55_000;
}

async function providerFetch(
  url: string,
  init: RequestInit,
  env: NodeJS.ProcessEnv = runtimeEnvironment(),
  timeoutOverrideMs?: number,
): Promise<Response> {
  const controller = new AbortController();
  const effectiveTimeout = Number.isFinite(timeoutOverrideMs) && Number(timeoutOverrideMs) > 0
    ? Number(timeoutOverrideMs)
    : timeoutMs(env);
  const timer = setTimeout(() => controller.abort(), effectiveTimeout);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function responseError(response: Response): Promise<OpenAIProviderError> {
  let detail = "";
  let providerCode: string | null = null;
  try {
    const payload = asRecord(await response.json());
    const error = asRecord(payload?.error);
    detail = typeof error?.message === "string" ? error.message : JSON.stringify(payload || {});
    providerCode = typeof error?.code === "string" ? error.code : null;
  } catch {
    detail = await response.text().catch(() => "");
  }
  const safeDetail = redactSensitiveText(detail).replace(/\s+/g, " ").trim().slice(0, 500);
  return new OpenAIProviderError(response.status, safeDetail, providerCode);
}

async function normalizeContent(
  content: LlmGatewayContent,
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
        throw new Error("OpenAI chat completions cannot extract PDF attachments; use the document extraction pipeline before LLM generation");
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
): Promise<LlmGatewayMessage[]> {
  return Promise.all(
    messages.map(async (message) => ({
      role: message.role,
      content: await normalizeContent(message.content),
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
      `OpenAI API exhausted the output budget before completing the final answer${reasoningLength > 0 ? " after reasoning" : ""}`,
    );
  }
  if (!text) {
    throw new Error(`OpenAI API returned an empty completion (finish_reason=${finishReason})`);
  }
  return { text, model };
}

export async function generateOpenAICompatibleText(options: LlmGatewayOptions): Promise<LlmGatewayResult> {
  const startedAt = Date.now();
  const apiKey = getOpenAICompatibleApiKey();
  if (!apiKey) throw new OpenAICompatibleNotConfiguredError();
  if (!isGenuineOpenAIConfiguration()) {
    throw new OpenAICompatibleNotConfiguredError(
      "OPENAI_BASE_URL and OPENAI_MODEL must identify the official OpenAI API; Kimi/Moonshot compatibility endpoints are not accepted",
    );
  }

  const baseUrl = getOpenAICompatibleBaseUrl();
  const model = getOpenAICompatibleModel();
  const messages = await normalizeMessages(options.messages);
  const body: Record<string, unknown> = {
    model,
    messages,
    max_completion_tokens: options.maxTokens ?? 1600,
  };

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
  }, runtimeEnvironment(), options.timeoutMs);
  if (!response.ok) throw await responseError(response);

  const completion = textFromResponse(await response.json());
  return {
    text: completion.text,
    model: completion.model,
    backend: "openai",
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
