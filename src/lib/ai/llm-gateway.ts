import {
  generateClaudeText,
  getClaudeGatewayDiagnostics,
  isClaudeConfigured,
  isClaudeNotConfiguredError,
} from "@/lib/ai/claude-gateway";
import {
  generateOpenAICompatibleText,
  getOpenAICompatibleApiKey,
  getOpenAICompatibleGatewayDiagnostics,
  isOpenAICompatibleConfigured,
  isOpenAICompatibleNotConfiguredError,
} from "@/lib/ai/openai-compatible-gateway";
import type {
  LlmBackend,
  LlmGatewayMessage,
  LlmGatewayOptions,
  LlmGatewayResult,
  LlmRole,
} from "@/lib/ai/llm-types";

export type { LlmBackend, LlmGatewayMessage, LlmGatewayOptions, LlmGatewayResult, LlmRole };

export class LlmNotConfiguredError extends Error {
  readonly backend: LlmBackend;

  constructor(backend: LlmBackend, message: string) {
    super(message);
    this.name = "LlmNotConfiguredError";
    this.backend = backend;
  }
}

export class LlmProviderExhaustedError extends Error {
  readonly attempts: LlmBackend[];

  constructor(attempts: LlmBackend[], failures: string[]) {
    super(`Managed LLM providers exhausted (${attempts.join(" -> ")}): ${failures.join(", ")}`);
    this.name = "LlmProviderExhaustedError";
    this.attempts = attempts;
  }
}

function requestedProvider(env: NodeJS.ProcessEnv): string {
  return env.AI_PROVIDER?.trim().toLowerCase() || "auto";
}

function hasExplicitKimiConfiguration(env: NodeJS.ProcessEnv): boolean {
  if (env.KIMI_API_KEY?.trim() || env.MOONSHOT_API_KEY?.trim()) return true;
  const baseUrl = env.KIMI_BASE_URL?.trim() || env.OPENAI_BASE_URL?.trim() || "";
  return Boolean(env.OPENAI_API_KEY?.trim() && /moonshot|kimi/i.test(baseUrl));
}

export function getConfiguredLlmBackend(env: NodeJS.ProcessEnv = process.env): LlmBackend {
  const requested = requestedProvider(env);
  if (["kimi", "moonshot", "openai", "openai-compatible"].includes(requested)) return "kimi";
  if (["claude", "anthropic"].includes(requested)) return "claude";
  return hasExplicitKimiConfiguration(env) ? "kimi" : "claude";
}

export function getLlmModel(env: NodeJS.ProcessEnv = process.env): string {
  const diagnostics = getLlmGatewayDiagnostics(env);
  return diagnostics.model;
}

export function getLlmGatewayDiagnostics(env: NodeJS.ProcessEnv = process.env) {
  const backend = getConfiguredLlmBackend(env);
  const kimi = getOpenAICompatibleGatewayDiagnostics(env);
  const claude = getClaudeGatewayDiagnostics(env);
  const selected = backend === "kimi" ? kimi : claude;
  const fallbackEnabled = providerFailoverEnabled(env);
  const fallbackBackend: LlmBackend = backend === "kimi" ? "claude" : "kimi";
  const fallbackConfigured = fallbackBackend === "kimi"
    ? kimi.apiKeyConfigured
    : claude.apiKeyConfigured;
  return {
    backend,
    requestedProvider: requestedProvider(env),
    apiKeyConfigured: selected.apiKeyConfigured,
    model: selected.model,
    baseUrl: backend === "kimi" ? kimi.baseUrl : null,
    fallbackEnabled,
    fallbackBackend,
    fallbackConfigured,
    configuredProviderCount: Number(kimi.apiKeyConfigured) + Number(claude.apiKeyConfigured),
    kimi,
    claude,
  };
}

function providerFailoverEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.AI_LLM_PROVIDER_FAILOVER_ENABLED?.trim().toLowerCase() !== "false";
}

function providerConfigured(backend: LlmBackend, env: NodeJS.ProcessEnv = process.env) {
  return backend === "kimi"
    ? isOpenAICompatibleConfigured(env)
    : isClaudeConfigured(env);
}

function providerOrder(env: NodeJS.ProcessEnv = process.env) {
  const primary = getConfiguredLlmBackend(env);
  const secondary: LlmBackend = primary === "kimi" ? "claude" : "kimi";
  return providerFailoverEnabled(env) && providerConfigured(secondary, env)
    ? [primary, secondary]
    : [primary];
}

function failureCode(error: unknown) {
  if (isOpenAICompatibleNotConfiguredError(error) || isClaudeNotConfiguredError(error)) return "not_configured";
  if (error instanceof SyntaxError) return "invalid_json";
  if (error instanceof Error && (error.name === "AbortError" || /abort|timeout/iu.test(error.message))) return "timeout";
  if (error instanceof Error && /empty completion/iu.test(error.message)) return "empty_completion";
  if (error instanceof Error && /output budget/iu.test(error.message)) return "output_budget";
  if (error instanceof Error && /request failed/iu.test(error.message)) return "provider_http_error";
  return "provider_error";
}

async function callProvider(backend: LlmBackend, options: LlmGatewayOptions) {
  return backend === "kimi"
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
        `[llm-gateway] ${backend} attempt failed (${failureCode(error)}):`,
        error instanceof Error ? error.message.slice(0, 300) : String(error).slice(0, 300),
      );
      firstError ??= error;
      failures.push(`${backend}:${failureCode(error)}`);
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

export function isLlmConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return providerOrder(env).some((backend) => providerConfigured(backend, env));
}

export function isLlmNotConfiguredError(error: unknown): error is LlmNotConfiguredError {
  return error instanceof LlmNotConfiguredError;
}
