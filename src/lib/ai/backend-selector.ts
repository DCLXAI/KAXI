import { isEnvFalse, isEnvTrue } from "@/lib/env";

export type AgentBackend = "codex" | "zai" | "tool-fallback" | "remote-bridge";
export type ConsultBackend = "remote-bridge" | "codex" | "zai";

export interface AiBackendDiagnostics {
  runtime: {
    hosted: boolean;
    vercelEnv: string | null;
  };
  agent: {
    backend: AgentBackend;
    configuredValue: string | null;
    requireLlm: boolean;
    fallbackAllowed: boolean;
    ready: boolean;
  };
  consult: {
    backend: ConsultBackend;
    configuredValue: string | null;
    requireLlm: boolean;
    fallbackAllowed: boolean;
    ready: boolean;
  };
  codex: {
    apiKeyConfigured: boolean;
    serverlessEnabled: boolean;
    runtimeReady: boolean;
  };
  remoteBridge: {
    configured: boolean;
    enabled: boolean;
  };
  zai: {
    configured: boolean;
  };
  fallbackPolicy: {
    globalFallbackAllowed: boolean;
    agentToolFallbackAllowed: boolean;
    consultSummaryFallbackAllowed: boolean;
  };
  issues: string[];
  warnings: string[];
}

export function isHostedRuntime(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.VERCEL === "1" || Boolean(env.VERCEL_ENV);
}

export function isRemoteBridgeConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  if (isEnvFalse(env.CODEX_REMOTE_BRIDGE_ENABLED)) return false;
  return Boolean(env.CODEX_REMOTE_BRIDGE_URL?.trim());
}

export function getAgentBackend(env: NodeJS.ProcessEnv = process.env): AgentBackend {
  const configured = env.AGENT_BACKEND?.trim().toLowerCase();
  if (configured === "zai") return "zai";
  if (configured === "tool-fallback") return "tool-fallback";
  if (configured === "remote-bridge") return "remote-bridge";
  return "codex";
}

function configuredValue(value: string | undefined): string | null {
  return value?.trim() ? value.trim().toLowerCase() : null;
}

function safeConfiguredValue<T extends string>(value: string | null, allowed: readonly T[]): T | "unsupported" | null {
  if (!value) return null;
  return allowed.includes(value as T) ? (value as T) : "unsupported";
}

function codexApiKeyConfigured(env: NodeJS.ProcessEnv): boolean {
  return Boolean(env.CODEX_API_KEY?.trim() || env.OPENAI_API_KEY?.trim());
}

function zaiConfigured(env: NodeJS.ProcessEnv): boolean {
  if (isEnvFalse(env.ZAI_ENABLED)) return false;
  return (
    isEnvTrue(env.ZAI_ENABLED) ||
    Boolean(env.ZAI_API_KEY?.trim()) ||
    Boolean(env.ZAI_CONFIG_PATH?.trim())
  );
}

export function isCodexServerlessEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (isEnvFalse(env.CODEX_SERVERLESS_ENABLED)) return false;
  return getAgentBackend(env) === "codex" || isEnvTrue(env.CODEX_SERVERLESS_ENABLED);
}

export function getConsultBackend(env: NodeJS.ProcessEnv = process.env): ConsultBackend {
  const configured = env.AI_CONSULT_BACKEND?.trim().toLowerCase();
  if (configured === "remote-bridge" || configured === "codex") return configured;

  const agentBackend = getAgentBackend(env);
  if (agentBackend === "remote-bridge" || isRemoteBridgeConfigured(env)) {
    return "remote-bridge";
  }

  if (configured === "zai") return "zai";

  const codexConfigured =
    Boolean(env.CODEX_API_KEY || env.OPENAI_API_KEY) ||
    isEnvTrue(env.CODEX_SERVERLESS_ENABLED) ||
    !isHostedRuntime(env);

  if (agentBackend === "codex" && codexConfigured) return "codex";

  return "zai";
}

export function shouldRequireAgentLlm(
  configuredBackend: AgentBackend = getAgentBackend(),
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (isEnvTrue(env.AI_ALLOW_LLM_FALLBACK) || isEnvTrue(env.AI_AGENT_ALLOW_TOOL_FALLBACK)) {
    return false;
  }

  return (
    isEnvTrue(env.AI_REQUIRE_LLM) ||
    isEnvTrue(env.AI_AGENT_REQUIRE_LLM) ||
    configuredBackend === "remote-bridge"
  );
}

export function shouldRequireConsultLlm(
  consultBackend: ConsultBackend = getConsultBackend(),
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (
    isEnvTrue(env.AI_ALLOW_LLM_FALLBACK) ||
    isEnvTrue(env.AI_CONSULT_ALLOW_OFFICIAL_SUMMARY_FALLBACK)
  ) {
    return false;
  }

  return (
    isEnvTrue(env.AI_REQUIRE_LLM) ||
    isEnvTrue(env.AI_CONSULT_REQUIRE_LLM) ||
    consultBackend === "remote-bridge"
  );
}

