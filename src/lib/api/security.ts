import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { timingSafeEqual } from "crypto";

type JsonBody = Record<string, unknown>;

interface RateLimitRule {
  key: string;
  limit: number;
  windowMs: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const LANGS = new Set(["ko", "vi", "mn", "en"]);
const SUSPICIOUS_INPUT_PATTERNS = [
  /<script\b/i,
  /javascript:/i,
  /\bon\w+\s*=/i,
  /\.\.\//,
  /(?:union\s+select|drop\s+table|insert\s+into|delete\s+from)/i,
];

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  if (process.env.NEXTAUTH_SECRET) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token?.role === "admin") return null;
  }

  const expected = process.env.ADMIN_API_KEY;
  if (!expected) {
    return jsonError("Admin credentials are not configured", 503);
  }

  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const headerKey = req.headers.get("x-admin-key");
  const provided = bearer || headerKey || "";

  if (!provided || !safeEqual(provided, expected)) {
    return jsonError("Unauthorized", 401);
  }

  return null;
}

export function rateLimit(
  req: NextRequest,
  { key, limit, windowMs }: RateLimitRule
): NextResponse | null {
  if (!Number.isFinite(limit) || limit <= 0) return null;

  const now = Date.now();
  const bucketKey = `${key}:${getClientIp(req)}`;
  const bucket = buckets.get(bucketKey);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return null;
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return NextResponse.json(
      { error: "Rate limit exceeded", resetAt: new Date(bucket.resetAt).toISOString() },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((bucket.resetAt - now) / 1000)) },
      }
    );
  }

  return null;
}

export function consumeDailyQuota(
  req: NextRequest,
  key: string,
  limit: number
): NextResponse | null {
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setUTCHours(24, 0, 0, 0);
  return rateLimit(req, {
    key: `quota:${key}:${now.toISOString().slice(0, 10)}`,
    limit,
    windowMs: nextMidnight.getTime() - now.getTime(),
  });
}

export function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export function parseLimit(value: string | undefined, fallback: number): number {
  const normalized = value?.trim().toLowerCase();
  if (normalized && ["0", "false", "off", "none", "unlimited", "disabled"].includes(normalized)) {
    return 0;
  }

  return parsePositiveInt(value, fallback);
}

export function sanitizeAiBody(
  body: JsonBody,
  options: {
    maxQuestionLength: number;
    maxHistoryItems: number;
    maxHistoryItemLength: number;
    allowedModes?: string[];
  }
) {
  const question = body.question;
  if (typeof question !== "string" || !question.trim()) {
    return { error: jsonError("Missing question", 400) };
  }
  if (question.length > options.maxQuestionLength) {
    return { error: jsonError(`Question is too long (${options.maxQuestionLength} chars max)`, 413) };
  }
  if (SUSPICIOUS_INPUT_PATTERNS.some((pattern) => pattern.test(question))) {
    return { error: jsonError("Suspicious input rejected", 400) };
  }

  const lang = typeof body.lang === "string" && LANGS.has(body.lang) ? body.lang : "ko";
  const rawHistory = Array.isArray(body.history) ? body.history : [];
  const history = rawHistory.slice(-options.maxHistoryItems).map((item) => {
    const record = item && typeof item === "object" ? (item as JsonBody) : {};
    const role = record.role === "user" ? "user" : "assistant";
    const content =
      typeof record.content === "string"
        ? record.content.slice(0, options.maxHistoryItemLength)
        : "";
    return { role, content };
  }).filter((item) => item.content);

  const mode =
    typeof body.mode === "string" && options.allowedModes?.includes(body.mode)
      ? body.mode
      : undefined;

  return {
    value: {
      question: question.trim(),
      lang,
      history,
      mode,
      leadId: typeof body.leadId === "string" ? body.leadId.slice(0, 128) : null,
    },
  };
}

export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
  });

  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
