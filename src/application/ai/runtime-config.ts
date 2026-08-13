export interface ApplicationAiRuntimeConfig {
  agentLoggingEnabled: boolean;
  agentLedgerEnabled: boolean;
  agentPreflightEnabled: boolean;
  agentPreflightTimeoutMs: number;
  agentTimeoutMs: number;
  expertLlmTimeoutMs: number;
  vercelEnv: string | null;
  agentRateLimit: number;
  agentDailyQuota: number;
  agentMaxQuestionChars: number;
  agentRequestDeadlineMs: number;
  expertRateLimit: number;
  expertDailyQuota: number;
  expertMaxQuestionChars: number;
  expertRequestDeadlineMs: number;
  unifiedRequestDeadlineMs: number | null;
}

/** Deterministic application defaults used by tests and non-HTTP callers. */
export const DEFAULT_APPLICATION_AI_RUNTIME_CONFIG: ApplicationAiRuntimeConfig = Object.freeze({
  agentLoggingEnabled: true,
  agentLedgerEnabled: true,
  agentPreflightEnabled: false,
  agentPreflightTimeoutMs: 4_000,
  agentTimeoutMs: 15_000,
  expertLlmTimeoutMs: 55_000,
  vercelEnv: null,
  agentRateLimit: 6,
  agentDailyQuota: 30,
  agentMaxQuestionChars: 2_000,
  agentRequestDeadlineMs: 24_000,
  expertRateLimit: 6,
  expertDailyQuota: 30,
  expertMaxQuestionChars: 2_500,
  expertRequestDeadlineMs: 58_000,
  unifiedRequestDeadlineMs: null,
});
