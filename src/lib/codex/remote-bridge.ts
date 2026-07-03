import type { Lang } from "@/lib/i18n/translations";
import { isEnvFalse } from "@/lib/env";
import type { AgentStep } from "@/lib/agent/agent";
import type { ToolResult } from "@/lib/agent/tools";

export interface RemoteCodexBridgeOptions {
  question: string;
  lang?: Lang;
  history?: { role: string; content: string }[];
  timeoutMs: number;
  requestIp?: string;
  promptMode?: "public-agent" | "raw";
}

export interface RemoteCodexBridgeResult {
  answer: string;
  backend: string;
  codexMode?: string;
  steps: AgentStep[];
  toolResults: ToolResult[];
  iterations: number;
  durationMs?: number;
}

export interface RemoteCodexBridgeStats {
  totalAttempts: number;
  totalSuccesses: number;
  totalFailures: number;
  consecutiveFailures: number;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastDurationMs: number | null;
  lastStatus: number | null;
  lastErrorType: string | null;
  lastErrorMessage: string | null;
}

export interface SafeRemoteBridgeUrl {
  protocol: string | null;
  host: string | null;
  pathname: string | null;
  endpoint: string | null;
  isHttps: boolean;
  isLocalhost: boolean;
  valid: boolean;
}

export interface RemoteCodexBridgeDiagnostics {
  enabled: boolean;
  configured: boolean;
  url: SafeRemoteBridgeUrl;
  tokenConfigured: boolean;
  timeoutMs: number;
  productionRequiresHttps: boolean;
  issue: string | null;
  stats: RemoteCodexBridgeStats;
}

const bridgeStats: RemoteCodexBridgeStats = {
  totalAttempts: 0,
  totalSuccesses: 0,
  totalFailures: 0,
  consecutiveFailures: 0,
  lastAttemptAt: null,
  lastSuccessAt: null,
  lastFailureAt: null,
  lastDurationMs: null,
  lastStatus: null,
  lastErrorType: null,
  lastErrorMessage: null,
};

function getRemoteBridgeUrl(): string {
  return process.env.CODEX_REMOTE_BRIDGE_URL?.trim() || "";
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function safeRemoteBridgeUrl(rawUrl: string): SafeRemoteBridgeUrl {
  if (!rawUrl) {
    return {
      protocol: null,
      host: null,
      pathname: null,
      endpoint: null,
      isHttps: false,
      isLocalhost: false,
      valid: false,
    };
  }

  try {
    const url = new URL(rawUrl);
    const protocol = url.protocol.replace(/:$/, "");
    const host = url.host;
    const pathname = url.pathname || "/";
    const hostname = url.hostname.toLowerCase();
    return {
      protocol,
      host,
      pathname,
      endpoint: `${protocol}://${host}${pathname}`,
      isHttps: protocol === "https",
      isLocalhost: hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1",
      valid: true,
    };
  } catch {
    return {
      protocol: null,
      host: null,
      pathname: null,
      endpoint: null,
      isHttps: false,
      isLocalhost: false,
      valid: false,
    };
  }
}

function copyStats(): RemoteCodexBridgeStats {
  return { ...bridgeStats };
}

function markAttempt() {
  bridgeStats.totalAttempts += 1;
  bridgeStats.lastAttemptAt = new Date().toISOString();
  bridgeStats.lastStatus = null;
  bridgeStats.lastErrorType = null;
  bridgeStats.lastErrorMessage = null;
}

function markSuccess(durationMs: number, status: number) {
  bridgeStats.totalSuccesses += 1;
  bridgeStats.consecutiveFailures = 0;
  bridgeStats.lastSuccessAt = new Date().toISOString();
  bridgeStats.lastDurationMs = Math.round(durationMs);
  bridgeStats.lastStatus = status;
}

function classifyBridgeError(error: unknown, status?: number): string {
  if (status) return `http_${status}`;
  if (typeof DOMException !== "undefined" && error instanceof DOMException && error.name === "AbortError") {
    return "timeout";
  }
  if (error instanceof Error && error.name === "AbortError") return "timeout";
  return "network_or_bridge_error";
}

function markFailure(error: unknown, durationMs: number, status?: number) {
  bridgeStats.totalFailures += 1;
  bridgeStats.consecutiveFailures += 1;
  bridgeStats.lastFailureAt = new Date().toISOString();
  bridgeStats.lastDurationMs = Math.round(durationMs);
  bridgeStats.lastStatus = status || null;
  bridgeStats.lastErrorType = classifyBridgeError(error, status);
  bridgeStats.lastErrorMessage = error instanceof Error ? error.message.slice(0, 240) : String(error).slice(0, 240);
}

function asAgentSteps(value: unknown): AgentStep[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is AgentStep => {
    if (!isRecord(item)) return false;
    return typeof item.type === "string" && typeof item.content === "string";
  });
}

