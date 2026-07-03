import { isEnvFalse, isEnvTrue } from "@/lib/env";

const AGENT_BACKENDS = ["codex", "zai", "tool-fallback", "remote-bridge"] as const;
const CONSULT_BACKENDS = ["remote-bridge", "codex", "zai"] as const;

export type AgentBackend = (typeof AGENT_BACKENDS)[number];
export type ConsultBackend = (typeof CONSULT_BACKENDS)[number];
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

interface BackendSelection<T extends string> {
  backend: T;
  configuredValue: T | "unsupported" | null;
  decisionTable: AiBackendDecisionStep[];
}

export function isHostedRuntime(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.VERCEL === "1" || Boolean(env.VERCEL_ENV);
}

export function isRemoteBridgeConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  if (isEnvFalse(env.CODEX_REMOTE_BRIDGE_ENABLED)) return false;
  return Boolean(env.CODEX_REMOTE_BRIDGE_URL?.trim());
}

function configuredValue(value: string | undefined): string | null {
  return value?.trim() ? value.trim().toLowerCase() : null;
}

function safeConfiguredValue<T extends string>(value: string | null, allowed: readonly T[]): T | "unsupported" | null {
  if (!value) return null;
  return allowed.includes(value as T) ? (value as T) : "unsupported";
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

function selectAgentBackend(env: NodeJS.ProcessEnv): BackendSelection<AgentBackend> {
  const raw = configuredValue(env.AGENT_BACKEND);
  const configured = safeConfiguredValue(raw, AGENT_BACKENDS);
  const decisionTable: AiBackendDecisionStep[] = [];

  if (raw && configured === "unsupported") {
    decisionTable.push(
      applied(
        "agent.backend.unsupported_ignored",
        "Unsupported AGENT_BACKEND value is ignored; policy falls through to codex."
      )
    );
  }

  if (raw === "zai") {
    decisionTable.push(selected("agent.backend.explicit_zai", "AGENT_BACKEND=zai explicitly selects Z.ai."));
    return { backend: "zai", configuredValue: configured, decisionTable };
  }
  decisionTable.push(skipped("agent.backend.explicit_zai", "AGENT_BACKEND is not zai."));

  if (raw === "tool-fallback") {
    decisionTable.push(
      selected("agent.backend.explicit_tool_fallback", "AGENT_BACKEND=tool-fallback explicitly selects built-in tools.")
    );
    return { backend: "tool-fallback", configuredValue: configured, decisionTable };
  }
  decisionTable.push(skipped("agent.backend.explicit_tool_fallback", "AGENT_BACKEND is not tool-fallback."));

  if (raw === "remote-bridge") {
    decisionTable.push(
      selected("agent.backend.explicit_remote_bridge", "AGENT_BACKEND=remote-bridge explicitly selects the Codex bridge.")
    );
    return { backend: "remote-bridge", configuredValue: configured, decisionTable };
  }
  decisionTable.push(skipped("agent.backend.explicit_remote_bridge", "AGENT_BACKEND is not remote-bridge."));

  decisionTable.push(selected("agent.backend.default_codex", "No supported AGENT_BACKEND override; defaulting to codex."));
  return { backend: "codex", configuredValue: configured, decisionTable };
}

export function getAgentBackend(env: NodeJS.ProcessEnv = process.env): AgentBackend {
  return selectAgentBackend(env).backend;
}

export function isCodexServerlessEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (isEnvFalse(env.CODEX_SERVERLESS_ENABLED)) return false;
  return getAgentBackend(env) === "codex" || isEnvTrue(env.CODEX_SERVERLESS_ENABLED);
}

