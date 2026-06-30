import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import { runCodexServerless } from "../src/lib/codex/serverless";

type Lang = "ko" | "vi" | "mn" | "en";

const HOST = process.env.CODEX_BRIDGE_HOST?.trim() || "127.0.0.1";
const PORT = Number(process.env.CODEX_BRIDGE_PORT || 8787);
const MAX_BODY_BYTES = Number(process.env.CODEX_BRIDGE_MAX_BODY_BYTES || 32_000);
const MAX_QUESTION_CHARS = Number(process.env.CODEX_BRIDGE_MAX_CHARS || 4_000);
const RATE_LIMIT = parseLimit(process.env.CODEX_BRIDGE_RATE_LIMIT, 6);
const RATE_WINDOW_MS = 60_000;
const REQUIRED_TOKEN = process.env.CODEX_BRIDGE_TOKEN?.trim();
const PREVENT_SLEEP = process.env.CODEX_BRIDGE_PREVENT_SLEEP === "true" ||
  process.argv.includes("--prevent-sleep");

process.env.CODEX_AUTH_MODE ||= "local";
process.env.CODEX_USE_USER_CONFIG ||= "false";

const allowedOrigins = new Set(
  (process.env.CODEX_BRIDGE_ALLOWED_ORIGINS || [
    "https://kaxi.vercel.app",
    "https://kaxi-sunsus-projects.vercel.app",
    "https://kaxi-git-main-sunsus-projects.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ].join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

const rateBuckets = new Map<string, { count: number; resetAt: number }>();
let caffeinateProcess: ChildProcess | null = null;

function startSleepGuard() {
  if (!PREVENT_SLEEP) return;
  if (process.platform !== "darwin") {
    console.warn("[codex-local-bridge] sleep guard is only supported on macOS");
    return;
  }

  caffeinateProcess = spawn("caffeinate", ["-dimsu", "-w", String(process.pid)], {
    stdio: "ignore",
  });
  caffeinateProcess.on("error", (error) => {
    console.warn("[codex-local-bridge] caffeinate failed:", error.message);
  });
}

function stopSleepGuard() {
  caffeinateProcess?.kill("SIGTERM");
  caffeinateProcess = null;
}

function parseLimit(value: string | undefined, fallback: number): number {
  const normalized = value?.trim().toLowerCase();
  if (normalized && ["0", "false", "off", "none", "unlimited", "disabled"].includes(normalized)) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function applyCors(req: IncomingMessage, res: ServerResponse): boolean {
  const origin = req.headers.origin;
  if (!origin) return true;
  if (!allowedOrigins.has(origin)) return false;

  res.setHeader("access-control-allow-origin", origin);
  res.setHeader("vary", "Origin");
  res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type,x-kaxi-codex-bridge-token");
  res.setHeader("access-control-allow-private-network", "true");
  res.setHeader("access-control-max-age", "600");
  return true;
}

function clientKey(req: IncomingMessage): string {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }
  return req.socket.remoteAddress || "unknown";
}

function checkRateLimit(req: IncomingMessage): boolean {
  if (!Number.isFinite(RATE_LIMIT) || RATE_LIMIT <= 0) return true;

  const key = clientKey(req);
  const now = Date.now();
  const current = rateBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  current.count += 1;
  return current.count <= RATE_LIMIT;
}

function isAuthorized(req: IncomingMessage): boolean {
  if (!REQUIRED_TOKEN) return true;
  return req.headers["x-kaxi-codex-bridge-token"] === REQUIRED_TOKEN;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) {
        req.destroy(new Error("Request body too large"));
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function parseLang(value: unknown): Lang {
  return value === "vi" || value === "mn" || value === "en" ? value : "ko";
}

function parseHistory(value: unknown): { role: string; content: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(-6)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const role = "role" in item && item.role === "user" ? "user" : "assistant";
      const content = "content" in item && typeof item.content === "string" ? item.content.slice(0, 1_200) : "";
      return content ? { role, content } : null;
    })
    .filter((item): item is { role: string; content: string } => Boolean(item));
}

const server = createServer(async (req, res) => {
  if (!applyCors(req, res)) {
    json(res, 403, { error: "Origin is not allowed" });
    return;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const path = new URL(req.url || "/", `http://${HOST}:${PORT}`).pathname;

  if (req.method === "GET" && path === "/health") {
    json(res, 200, {
      ok: true,
      service: "kaxi-codex-local-bridge",
      backend: "codex-cli-local-bridge",
      host: HOST,
      port: PORT,
    });
    return;
  }

  if (req.method !== "POST" || (path !== "/api/ai/agent" && path !== "/agent")) {
    json(res, 404, { error: "Not found" });
    return;
  }

  if (!isAuthorized(req)) {
    json(res, 401, { error: "Missing or invalid bridge token" });
    return;
  }

  if (!checkRateLimit(req)) {
    json(res, 429, { error: "Local bridge rate limit exceeded" });
    return;
  }

  try {
    const rawBody = await readBody(req);
    const body = rawBody ? JSON.parse(rawBody) : {};
    const question = typeof body.question === "string" ? body.question.trim() : "";
    if (!question) {
      json(res, 400, { error: "Missing question" });
      return;
    }
    if (question.length > MAX_QUESTION_CHARS) {
      json(res, 413, { error: `Question is too long (${MAX_QUESTION_CHARS} chars max)` });
      return;
    }

    const result = await runCodexServerless({
      question,
      lang: parseLang(body.lang),
      history: parseHistory(body.history),
      timeoutMs: Number(process.env.CODEX_EXEC_TIMEOUT_MS || 60_000),
    });

    json(res, 200, {
      answer: result.answer,
      backend: "codex-cli-local-bridge",
      codexMode: result.mode,
      steps: [
        {
          type: "final_answer",
          content: result.answer,
          timestamp: Date.now(),
        },
      ],
      toolResults: [],
      iterations: 1,
      durationMs: result.durationMs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown local bridge error";
    console.error("[codex-local-bridge]", message);
    json(res, 502, { error: message });
  }
});

server.listen(PORT, HOST, () => {
  startSleepGuard();
  console.log(`[codex-local-bridge] listening on http://${HOST}:${PORT}`);
  if (PREVENT_SLEEP) console.log("[codex-local-bridge] macOS sleep guard enabled via caffeinate");
  console.log("[codex-local-bridge] open https://kaxi.vercel.app/agent on this Mac to use local Codex CLI");
});

process.on("SIGINT", () => {
  stopSleepGuard();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopSleepGuard();
  process.exit(0);
});
