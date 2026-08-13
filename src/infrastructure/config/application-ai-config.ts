import { runtimeEnvironment } from "@/infrastructure/config/runtime-environment";
import { isEnvFalse, isEnvTrue } from "@/lib/env";
import { parseLimit, parsePositiveInt } from "@/lib/runtime/config";
import type { ApplicationAiRuntimeConfig } from "@/application/ai/runtime-config";

type RuntimeEnvironment = Readonly<Record<string, string | undefined>>;

const POSITIVE_INTEGER_KEYS = [
  "AI_AGENT_PREFLIGHT_TIMEOUT_MS",
  "AI_AGENT_TIMEOUT_MS",
  "AI_LLM_TIMEOUT_MS",
  "AI_AGENT_RATE_LIMIT",
  "AI_AGENT_DAILY_QUOTA",
  "AI_AGENT_MAX_CHARS",
  "AI_AGENT_REQUEST_DEADLINE_MS",
  "AI_CONSULT_RATE_LIMIT",
  "AI_CONSULT_DAILY_QUOTA",
  "AI_CONSULT_MAX_CHARS",
  "AI_CONSULT_REQUEST_DEADLINE_MS",
  "AI_UNIFIED_REQUEST_DEADLINE_MS",
] as const;

function optionalPositiveInt(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
}

/** The single server-runtime boundary that translates environment into application data. */
export function getApplicationAiRuntimeConfig(env: RuntimeEnvironment = runtimeEnvironment()): ApplicationAiRuntimeConfig {
  return {
    agentLoggingEnabled: !isEnvFalse(env.AI_AGENT_LOGGING_ENABLED),
    agentLedgerEnabled: !isEnvFalse(env.AI_AGENT_LEDGER_ENABLED),
    agentPreflightEnabled: isEnvTrue(env.AI_AGENT_PREFLIGHT_ENABLED),
    agentPreflightTimeoutMs: parsePositiveInt(env.AI_AGENT_PREFLIGHT_TIMEOUT_MS, 4_000),
    agentTimeoutMs: parsePositiveInt(env.AI_AGENT_TIMEOUT_MS, 15_000),
    expertLlmTimeoutMs: parsePositiveInt(env.AI_LLM_TIMEOUT_MS, 55_000),
    vercelEnv: env.VERCEL_ENV || null,
    agentRateLimit: parseLimit(env.AI_AGENT_RATE_LIMIT, 6),
    agentDailyQuota: parseLimit(env.AI_AGENT_DAILY_QUOTA, 30),
    agentMaxQuestionChars: parsePositiveInt(env.AI_AGENT_MAX_CHARS, 2_000),
    agentRequestDeadlineMs: parsePositiveInt(env.AI_AGENT_REQUEST_DEADLINE_MS, 24_000),
    expertRateLimit: parseLimit(env.AI_CONSULT_RATE_LIMIT, 6),
    expertDailyQuota: parseLimit(env.AI_CONSULT_DAILY_QUOTA, 30),
    expertMaxQuestionChars: parsePositiveInt(env.AI_CONSULT_MAX_CHARS, 2_500),
    expertRequestDeadlineMs: parsePositiveInt(env.AI_CONSULT_REQUEST_DEADLINE_MS, 58_000),
    unifiedRequestDeadlineMs: optionalPositiveInt(env.AI_UNIFIED_REQUEST_DEADLINE_MS),
  };
}

export function applicationAiRuntimeConfigIssues(env: RuntimeEnvironment = runtimeEnvironment()): string[] {
  return POSITIVE_INTEGER_KEYS.flatMap((key) => {
    const raw = env[key]?.trim();
    if (!raw) return [];
    const parsed = Number(raw);
    return Number.isSafeInteger(parsed) && parsed > 0 ? [] : [key];
  });
}

export function assertProductionApplicationAiRuntimeConfig(env: RuntimeEnvironment = runtimeEnvironment()): void {
  if (env.VERCEL_ENV !== "production" && env.NODE_ENV !== "production") return;
  const issues = applicationAiRuntimeConfigIssues(env);
  if (issues.length > 0) throw new Error(`Invalid AI runtime configuration: ${issues.join(", ")}`);
}
