import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Lang } from "@/lib/i18n/translations";

const require = createRequire(import.meta.url);

interface CodexExecOptions {
  question: string;
  lang?: Lang;
  history?: { role: string; content: string }[];
  timeoutMs: number;
}

export interface CodexExecResult {
  answer: string;
  stdout: string;
  stderr: string;
  durationMs: number;
  mode: CodexRunMode;
}

type CodexRunMode = "local-auth" | "api-key";

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}\n...[truncated]` : value;
}

function extractStdoutAnswer(stdout: string): string {
  const ignored = new Set(["codex", "tokens used"]);
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !ignored.has(line.toLowerCase()))
    .filter((line) => !line.startsWith("OpenAI Codex v"))
    .filter((line) => !line.startsWith("--------"))
    .filter((line) => !line.startsWith("workdir:"))
    .filter((line) => !line.startsWith("model:"))
    .filter((line) => !line.startsWith("provider:"))
    .filter((line) => !line.startsWith("approval:"))
    .filter((line) => !line.startsWith("sandbox:"))
    .filter((line) => !line.startsWith("reasoning "))
    .filter((line) => !line.startsWith("session id:"))
    .filter((line) => !/^\d{1,3}(,\d{3})*$/.test(line));

  return lines.at(-1) || "";
}

function runCommand(
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv; timeoutMs: number; maxBuffer: number }
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const append = (kind: "stdout" | "stderr", chunk: Buffer) => {
      if (kind === "stdout") stdout += chunk.toString("utf8");
      else stderr += chunk.toString("utf8");

      if (stdout.length + stderr.length > options.maxBuffer) {
        child.kill("SIGTERM");
        finish(() => reject(new Error("Codex CLI output exceeded max buffer")));
      }
    };

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, options.timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => append("stdout", chunk));
    child.stderr.on("data", (chunk: Buffer) => append("stderr", chunk));
    child.on("error", (error) => finish(() => reject(error)));
    child.on("close", (code, signal) => {
      finish(() => {
        if (code === 0) {
          resolve({ stdout, stderr });
          return;
        }

        const suffix = timedOut
          ? `timed out after ${options.timeoutMs}ms`
          : `exited with code ${code ?? "null"}${signal ? ` signal ${signal}` : ""}`;
        reject(new Error(`Codex CLI ${suffix}: ${truncate(stderr || stdout, 1000)}`));
      });
    });
  });
}

function buildPrompt({ question, lang, history = [] }: Omit<CodexExecOptions, "timeoutMs">): string {
  const recentHistory = history
    .slice(-4)
    .map((item) => `${item.role === "user" ? "User" : "Assistant"}: ${item.content}`)
    .join("\n");

  return `You are running as an experimental Codex CLI bridge for K-Bridge Gateway.

Hard constraints:
- Treat this environment as read-only and ephemeral.
- Do not modify files, install packages, commit, push, deploy, or run long-running servers.
- Answer the user's K-Bridge Gateway question directly and concisely.
- If codebase inspection is needed, only use read-only commands.
- Reply in ${lang || "ko"} unless the user asks otherwise.

Recent conversation:
${recentHistory || "(none)"}

User request:
${question}`;
}

export function isCodexServerlessEnabled(): boolean {
  if (process.env.CODEX_SERVERLESS_ENABLED === "false") return false;
  return getAgentBackend() === "codex" || process.env.CODEX_SERVERLESS_ENABLED === "true";
}

export function getAgentBackend(): "codex" | "zai" | "tool-fallback" {
  const configured = process.env.AGENT_BACKEND?.trim().toLowerCase();
  if (configured === "zai") return "zai";
  if (configured === "tool-fallback") return "tool-fallback";
  return "codex";
}

export function shouldRequireAdminForCodexAgent(): boolean {
  return process.env.CODEX_AGENT_REQUIRE_ADMIN === "true";
}

function isHostedRuntime(): boolean {
  return process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);
}

function getLocalCodexHome(): string {
  return process.env.CODEX_LOCAL_HOME?.trim() || process.env.CODEX_HOME?.trim() || join(homedir(), ".codex");
}

export function getCodexRunMode(): CodexRunMode {
  const configured = process.env.CODEX_AUTH_MODE?.trim().toLowerCase();
  if (configured === "api-key") return "api-key";

  if (configured === "local") {
    if (isHostedRuntime()) {
      throw new Error("CODEX_AUTH_MODE=local cannot run on Vercel; set CODEX_API_KEY instead");
    }
    return "local-auth";
  }

  return isHostedRuntime() ? "api-key" : "local-auth";
}

export async function runCodexServerless({
  question,
  lang,
  history,
  timeoutMs,
}: CodexExecOptions): Promise<CodexExecResult> {
  const mode = getCodexRunMode();
  const apiKey = process.env.CODEX_API_KEY || process.env.OPENAI_API_KEY;
  if (mode === "api-key" && !apiKey) {
    throw new Error("CODEX_API_KEY or OPENAI_API_KEY is not configured");
  }

  const runId = randomUUID();
  const codexHome = mode === "local-auth" ? getLocalCodexHome() : join("/tmp", `codex-home-${runId}`);
  const outputFile = join("/tmp", `codex-output-${runId}.txt`);
  await mkdir(codexHome, { recursive: true });

  const prompt = buildPrompt({ question, lang, history });
  const command = mode === "local-auth" ? process.env.CODEX_CLI_PATH?.trim() || "codex" : process.execPath;
  const execArgs = [
    "exec",
    "--ignore-rules",
    "--skip-git-repo-check",
    "--ephemeral",
    "--sandbox",
    "read-only",
    "-c",
    'approval_policy="never"',
    "-c",
    "shell_environment_policy.inherit=none",
    "--cd",
    process.cwd(),
    "--output-last-message",
    outputFile,
  ];

  if (process.env.CODEX_USE_USER_CONFIG !== "true") {
    execArgs.splice(1, 0, "--ignore-user-config");
  }

  const args = mode === "api-key" ? [require.resolve("@openai/codex/bin/codex.js"), ...execArgs] : execArgs;

  if (process.env.CODEX_MODEL?.trim()) {
    args.push("--model", process.env.CODEX_MODEL.trim());
  }

  args.push(prompt);

  const startedAt = Date.now();
  try {
    const { stdout, stderr } = await runCommand(command, args, {
      cwd: process.cwd(),
      timeoutMs,
      maxBuffer: 1024 * 1024,
      env: {
        PATH: process.env.PATH || "",
        HOME: mode === "local-auth" ? process.env.HOME || homedir() : "/tmp",
        TMPDIR: "/tmp",
        CODEX_HOME: codexHome,
        ...(mode === "api-key" && apiKey ? { CODEX_API_KEY: apiKey, OPENAI_API_KEY: apiKey } : {}),
        NODE_ENV: process.env.NODE_ENV || "production",
      },
    });

    let answer = "";
    try {
      answer = (await readFile(outputFile, "utf8")).trim();
    } catch {
      answer = "";
    }
    if (!answer) answer = extractStdoutAnswer(stdout) || stdout.trim();

    return {
      answer: answer || "Codex completed without a final message.",
      stdout: truncate(stdout, 20_000),
      stderr: truncate(stderr, 20_000),
      durationMs: Date.now() - startedAt,
      mode,
    };
  } finally {
    if (mode === "api-key") {
      await rm(codexHome, { recursive: true, force: true }).catch(() => undefined);
    }
    await rm(outputFile, { force: true }).catch(() => undefined);
  }
}
