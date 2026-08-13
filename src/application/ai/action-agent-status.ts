import { getAiBackendDiagnostics } from "@/lib/ai/backend-selector";
import { canWriteRuntimeDatabase } from "@/lib/db";
import { isPiiEncryptionConfigured } from "@/lib/privacy/pii";
import type { ApplicationAiRuntimeConfig } from "@/application/ai/runtime-config";

function shouldPersistAgentLog(config: ApplicationAiRuntimeConfig): boolean {
  if (!config.agentLoggingEnabled) return false;
  return canWriteRuntimeDatabase();
}

function shouldPersistAgentLedger(config: ApplicationAiRuntimeConfig): boolean {
  if (!config.agentLedgerEnabled) return false;
  return canWriteRuntimeDatabase();
}

export function getActionAgentStatus(maxDuration: number, config: ApplicationAiRuntimeConfig) {
  const backendPolicy = getAiBackendDiagnostics();
  const backendReady = backendPolicy.agent.ready && backendPolicy.issues.length === 0;
  return {
    ok: backendReady,
    status: backendReady ? "ready" : "needs_configuration",
    backend: backendPolicy.agent.backend,
    runtime: {
      hosted: backendPolicy.runtime.hosted,
      vercelEnv: config.vercelEnv,
      maxDuration,
    },
    llm: backendPolicy.llm,
    openai: backendPolicy.openai,
    anthropic: backendPolicy.anthropic,
    preflight: {
      enabled: config.agentPreflightEnabled,
      timeoutMs: config.agentPreflightTimeoutMs,
    },
    limits: {
      rateLimit: config.agentRateLimit,
      dailyQuota: config.agentDailyQuota,
      maxQuestionChars: config.agentMaxQuestionChars,
      timeoutMs: config.agentTimeoutMs,
    },
    persistence: {
      writableDatabase: canWriteRuntimeDatabase(),
      chatLog: shouldPersistAgentLog(config),
      ledger: shouldPersistAgentLedger(config),
      piiEncryption: isPiiEncryptionConfigured(),
    },
    backendPolicy,
  };
}
