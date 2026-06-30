import type { Lang } from "@/lib/i18n/translations";

export interface RemoteCodexBridgeOptions {
  question: string;
  lang?: Lang;
  history?: { role: string; content: string }[];
  timeoutMs: number;
  requestIp?: string;
}

export interface RemoteCodexBridgeResult {
  answer: string;
  backend: string;
  codexMode?: string;
  steps: any[];
  toolResults: any[];
  iterations: number;
  durationMs?: number;
}

function getRemoteBridgeUrl(): string {
  return process.env.CODEX_REMOTE_BRIDGE_URL?.trim() || "";
}

export function isRemoteCodexBridgeEnabled(): boolean {
  if (process.env.CODEX_REMOTE_BRIDGE_ENABLED === "false") return false;
  return Boolean(getRemoteBridgeUrl());
}

export async function runRemoteCodexBridge({
  question,
  lang,
  history,
  timeoutMs,
  requestIp,
}: RemoteCodexBridgeOptions): Promise<RemoteCodexBridgeResult> {
  const url = getRemoteBridgeUrl();
  if (!url) throw new Error("CODEX_REMOTE_BRIDGE_URL is not configured");
  if (!url.startsWith("https://") && process.env.NODE_ENV === "production") {
    throw new Error("CODEX_REMOTE_BRIDGE_URL must use https in production");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

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
      body: JSON.stringify({ question, lang, history }),
    });

    const text = await res.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: text };
    }

    if (!res.ok) {
      throw new Error(data.error || `Remote Codex bridge failed with status ${res.status}`);
    }

    return {
      answer: String(data.answer || ""),
      backend: String(data.backend || "codex-cli-remote-bridge"),
      codexMode: typeof data.codexMode === "string" ? data.codexMode : undefined,
      steps: Array.isArray(data.steps) ? data.steps : [],
      toolResults: Array.isArray(data.toolResults) ? data.toolResults : [],
      iterations: typeof data.iterations === "number" ? data.iterations : 1,
      durationMs: typeof data.durationMs === "number" ? data.durationMs : Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timeout);
  }
}
