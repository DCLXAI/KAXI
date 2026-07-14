import { isEnvTrue } from "@/lib/env";
import {
  getConfiguredLlmBackend,
  getLlmGatewayDiagnostics,
  type LlmBackend,
} from "@/lib/ai/llm-gateway";

export type AgentBackend = LlmBackend;
export type ConsultBackend = LlmBackend;
export type AiBackendFeature = "agent" | "consult";
export type AiBackendDecisionOutcome = "selected" | "skipped" | "applied";

export interface AiBackendDecisionStep {
  code: string;
  outcome: AiBackendDecisionOutcome;
  detail: string;
}

export interface AiBackendDecision<T extends string> {
  feature: AiBackendFeature;
  backend: T;
  configuredValue: T | "unsupported" | null;
  requireLlm: boolean;
  fallbackAllowed: boolean;
  decisionTable: AiBackendDecisionStep[];
}

export interface AiFeatureBackendDiagnostics<T extends string> {
  backend: T;
  configuredValue: T | "unsupported" | null;
  requireLlm: boolean;
  fallbackAllowed: boolean;
  ready: boolean;
  decisionTable: AiBackendDecisionStep[];
}

export interface AiBackendDiagnostics {
  runtime: {
    hosted: boolean;
    vercelEnv: string | null;
  };
  agent: AiFeatureBackendDiagnostics<AgentBackend>;
  consult: AiFeatureBackendDiagnostics<ConsultBackend>;
  llm: {
    backend: LlmBackend;
    apiKeyConfigured: boolean;
    model: string;
    baseUrl: string | null;
    managedApi: true;
    fallbackEnabled: boolean;
    fallbackBackend: LlmBackend;
    fallbackConfigured: boolean;
    configuredProviderCount: number;
  };
  kimi: {
    apiKeyConfigured: boolean;
    model: string;
    baseUrl: string;
    protocol: "openai-chat-completions";
    managedApi: true;
  };
  claude: {
    apiKeyConfigured: boolean;
    model: string;
    managedApi: true;
  };
  fallbackPolicy: {
    globalFallbackAllowed: boolean;
    providerFailoverEnabled: boolean;
    providerFailoverReady: boolean;
  };
  issues: string[];
  warnings: string[];
}

export function isHostedRuntime(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.VERCEL === "1" || Boolean(env.VERCEL_ENV);
}

function configuredValue(value: string | undefined): string | null {
  return value?.trim() ? value.trim().toLowerCase() : null;
}

function selected(code: string, detail: string): AiBackendDecisionStep {
  return { code, outcome: "selected", detail };
}

function skipped(code: string, detail: string): AiBackendDecisionStep {
  return { code, outcome: "skipped", detail };
}

function applied(code: string, detail: string): AiBackendDecisionStep {
  return { code, outcome: "applied", detail };
}

function fallbackAllowed(env: NodeJS.ProcessEnv): boolean {
  return isEnvTrue(env.AI_ALLOW_LLM_FALLBACK) || !isEnvTrue(env.AI_REQUIRE_LLM);
}

function requireLlm(env: NodeJS.ProcessEnv): boolean {
  return isEnvTrue(env.AI_REQUIRE_LLM) && !isEnvTrue(env.AI_ALLOW_LLM_FALLBACK);
}

function legacyWarnings(env: NodeJS.ProcessEnv): string[] {
  const configured = Object.keys(env).filter((key) => {
    if (!env[key]?.trim()) return false;
    return (
      key === "AGENT_BACKEND" ||
      key === "AI_CONSULT_BACKEND" ||
      key.startsWith("CODEX_") ||
      key.startsWith("ZAI_") ||
      key.startsWith("NEXT_PUBLIC_CODEX_")
    );
  });
  if (configured.length === 0) return [];
  return [
    `Legacy Codex/remote-bridge/Z.ai backend env vars are ignored by the managed LLM gateway: ${configured.join(", ")}.`,
  ];
}

function decision(feature: AiBackendFeature, env: NodeJS.ProcessEnv): AiBackendDecision<LlmBackend> {
  const backend = getConfiguredLlmBackend(env);
  const legacyOverride = configuredValue(feature === "agent" ? env.AGENT_BACKEND : env.AI_CONSULT_BACKEND);
  const configuredProvider = configuredValue(env.AI_PROVIDER);
  const table: AiBackendDecisionStep[] = [];
  if (legacyOverride) {
    table.push(
      applied(
        `${feature}.backend.legacy_override_ignored`,
        "AGENT_BACKEND and AI_CONSULT_BACKEND are legacy settings; use AI_PROVIDER for the managed LLM gateway."
      )
    );
  } else {
    table.push(skipped(`${feature}.backend.legacy_override_ignored`, "No legacy backend override configured."));
  }
  table.push(
    selected(
      `${feature}.backend.${backend}`,
      backend === "kimi"
        ? "Using Kimi through its OpenAI-compatible managed API."
        : "Using Anthropic Claude through the managed LLM gateway."
    )
  );

  const strict = requireLlm(env);
  table.push(
    strict
      ? selected(`${feature}.require.strict_llm`, "AI_REQUIRE_LLM=true requires the selected LLM API to be available.")
      : applied(`${feature}.require.fallback_allowed`, "The selected LLM may fall back to deterministic tools/official summaries.")
  );

  return {
    feature,
    backend,
    configuredValue: configuredProvider && configuredProvider !== "auto" ? backend : null,
    requireLlm: strict,
    fallbackAllowed: fallbackAllowed(env),
    decisionTable: table,
  };
}

