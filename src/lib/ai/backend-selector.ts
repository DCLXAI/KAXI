import { isEnvFalse, isEnvTrue } from "@/lib/env";

export type AgentBackend = "codex" | "zai" | "tool-fallback" | "remote-bridge";
export type ConsultBackend = "remote-bridge" | "codex" | "zai";

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