function asToolResults(value: unknown): ToolResult[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is ToolResult => {
    if (!isRecord(item)) return false;
    return (
      typeof item.tool === "string" &&
      typeof item.summary === "string" &&
      typeof item.success === "boolean" &&
      isRecord(item.args)
    );
  });
}

export function isRemoteCodexBridgeEnabled(): boolean {
  if (isEnvFalse(process.env.CODEX_REMOTE_BRIDGE_ENABLED)) return false;
  return Boolean(getRemoteBridgeUrl());
}

export function getRemoteCodexBridgeDiagnostics(): RemoteCodexBridgeDiagnostics {
  const rawUrl = getRemoteBridgeUrl();
  const url = safeRemoteBridgeUrl(rawUrl);
  const productionRequiresHttps = process.env.NODE_ENV === "production";
  const configured = Boolean(rawUrl);
  let issue: string | null = null;

  if (configured && !url.valid) {
    issue = "CODEX_REMOTE_BRIDGE_URL is not a valid URL";
  } else if (configured && productionRequiresHttps && !url.isHttps) {
    issue = "CODEX_REMOTE_BRIDGE_URL must use https in production";
  }

  return {
    enabled: isRemoteCodexBridgeEnabled(),
    configured,
    url,
    tokenConfigured: Boolean(process.env.CODEX_REMOTE_BRIDGE_TOKEN?.trim()),
    timeoutMs: parsePositiveInt(process.env.CODEX_REMOTE_BRIDGE_TIMEOUT_MS, 52_000),
    productionRequiresHttps,
    issue,
    stats: copyStats(),
  };
}

export async function runRemoteCodexBridge({
  question,
  lang,
  history,
  timeoutMs,
  requestIp,
  promptMode,
}: RemoteCodexBridgeOptions): Promise<RemoteCodexBridgeResult> {
  const url = getRemoteBridgeUrl();
  if (!url) throw new Error("CODEX_REMOTE_BRIDGE_URL is not configured");
  if (!url.startsWith("https://") && process.env.NODE_ENV === "production") {
    throw new Error("CODEX_REMOTE_BRIDGE_URL must use https in production");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  let failureRecorded = false;
  markAttempt();

  try {
    const token = process.env.CODEX_REMOTE_BRIDGE_TOKEN?.trim();
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        ...(token ? { "x-kaxi-codex-bridge-token": token } : {}),
        ...(requestIp ? { "x-forwarded-for": requestIp } : {}),
      },
      body: JSON.stringify({ question, lang, history, promptMode }),
    });

    const text = await res.text();
    let data: Record<string, unknown> = {};
    try {
      const parsed = text ? JSON.parse(text) : {};
      data = isRecord(parsed) ? parsed : {};
    } catch {
      data = { error: text };
    }

    if (!res.ok) {
      const errorText = typeof data.error === "string" ? data.error : `Remote Codex bridge failed with status ${res.status}`;
      const error = new Error(errorText);
      markFailure(error, Date.now() - startedAt, res.status);
      failureRecorded = true;
      throw error;
    }

    markSuccess(Date.now() - startedAt, res.status);
    return {
      answer: String(data.answer || ""),
      backend: String(data.backend || "codex-cli-remote-bridge"),
      codexMode: typeof data.codexMode === "string" ? data.codexMode : undefined,
      steps: asAgentSteps(data.steps),
      toolResults: asToolResults(data.toolResults),
      iterations: typeof data.iterations === "number" ? data.iterations : 1,
      durationMs: typeof data.durationMs === "number" ? data.durationMs : Date.now() - startedAt,
    };
  } catch (error) {
    if (!failureRecorded) markFailure(error, Date.now() - startedAt);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
