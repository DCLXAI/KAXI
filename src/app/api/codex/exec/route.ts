import { NextRequest, NextResponse } from "next/server";
import type { Lang } from "@/lib/i18n/translations";
import {
  jsonError,
  parsePositiveInt,
  rateLimit,
  requireAdmin,
} from "@/lib/api/security";
import {
  isCodexServerlessEnabled,
  runCodexServerless,
} from "@/lib/codex/serverless";

export const runtime = "nodejs";
export const maxDuration = 60;

const LANGS = new Set(["ko", "vi", "mn", "en"]);

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  if (!isCodexServerlessEnabled()) {
    return jsonError("Codex serverless bridge is disabled", 503);
  }

  const limited = await rateLimit(req, {
    key: "codex:exec",
    limit: parsePositiveInt(process.env.CODEX_EXEC_RATE_LIMIT, 3),
    windowMs: 60 * 1000,
  });
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) return jsonError("Missing prompt", 400);

  const maxChars = parsePositiveInt(process.env.CODEX_EXEC_MAX_CHARS, 4000);
  if (prompt.length > maxChars) {
    return jsonError(`Prompt is too long (${maxChars} chars max)`, 413);
  }

  const lang = typeof body.lang === "string" && LANGS.has(body.lang) ? (body.lang as Lang) : "ko";
  const result = await runCodexServerless({
    question: prompt,
    lang,
    timeoutMs: parsePositiveInt(process.env.CODEX_EXEC_TIMEOUT_MS, 45_000),
  });

  return NextResponse.json({
    answer: result.answer,
    codexMode: result.mode,
    stdout: result.stdout,
    stderr: result.stderr,
    durationMs: result.durationMs,
  });
}