function selectConsultBackend(env: NodeJS.ProcessEnv): BackendSelection<ConsultBackend> {
  const raw = configuredValue(env.AI_CONSULT_BACKEND);
  const configured = safeConfiguredValue(raw, CONSULT_BACKENDS);
  const agentSelection = selectAgentBackend(env);
  const remoteBridgeConfigured = isRemoteBridgeConfigured(env);
  const decisionTable: AiBackendDecisionStep[] = [];

  if (raw && configured === "unsupported") {
    decisionTable.push(
      applied(
        "consult.backend.unsupported_ignored",
        "Unsupported AI_CONSULT_BACKEND value is ignored; policy continues with bridge/codex/zai fallbacks."
      )
    );
  }

  if (raw === "remote-bridge" || raw === "codex") {
    decisionTable.push(
      selected(
        `consult.backend.explicit_${raw.replace("-", "_")}`,
        `AI_CONSULT_BACKEND=${raw} explicitly selects the Consult backend.`
      )
    );
    return { backend: raw, configuredValue: configured, decisionTable };
  }
  decisionTable.push(
    skipped("consult.backend.explicit_remote_bridge_or_codex", "AI_CONSULT_BACKEND is not remote-bridge or codex.")
  );

  if (agentSelection.backend === "remote-bridge" || remoteBridgeConfigured) {
    decisionTable.push(
      selected(
        "consult.backend.inherit_remote_bridge",
        agentSelection.backend === "remote-bridge"
          ? "Agent backend is remote-bridge, so Consult follows the same bridge."
          : "CODEX_REMOTE_BRIDGE_URL is configured, so Consult uses the bridge by default."
      )
    );
    return { backend: "remote-bridge", configuredValue: configured, decisionTable };
  }
  decisionTable.push(
    skipped(
      "consult.backend.inherit_remote_bridge",
      "Neither Agent remote-bridge nor enabled CODEX_REMOTE_BRIDGE_URL is present."
    )
  );

  if (raw === "zai") {
    decisionTable.push(selected("consult.backend.explicit_zai", "AI_CONSULT_BACKEND=zai explicitly selects Z.ai."));
    return { backend: "zai", configuredValue: configured, decisionTable };
  }
  decisionTable.push(skipped("consult.backend.explicit_zai", "AI_CONSULT_BACKEND is not zai."));

  const codexConfigured =
    Boolean(env.CODEX_API_KEY || env.OPENAI_API_KEY) ||
    isEnvTrue(env.CODEX_SERVERLESS_ENABLED) ||
    !isHostedRuntime(env);

  if (agentSelection.backend === "codex" && codexConfigured) {
    decisionTable.push(
      selected(
        "consult.backend.codex_when_available",
        "Agent backend is codex and Codex is usable by API key, serverless flag, or local runtime."
      )
    );
    return { backend: "codex", configuredValue: configured, decisionTable };
  }
  decisionTable.push(
    skipped(
      "consult.backend.codex_when_available",
      "Codex is not selected or not configured for this Consult runtime."
    )
  );

  decisionTable.push(selected("consult.backend.default_zai", "No bridge or usable Codex path; defaulting Consult to Z.ai."));
  return { backend: "zai", configuredValue: configured, decisionTable };
}

export function getConsultBackend(env: NodeJS.ProcessEnv = process.env): ConsultBackend {
  return selectConsultBackend(env).backend;
}

function decideAgentLlmRequirement(
  configuredBackend: AgentBackend,
  env: NodeJS.ProcessEnv
): Pick<AiBackendDecision<AgentBackend>, "requireLlm" | "fallbackAllowed" | "decisionTable"> {
  const decisionTable: AiBackendDecisionStep[] = [];

  if (isEnvTrue(env.AI_ALLOW_LLM_FALLBACK)) {
    decisionTable.push(
      selected("agent.require.global_fallback_allowed", "AI_ALLOW_LLM_FALLBACK=true permits tool fallback.")
    );
    return { requireLlm: false, fallbackAllowed: true, decisionTable };
  }
  decisionTable.push(skipped("agent.require.global_fallback_allowed", "AI_ALLOW_LLM_FALLBACK is not true."));

  if (isEnvTrue(env.AI_AGENT_ALLOW_TOOL_FALLBACK)) {
    decisionTable.push(
      selected("agent.require.agent_fallback_allowed", "AI_AGENT_ALLOW_TOOL_FALLBACK=true permits tool fallback.")
    );
    return { requireLlm: false, fallbackAllowed: true, decisionTable };
  }
  decisionTable.push(skipped("agent.require.agent_fallback_allowed", "AI_AGENT_ALLOW_TOOL_FALLBACK is not true."));

  const strict =
    isEnvTrue(env.AI_REQUIRE_LLM) ||
    isEnvTrue(env.AI_AGENT_REQUIRE_LLM) ||
    configuredBackend === "remote-bridge";

  if (strict) {
    const reasons = [
      isEnvTrue(env.AI_REQUIRE_LLM) ? "AI_REQUIRE_LLM=true" : null,
      isEnvTrue(env.AI_AGENT_REQUIRE_LLM) ? "AI_AGENT_REQUIRE_LLM=true" : null,
      configuredBackend === "remote-bridge" ? "remote-bridge defaults to strict LLM mode" : null,
    ].filter(Boolean);
    decisionTable.push(selected("agent.require.strict_llm", reasons.join("; ")));
    return { requireLlm: true, fallbackAllowed: false, decisionTable };
  }

  decisionTable.push(applied("agent.require.not_strict", "No strict Agent LLM requirement is active."));
  return { requireLlm: false, fallbackAllowed: true, decisionTable };
}

