import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { promisify } from "node:util";
import type { Lang } from "@/lib/i18n/translations";

const execFileAsync = promisify(execFile);
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
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}\n...[truncated]` : value;
}

function buildPrompt({ question, lang, history = [] }: Omit<CodexExecOptions, "timeoutMs">): string {
  const recentHistory = history
    .slice(-4)
    .map((item) => `${item.role === "user" ? "User" : "Assistant"}: ${item.content}`)
    .join("\n");

  return `You are running as an experimental Codex CLI bridge inside a Vercel Serverless Function.

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

export async function runCodexServerless({
  question,
  lang,
  history,
  timeoutMs,
}: CodexExecOptions): Promise<CodexExecResult> {
  const apiKey = process.env.CODEX_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("CODEX_API_KEY or OPENAI_API_KEY is not configured");
  }

  const codexBin = require.resolve("@openai/codex/bin/codex.js");
  const runId = randomUUID();
  const codexHome = join("/tmp", `codex-home-${runId}`);
  const outputFile = join("/tmp", `codex-output-${runId}.txt`);
  await mkdir(codexHome, { recursive: true });

  const prompt = buildPrompt({ question, lang, history });
  const args = [
    codexBin,
    "exec",
    "--ignore-user-config",
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

  if (process.env.CODEX_MODEL?.trim()) {
    args.push("--model", process.env.CODEX_MODEL.trim());
  }

  args.push(prompt);

  const startedAt = Date.now();
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, args, {
      cwd: process.cwd(),
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024,
      env: {
        PATH: process.env.PATH || "",
        HOME: "/tmp",
        TMPDIR: "/tmp",
        CODEX_HOME: codexHome,
        CODEX_API_KEY: apiKey,
        OPENAI_API_KEY: apiKey,
        NODE_ENV: process.env.NODE_ENV || "production",
      },
    });

    let answer = "";
    try {
      answer = (await readFile(outputFile, "utf8")).trim();
    } catch {
      answer = stdout.trim();
    }

    return {
      answer: answer || "Codex completed without a final message.",
      stdout: truncate(stdout, 20_000),
      stderr: truncate(stderr, 20_000),
      durationMs: Date.now() - startedAt,
    };
  } finally {
    await rm(codexHome, { recursive: true, force: true }).catch(() => undefined);
    await rm(outputFile, { force: true }).catch(() => undefined);
  }
}
