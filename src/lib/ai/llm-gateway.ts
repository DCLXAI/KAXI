import { runtimeEnvironment } from "@/infrastructure/config/runtime-environment";
import {
  generateClaudeText,
  getClaudeGatewayDiagnostics,
  isGenuineAnthropicConfiguration,
  isClaudeConfigured,
  isClaudeNotConfiguredError,
} from "@/lib/ai/claude-gateway";
import {
  generateOpenAICompatibleText,
  getOpenAICompatibleApiKey,
  getOpenAICompatibleGatewayDiagnostics,
  isGenuineOpenAIConfiguration,
  isOpenAICompatibleConfigured,
  isOpenAICompatibleNotConfiguredError,
} from "@/lib/ai/openai-compatible-gateway";
import type {
  LlmBackend,
  LlmGatewayMessage,
  LlmGatewayOptions,
  LlmGatewayResult,
  LlmRole,
  ManagedLlmBackend,
} from "@/lib/ai/llm-types";

export type { LlmBackend, LlmGatewayMessage, LlmGatewayOptions, LlmGatewayResult, LlmRole };

export class LlmNotConfiguredError extends Error {
  readonly backend: ManagedLlmBackend;

  constructor(backend: ManagedLlmBackend, message: string) {
    super(message);
    this.name = "LlmNotConfiguredError";
    this.backend = backend;
  }
}

export class LlmProviderExhaustedError extends Error {
  readonly attempts: ManagedLlmBackend[];
  readonly failures: string[];

  constructor(attempts: ManagedLlmBackend[], failures: string[]) {
    super(`Managed LLM providers exhausted (${attempts.join(" -> ")}): ${failures.join(", ")}`);
    this.name = "LlmProviderExhaustedError";
    this.attempts = attempts;
    this.failures = failures;
  }
}

function requestedProvider(env: NodeJS.ProcessEnv): string {
  return env.AI_PROVIDER?.trim().toLowerCase() || "auto";
}

export function getConfiguredLlmBackend(env: NodeJS.ProcessEnv = runtimeEnvironment()): ManagedLlmBackend {
  const requested = requestedProvider(env);
  if (requested === "openai") return "openai";
  if (["claude", "anthropic"].includes(requested)) return "anthropic";
  if (isGenuineOpenAIConfiguration(env) && getOpenAICompatibleApiKey(env)) return "openai";
  return "anthropic";
}

export function getLlmModel(env: NodeJS.ProcessEnv = runtimeEnvironment()): string {
  const diagnostics = getLlmGatewayDiagnostics(env);
  return diagnostics.model;
}

export function getLlmGatewayDiagnostics(env: NodeJS.ProcessEnv = runtimeEnvironment()) {
  const backend = getConfiguredLlmBackend(env);
  const openai = getOpenAICompatibleGatewayDiagnostics(env);
  const anthropic = getClaudeGatewayDiagnostics(env);
  const selected = backend === "openai" ? openai : anthropic;
  const fallbackEnabled = providerFailoverEnabled(env);
  const fallbackBackend: ManagedLlmBackend = backend === "openai" ? "anthropic" : "openai";
  const fallbackConfigured = fallbackBackend === "openai"
    ? openai.apiKeyConfigured
    : anthropic.apiKeyConfigured;
  return {
    backend,
    requestedProvider: requestedProvider(env),
    apiKeyConfigured: selected.apiKeyConfigured,
    model: selected.model,
    baseUrl: selected.baseUrl,
    fallbackEnabled,
    fallbackBackend,
    fallbackConfigured,
    configuredProviderCount: Number(openai.apiKeyConfigured) + Number(anthropic.apiKeyConfigured),
    openai,
    anthropic,
  };
}

function providerFailoverEnabled(env: NodeJS.ProcessEnv = runtimeEnvironment()) {
  return env.AI_LLM_PROVIDER_FAILOVER_ENABLED?.trim().toLowerCase() !== "false";
}

function providerConfigured(backend: ManagedLlmBackend, env: NodeJS.ProcessEnv = runtimeEnvironment()) {
  return backend === "openai"
    ? isOpenAICompatibleConfigured(env)
    : isClaudeConfigured(env);
}

function providerOrder(env: NodeJS.ProcessEnv = runtimeEnvironment()) {
  const primary = getConfiguredLlmBackend(env);
  const secondary: ManagedLlmBackend = primary === "openai" ? "anthropic" : "openai";
  return providerFailoverEnabled(env) && providerConfigured(secondary, env)
    ? [primary, secondary]
    : [primary];
}

export type LlmFailureCode = "not_configured" | "quota_exhausted" | "rate_limited" | "invalid_json" | "timeout" | "empty_completion" | "output_budget" | "provider_http_error" | "provider_error";