function decideConsultLlmRequirement(
  consultBackend: ConsultBackend,
  env: NodeJS.ProcessEnv
): Pick<AiBackendDecision<ConsultBackend>, "requireLlm" | "fallbackAllowed" | "decisionTable"> {
  const decisionTable: AiBackendDecisionStep[] = [];

  if (isEnvTrue(env.AI_ALLOW_LLM_FALLBACK)) {
    decisionTable.push(
      selected("consult.require.global_fallback_allowed", "AI_ALLOW_LLM_FALLBACK=true permits official-summary fallback.")
    );
    return { requireLlm: false, fallbackAllowed: true, decisionTable };
  }
  decisionTable.push(skipped("consult.require.global_fallback_allowed", "AI_ALLOW_LLM_FALLBACK is not true."));

  if (isEnvTrue(env.AI_CONSULT_ALLOW_OFFICIAL_SUMMARY_FALLBACK)) {
    decisionTable.push(
      selected(
        "consult.require.summary_fallback_allowed",
        "AI_CONSULT_ALLOW_OFFICIAL_SUMMARY_FALLBACK=true permits official-summary fallback."
      )
    );
    return { requireLlm: false, fallbackAllowed: true, decisionTable };
  }
  decisionTable.push(
    skipped(
      "consult.require.summary_fallback_allowed",
      "AI_CONSULT_ALLOW_OFFICIAL_SUMMARY_FALLBACK is not true."
    )
  );

  const strict =
    isEnvTrue(env.AI_REQUIRE_LLM) ||
    isEnvTrue(env.AI_CONSULT_REQUIRE_LLM) ||
    consultBackend === "remote-bridge";

  if (strict) {
    const reasons = [
      isEnvTrue(env.AI_REQUIRE_LLM) ? "AI_REQUIRE_LLM=true" : null,
      isEnvTrue(env.AI_CONSULT_REQUIRE_LLM) ? "AI_CONSULT_REQUIRE_LLM=true" : null,
      consultBackend === "remote-bridge" ? "remote-bridge defaults to strict LLM mode" : null,
    ].filter(Boolean);
    decisionTable.push(selected("consult.require.strict_llm", reasons.join("; ")));
    return { requireLlm: true, fallbackAllowed: false, decisionTable };
  }

  decisionTable.push(applied("consult.require.not_strict", "No strict Consult LLM requirement is active."));
  return { requireLlm: false, fallbackAllowed: true, decisionTable };
}

export function explainAgentBackendDecision(env: NodeJS.ProcessEnv = process.env): AiBackendDecision<AgentBackend> {
  const selection = selectAgentBackend(env);
  const requirement = decideAgentLlmRequirement(selection.backend, env);
  return {
    feature: "agent",
    backend: selection.backend,
    configuredValue: selection.configuredValue,
    requireLlm: requirement.requireLlm,
    fallbackAllowed: requirement.fallbackAllowed,
    decisionTable: [...selection.decisionTable, ...requirement.decisionTable],
  };
}

export function explainConsultBackendDecision(env: NodeJS.ProcessEnv = process.env): AiBackendDecision<ConsultBackend> {
  const selection = selectConsultBackend(env);
  const requirement = decideConsultLlmRequirement(selection.backend, env);
  return {
    feature: "consult",
    backend: selection.backend,
    configuredValue: selection.configuredValue,
    requireLlm: requirement.requireLlm,
    fallbackAllowed: requirement.fallbackAllowed,
    decisionTable: [...selection.decisionTable, ...requirement.decisionTable],
  };
}

export function shouldRequireAgentLlm(
  configuredBackend: AgentBackend = getAgentBackend(),
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return decideAgentLlmRequirement(configuredBackend, env).requireLlm;
}

export function shouldRequireConsultLlm(
  consultBackend: ConsultBackend = getConsultBackend(),
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return decideConsultLlmRequirement(consultBackend, env).requireLlm;
}

export function getAiBackendDiagnostics(env: NodeJS.ProcessEnv = process.env): AiBackendDiagnostics {
  const hosted = isHostedRuntime(env);
  const agentDecision = explainAgentBackendDecision(env);
  const consultDecision = explainConsultBackendDecision(env);
  const agentBackend = agentDecision.backend;
  const consultBackend = consultDecision.backend;
  const rawAgentBackend = configuredValue(env.AGENT_BACKEND);
  const rawConsultBackend = configuredValue(env.AI_CONSULT_BACKEND);
  const remoteBridgeConfigured = isRemoteBridgeConfigured(env);
  const remoteBridgeEnabled = !isEnvFalse(env.CODEX_REMOTE_BRIDGE_ENABLED);
  const codexKeyConfigured = codexApiKeyConfigured(env);
  const codexServerless = isCodexServerlessEnabled(env);
  const codexRuntimeReady = !hosted || codexKeyConfigured;
  const zAiReady = zaiConfigured(env);
  const agentRequiresLlm = agentDecision.requireLlm;
  const consultRequiresLlm = consultDecision.requireLlm;
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
      configuredValue: agentDecision.configuredValue,
      requireLlm: agentDecision.requireLlm,
      fallbackAllowed: agentDecision.fallbackAllowed,
      ready: agentBackend === "tool-fallback" || (agentCodexReady && agentZaiReady && agentBridgeReady),
      decisionTable: agentDecision.decisionTable,
    },
    consult: {
      backend: consultBackend,
      configuredValue: consultDecision.configuredValue,
      requireLlm: consultDecision.requireLlm,
      fallbackAllowed: consultDecision.fallbackAllowed,
      ready: consultCodexReady && consultZaiReady && consultBridgeReady,
      decisionTable: consultDecision.decisionTable,
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
