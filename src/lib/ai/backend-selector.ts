import { isEnvTrue } from "@/lib/env";
import { getClaudeGatewayDiagnostics } from "@/lib/ai/claude-gateway";

export type AgentBackend = "claude";
export type ConsultBackend = "claude";
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
  claude: {
    apiKeyConfigured: boolean;
    model: string;
    managedApi: true;
  };
  fallbackPolicy: {
    globalFallbackAllowed: boolean;
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
    `Legacy Codex/remote-bridge/Z.ai backend env vars are ignored by Phase 2 Claude gateway: ${configured.join(", ")}.`,
  ];
}

function decision(feature: AiBackendFeature, env: NodeJS.ProcessEnv): AiBackendDecision<"claude"> {
  const raw = configuredValue(feature === "agent" ? env.AGENT_BACKEND : env.AI_CONSULT_BACKEND);
  const table: AiBackendDecisionStep[] = [];
  if (raw) {
    table.push(
      applied(
        `${feature}.backend.legacy_override_ignored`,
        "Phase 2 removes backend selection; Claude managed API is the only LLM backend."
      )
    );
  } else {
    table.push(skipped(`${feature}.backend.legacy_override_ignored`, "No legacy backend override configured."));
  }
  table.push(selected(`${feature}.backend.claude`, "Using Anthropic Claude through the managed LLM gateway."));

  const strict = requireLlm(env);
  table.push(
    strict
      ? selected(`${feature}.require.strict_llm`, "AI_REQUIRE_LLM=true requires Claude API availability.")
      : applied(`${feature}.require.fallback_allowed`, "Claude API may fall back to deterministic tools/official summaries.")
  );

  return {
    feature,
    backend: "claude",
    configuredValue: raw ? "unsupported" : null,
    requireLlm: strict,
    fallbackAllowed: fallbackAllowed(env),
    decisionTable: table,
  };
}

export function getAgentBackend(): AgentBackend {
  return "claude";
}

export function getConsultBackend(): ConsultBackend {
  return "claude";
}

export function explainAgentBackendDecision(env: NodeJS.ProcessEnv = process.env): AiBackendDecision<AgentBackend> {
  return decision("agent", env);
}

export function explainConsultBackendDecision(env: NodeJS.ProcessEnv = process.env): AiBackendDecision<ConsultBackend> {
  return decision("consult", env);
}

export function shouldRequireAgentLlm(_backend: AgentBackend = "claude", env: NodeJS.ProcessEnv = process.env): boolean {
  return requireLlm(env);
}

export function shouldRequireConsultLlm(_backend: ConsultBackend = "claude", env: NodeJS.ProcessEnv = process.env): boolean {
  return requireLlm(env);
}

export function getAiBackendDiagnostics(env: NodeJS.ProcessEnv = process.env): AiBackendDiagnostics {
  const hosted = isHostedRuntime(env);
  const claude = getClaudeGatewayDiagnostics(env);
  const agentDecision = explainAgentBackendDecision(env);
  const consultDecision = explainConsultBackendDecision(env);
  const issues: string[] = [];
  const warnings = legacyWarnings(env);

  if (!claude.apiKeyConfigured) {
    const message = requireLlm(env)
      ? "ANTHROPIC_API_KEY is not configured while AI_REQUIRE_LLM=true."
      : "ANTHROPIC_API_KEY is not configured; Claude calls will use deterministic fallback.";
    (requireLlm(env) ? issues : warnings).push(message);
  }

  const ready = claude.apiKeyConfigured || fallbackAllowed(env);

  return {
    runtime: {
      hosted,
      vercelEnv: env.VERCEL_ENV || null,
    },
    agent: {
      backend: "claude",
      configuredValue: agentDecision.configuredValue,
      requireLlm: agentDecision.requireLlm,
      fallbackAllowed: agentDecision.fallbackAllowed,
      ready,
      decisionTable: agentDecision.decisionTable,
    },
    consult: {
      backend: "claude",
      configuredValue: consultDecision.configuredValue,
      requireLlm: consultDecision.requireLlm,
      fallbackAllowed: consultDecision.fallbackAllowed,
      ready,
      decisionTable: consultDecision.decisionTable,
    },
    claude: {
      apiKeyConfigured: claude.apiKeyConfigured,
      model: claude.model,
      managedApi: true,
    },
    fallbackPolicy: {
      globalFallbackAllowed: fallbackAllowed(env),
    },
    issues,
    warnings,
  };
}
