import {
  generateClaudeText,
  getClaudeGatewayDiagnostics,
  isClaudeNotConfiguredError,
} from "@/lib/ai/claude-gateway";
import {
  generateOpenAICompatibleText,
  getOpenAICompatibleApiKey,
  getOpenAICompatibleGatewayDiagnostics,
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
  return {
    backend,
    requestedProvider: requestedProvider(env),
    apiKeyConfigured: selected.apiKeyConfigured,
    model: selected.model,
    baseUrl: backend === "kimi" ? kimi.baseUrl : null,
    kimi,
    claude,
  };
}

export async function generateLlmText(options: LlmGatewayOptions): Promise<LlmGatewayResult> {
  const backend = getConfiguredLlmBackend();
  try {
    if (backend === "kimi") return await generateOpenAICompatibleText(options);
    return await generateClaudeText(options);
  } catch (error) {
    if (isOpenAICompatibleNotConfiguredError(error) || isClaudeNotConfiguredError(error)) {
      throw new LlmNotConfiguredError(backend, error.message);
    }
    throw error;
  }
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
  const result = await generateLlmText(options);
  return parseJsonText(result.text) as T;
}

export function isLlmConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  const backend = getConfiguredLlmBackend(env);
  return backend === "kimi"
    ? Boolean(getOpenAICompatibleApiKey(env))
    : getClaudeGatewayDiagnostics(env).apiKeyConfigured;
}

export function isLlmNotConfiguredError(error: unknown): error is LlmNotConfiguredError {
  return error instanceof LlmNotConfiguredError;
}