export function getAgentBackend(env: NodeJS.ProcessEnv = process.env): AgentBackend {
  return getConfiguredLlmBackend(env);
}

export function getConsultBackend(env: NodeJS.ProcessEnv = process.env): ConsultBackend {
  return getConfiguredLlmBackend(env);
}

export function explainAgentBackendDecision(env: NodeJS.ProcessEnv = process.env): AiBackendDecision<AgentBackend> {
  return decision("agent", env);
}

export function explainConsultBackendDecision(env: NodeJS.ProcessEnv = process.env): AiBackendDecision<ConsultBackend> {
  return decision("consult", env);
}

export function shouldRequireAgentLlm(_backend?: AgentBackend, env: NodeJS.ProcessEnv = process.env): boolean {
  return requireLlm(env);
}

export function shouldRequireConsultLlm(_backend?: ConsultBackend, env: NodeJS.ProcessEnv = process.env): boolean {
  return requireLlm(env);
}

export function getAiBackendDiagnostics(env: NodeJS.ProcessEnv = process.env): AiBackendDiagnostics {
  const hosted = isHostedRuntime(env);
  const gateway = getLlmGatewayDiagnostics(env);
  const { claude, kimi } = gateway;
  const agentDecision = explainAgentBackendDecision(env);
  const consultDecision = explainConsultBackendDecision(env);
  const issues: string[] = [];
  const warnings = legacyWarnings(env);

  const managedLlmConfigured = gateway.apiKeyConfigured
    || (gateway.fallbackEnabled && gateway.fallbackConfigured);
  if (!managedLlmConfigured) {
    const keyName = gateway.backend === "kimi" ? "OPENAI_API_KEY/KIMI_API_KEY" : "ANTHROPIC_API_KEY";
    const message = requireLlm(env)
      ? `${keyName} is not configured for ${gateway.backend} while AI_REQUIRE_LLM=true.`
      : `${keyName} is not configured for ${gateway.backend}; LLM calls will use deterministic fallback.`;
    (requireLlm(env) ? issues : warnings).push(message);
  } else if (!gateway.apiKeyConfigured && gateway.fallbackConfigured) {
    warnings.push(`${gateway.backend} is not configured; managed LLM calls will start on ${gateway.fallbackBackend}.`);
  }
  if (env.AI_REQUIRE_PROVIDER_FAILOVER === "true" && !gateway.fallbackConfigured) {
    issues.push(`AI_REQUIRE_PROVIDER_FAILOVER=true but ${gateway.fallbackBackend} credentials are not configured.`);
  } else if (gateway.apiKeyConfigured && !gateway.fallbackConfigured) {
    warnings.push(`${gateway.fallbackBackend} is not configured; a ${gateway.backend} runtime failure has no managed-provider failover.`);
  }

  const requested = env.AI_PROVIDER?.trim().toLowerCase();
  if (requested && !["auto", "kimi", "moonshot", "openai", "openai-compatible", "claude", "anthropic"].includes(requested)) {
    warnings.push(`Unsupported AI_PROVIDER=${requested}; automatic provider selection was applied.`);
  }

  const ready = managedLlmConfigured || fallbackAllowed(env);

  return {
    runtime: {
      hosted,
      vercelEnv: env.VERCEL_ENV || null,
    },
    agent: {
      backend: gateway.backend,
      configuredValue: agentDecision.configuredValue,
      requireLlm: agentDecision.requireLlm,
      fallbackAllowed: agentDecision.fallbackAllowed,
      ready,
      decisionTable: agentDecision.decisionTable,
    },
    consult: {
      backend: gateway.backend,
      configuredValue: consultDecision.configuredValue,
      requireLlm: consultDecision.requireLlm,
      fallbackAllowed: consultDecision.fallbackAllowed,
      ready,
      decisionTable: consultDecision.decisionTable,
    },
    llm: {
      backend: gateway.backend,
      apiKeyConfigured: gateway.apiKeyConfigured,
      model: gateway.model,
      baseUrl: gateway.baseUrl,
      managedApi: true,
      fallbackEnabled: gateway.fallbackEnabled,
      fallbackBackend: gateway.fallbackBackend,
      fallbackConfigured: gateway.fallbackConfigured,
      configuredProviderCount: gateway.configuredProviderCount,
    },
    kimi: {
      apiKeyConfigured: kimi.apiKeyConfigured,
      model: kimi.model,
      baseUrl: kimi.baseUrl,
      protocol: kimi.protocol,
      managedApi: true,
    },
    claude: {
      apiKeyConfigured: claude.apiKeyConfigured,
      model: claude.model,
      managedApi: true,
    },
    fallbackPolicy: {
      globalFallbackAllowed: fallbackAllowed(env),
      providerFailoverEnabled: gateway.fallbackEnabled,
      providerFailoverReady: gateway.fallbackConfigured,
    },
    issues,
    warnings,
  };
}