export function classifyLlmFailure(error: unknown): LlmFailureCode {
  if (isOpenAICompatibleNotConfiguredError(error) || isClaudeNotConfiguredError(error)) return "not_configured";
  const message = error instanceof Error ? error.message : String(error);
  const status = error && typeof error === "object" && "status" in error ? Number((error as { status?: unknown }).status) : null;
  const providerCode = error && typeof error === "object" && "providerCode" in error
    ? String((error as { providerCode?: unknown }).providerCode || "")
    : "";
  if (status === 429 && /quota|billing|credit|insufficient_quota/iu.test(`${message} ${providerCode}`)) return "quota_exhausted";
  if (status === 403 && /quota|billing|credit|usage limit|insufficient/iu.test(`${message} ${providerCode}`)) return "quota_exhausted";
  if (/quota|billing cycle|usage limit reached|insufficient_quota/iu.test(`${message} ${providerCode}`)) return "quota_exhausted";
  if (status === 429) return "rate_limited";
  if (error instanceof SyntaxError) return "invalid_json";
  if (error instanceof Error && (error.name === "AbortError" || /abort|timeout/iu.test(error.message))) return "timeout";
  if (error instanceof Error && /empty completion/iu.test(error.message)) return "empty_completion";
  if (error instanceof Error && /output budget/iu.test(error.message)) return "output_budget";
  if (error instanceof Error && /request failed/iu.test(error.message)) return "provider_http_error";
  return "provider_error";
}

async function callProvider(backend: ManagedLlmBackend, options: LlmGatewayOptions) {
  return backend === "openai"
    ? generateOpenAICompatibleText(options)
    : generateClaudeText(options);
}

async function generateWithProviderFailover<T>(
  options: LlmGatewayOptions,
  transform: (result: LlmGatewayResult) => T,
): Promise<{ value: T; result: LlmGatewayResult }> {
  const startedAt = Date.now();
  const order = providerOrder();
  const failures: string[] = [];
  let firstError: unknown;

  for (const backend of order) {
    try {
      const result = await callProvider(backend, options);
      const value = transform(result);
      return {
        value,
        result: {
          ...result,
          durationMs: Date.now() - startedAt,
          attempts: failures.length + 1,
          primaryBackend: order[0],
          fallbackReason: failures[0] || null,
        },
      };
    } catch (error) {
      console.error(
        `[llm-gateway] ${backend} attempt failed (${classifyLlmFailure(error)}):`,
        error instanceof Error ? error.message.slice(0, 300) : String(error).slice(0, 300),
      );
      firstError ??= error;
      failures.push(`${backend}:${classifyLlmFailure(error)}`);
    }
  }

  if (order.length === 1) {
    const backend = order[0];
    if (isOpenAICompatibleNotConfiguredError(firstError) || isClaudeNotConfiguredError(firstError)) {
      throw new LlmNotConfiguredError(backend, firstError.message);
    }
    throw firstError;
  }
  throw new LlmProviderExhaustedError(order, failures);
}

export function isLlmQuotaExhaustedError(error: unknown): boolean {
  if (classifyLlmFailure(error) === "quota_exhausted") return true;
  return error instanceof LlmProviderExhaustedError
    && error.failures.some((failure) => failure.endsWith(":quota_exhausted"));
}

export async function generateLlmText(options: LlmGatewayOptions): Promise<LlmGatewayResult> {
  const generated = await generateWithProviderFailover(options, (result) => {
    if (options.jsonSchema) parseJsonText(result.text);
    return result;
  });
  return generated.result;
}

function parseJsonText(text: string): unknown {
  const trimmed = text.trim();
  const unfenced = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    : trimmed;
  return JSON.parse(unfenced);
}

export async function generateLlmJson<T>(
  options: LlmGatewayOptions & { jsonSchema: { name: string; schema: Record<string, unknown> } }
): Promise<T> {
  const generated = await generateWithProviderFailover(options, (result) => parseJsonText(result.text) as T);
  return generated.value;
}

export function isLlmConfigured(env: NodeJS.ProcessEnv = runtimeEnvironment()): boolean {
  return providerOrder(env).some((backend) => providerConfigured(backend, env));
}

export function isLlmNotConfiguredError(error: unknown): error is LlmNotConfiguredError {
  return error instanceof LlmNotConfiguredError;
}

export async function probeManagedLlmProviders(env: NodeJS.ProcessEnv = runtimeEnvironment()) {
  const providers: ManagedLlmBackend[] = ["openai", "anthropic"];
  return Promise.all(providers.map(async (backend) => {
    const startedAt = Date.now();
    if (!providerConfigured(backend, env)) {
      return {
        backend,
        ok: false,
        failureCode: "not_configured" as LlmFailureCode,
        latencyMs: Date.now() - startedAt,
      };
    }
    try {
      const result = await callProvider(backend, {
        feature: "structured",
        messages: [
          { role: "system", content: "This is a health probe. Reply with exactly OK." },
          { role: "user", content: "OK" },
        ],
        maxTokens: 32,
        temperature: 0,
        timeoutMs: 8_000,
      });
      return {
        backend,
        ok: result.text.trim().length > 0,
        model: result.model,
        failureCode: null,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        backend,
        ok: false,
        failureCode: classifyLlmFailure(error),
        latencyMs: Date.now() - startedAt,
      };
    }
  }));
}