export function getAiBackendDiagnostics(env: NodeJS.ProcessEnv = process.env): AiBackendDiagnostics {
  const hosted = isHostedRuntime(env);
  const agentBackend = getAgentBackend(env);
  const consultBackend = getConsultBackend(env);
  const rawAgentBackend = configuredValue(env.AGENT_BACKEND);
  const rawConsultBackend = configuredValue(env.AI_CONSULT_BACKEND);
  const remoteBridgeConfigured = isRemoteBridgeConfigured(env);
  const remoteBridgeEnabled = !isEnvFalse(env.CODEX_REMOTE_BRIDGE_ENABLED);
  const codexKeyConfigured = codexApiKeyConfigured(env);
  const codexServerless = isCodexServerlessEnabled(env);
  const codexRuntimeReady = !hosted || codexKeyConfigured;
  const zAiReady = zaiConfigured(env);
  const agentRequiresLlm = shouldRequireAgentLlm(agentBackend, env);
  const consultRequiresLlm = shouldRequireConsultLlm(consultBackend, env);
  const globalFallbackAllowed = isEnvTrue(env.AI_ALLOW_LLM_FALLBACK);
  const agentToolFallbackAllowed = globalFallbackAllowed || isEnvTrue(env.AI_AGENT_ALLOW_TOOL_FALLBACK);
  const consultSummaryFallbackAllowed =
    globalFallbackAllowed || isEnvTrue(env.AI_CONSULT_ALLOW_OFFICIAL_SUMMARY_FALLBACK);
  const issues: string[] = [];
  const warnings: string[] = [];

  if (rawAgentBackend && !["codex", "zai", "tool-fallback", "remote-bridge"].includes(rawAgentBackend)) {
    warnings.push("Unsupported AGENT_BACKEND value is ignored; using codex.");
  }
  if (rawConsultBackend && !["remote-bridge", "codex", "zai"].includes(rawConsultBackend)) {
    warnings.push("Unsupported AI_CONSULT_BACKEND value is ignored.");
  }
  if (!remoteBridgeEnabled && env.CODEX_REMOTE_BRIDGE_URL?.trim()) {
    warnings.push("CODEX_REMOTE_BRIDGE_URL is set but CODEX_REMOTE_BRIDGE_ENABLED=false disables it.");
  }

  const agentCodexReady = agentBackend !== "codex" || codexRuntimeReady || !agentRequiresLlm;
  const agentZaiReady = agentBackend !== "zai" || zAiReady || !agentRequiresLlm;
  const agentBridgeReady = agentBackend !== "remote-bridge" || remoteBridgeConfigured || !agentRequiresLlm;
  const consultCodexReady = consultBackend !== "codex" || codexRuntimeReady || !consultRequiresLlm;
  const consultZaiReady = consultBackend !== "zai" || zAiReady || !consultRequiresLlm;
  const consultBridgeReady = consultBackend !== "remote-bridge" || remoteBridgeConfigured || !consultRequiresLlm;

  if (agentBackend === "codex" && !codexRuntimeReady) {
    const message = hosted
      ? "Agent backend codex needs CODEX_API_KEY or OPENAI_API_KEY on hosted runtime."
      : "Agent backend codex will use local Codex auth.";
    (agentRequiresLlm ? issues : warnings).push(message);
  }
  if (consultBackend === "codex" && !codexRuntimeReady) {
    const message = hosted
      ? "Consult backend codex needs CODEX_API_KEY or OPENAI_API_KEY on hosted runtime."
      : "Consult backend codex will use local Codex auth.";
    (consultRequiresLlm ? issues : warnings).push(message);
  }
  if (agentBackend === "remote-bridge" && !remoteBridgeConfigured) {
    (agentRequiresLlm ? issues : warnings).push("Agent backend remote-bridge requires CODEX_REMOTE_BRIDGE_URL.");
  }
  if (consultBackend === "remote-bridge" && !remoteBridgeConfigured) {
    (consultRequiresLlm ? issues : warnings).push("Consult backend remote-bridge requires CODEX_REMOTE_BRIDGE_URL.");
  }
  if (agentBackend === "zai" && !zAiReady) {
    (agentRequiresLlm ? issues : warnings).push("Agent backend zAI is selected but Z.ai configuration is missing.");
  }
  if (consultBackend === "zai" && !zAiReady) {
    (consultRequiresLlm ? issues : warnings).push("Consult backend zAI is selected but Z.ai configuration is missing.");
  }

  return {
    runtime: {
      hosted,
      vercelEnv: env.VERCEL_ENV || null,
    },
    agent: {
      backend: agentBackend,
      configuredValue: safeConfiguredValue(rawAgentBackend, ["codex", "zai", "tool-fallback", "remote-bridge"]),
      requireLlm: agentRequiresLlm,
      fallbackAllowed: !agentRequiresLlm,
      ready: agentBackend === "tool-fallback" || (agentCodexReady && agentZaiReady && agentBridgeReady),
    },
    consult: {
      backend: consultBackend,
      configuredValue: safeConfiguredValue(rawConsultBackend, ["remote-bridge", "codex", "zai"]),
      requireLlm: consultRequiresLlm,
      fallbackAllowed: !consultRequiresLlm,
      ready: consultCodexReady && consultZaiReady && consultBridgeReady,
    },
    codex: {
      apiKeyConfigured: codexKeyConfigured,
      serverlessEnabled: codexServerless,
      runtimeReady: codexRuntimeReady,
    },
    remoteBridge: {
      configured: remoteBridgeConfigured,
      enabled: remoteBridgeEnabled,
    },
    zai: {
      configured: zAiReady,
    },
    fallbackPolicy: {
      globalFallbackAllowed,
      agentToolFallbackAllowed,
      consultSummaryFallbackAllowed,
    },
    issues,
    warnings,
  };
}
