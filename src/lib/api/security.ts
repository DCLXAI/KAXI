import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { createHash, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";

type JsonBody = Record<string, unknown>;

interface RateLimitRule {
  key: string;
  limit: number;
  windowMs: number;
}

type AdminRole = "owner" | "admin" | "viewer";

export interface AdminContext {
  actor: string;
  role: AdminRole;
  authType: "session" | "api-key";
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

function roleAllowed(role: AdminRole, allowed: AdminRole[]): boolean {
  if (role === "owner") return true;
  return allowed.includes(role);
}

export async function getAdminContext(req: NextRequest): Promise<AdminContext | null> {
  if (process.env.NEXTAUTH_SECRET) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token?.role === "owner" || token?.role === "admin" || token?.role === "viewer") {
      return {
        actor: token.email || token.sub || "session-admin",
        role: token.role,
        authType: "session",
      };
    }
  }

  const expected = process.env.ADMIN_API_KEY;
  if (!expected) {
    return null;
  }

  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const headerKey = req.headers.get("x-admin-key");
  const provided = bearer || headerKey || "";

  if (!provided || !safeEqual(provided, expected)) {
    return null;
  }

  return {
    actor: "admin-api-key",
    role: "owner",
    authType: "api-key",
  };
}

export async function requireAdmin(
  req: NextRequest,
  options: { roles?: AdminRole[] } = {}
): Promise<NextResponse | null> {
  const context = await getAdminContext(req);
  if (!context) {
    if (!process.env.ADMIN_API_KEY && !process.env.NEXTAUTH_SECRET) {
      return jsonError("Admin credentials are not configured", 503);
    }
    return jsonError("Unauthorized", 401);
  }

  const allowed = options.roles || ["owner", "admin"];
  if (!roleAllowed(context.role, allowed)) return jsonError("Forbidden", 403);

  return null;
}

function rateBucketKey(key: string, ip: string): string {
  const digest = createHash("sha256").update(ip).digest("hex").slice(0, 32);
  return `rl:${key}:${digest}`;
}

function canUseDatabaseRateLimit(): boolean {
  const backend = (process.env.RATE_LIMIT_BACKEND || "auto").toLowerCase();
  if (backend === "memory") return false;
  if (backend === "database") return true;

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) return false;

  const hostedRuntime = process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);
  return !(hostedRuntime && databaseUrl.startsWith("file:"));
}

function memoryRateLimit(
  req: NextRequest,
  { key, limit, windowMs }: RateLimitRule
): NextResponse | null {
  if (!Number.isFinite(limit) || limit <= 0) return null;

  const now = Date.now();
  const bucketKey = rateBucketKey(key, getClientIp(req));
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

async function databaseRateLimit(
  req: NextRequest,
  { key, limit, windowMs }: RateLimitRule
): Promise<NextResponse | null> {
  if (!Number.isFinite(limit) || limit <= 0) return null;

  const nowMs = Date.now();
  const now = new Date(nowMs);
  const resetAt = new Date(nowMs + windowMs);
  const bucketKey = rateBucketKey(key, getClientIp(req));

  try {
    const bucket = await db.$transaction(async (tx) => {
      const existing = await tx.rateLimitBucket.findUnique({ where: { key: bucketKey } });
      if (!existing || existing.resetAt.getTime() <= nowMs) {
        return tx.rateLimitBucket.upsert({
          where: { key: bucketKey },
          create: { key: bucketKey, count: 1, resetAt },
          update: { count: 1, resetAt },
        });
      }

      return tx.rateLimitBucket.update({
        where: { key: bucketKey },
        data: { count: { increment: 1 } },
      });
    });

    if (bucket.count > limit) {
      return NextResponse.json(
        { error: "Rate limit exceeded", resetAt: bucket.resetAt.toISOString() },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((bucket.resetAt.getTime() - nowMs) / 1000)) },
        }
      );
    }

    return null;
  } catch (err) {
    console.warn("[rateLimit database fallback]", err instanceof Error ? err.message : err);
    return memoryRateLimit(req, { key, limit, windowMs });
  }
}

export async function rateLimit(
  req: NextRequest,
  rule: RateLimitRule
): Promise<NextResponse | null> {
  return canUseDatabaseRateLimit()
    ? databaseRateLimit(req, rule)
    : memoryRateLimit(req, rule);
}

export async function consumeDailyQuota(
  req: NextRequest,
  key: string,
  limit: number
): Promise<NextResponse | null> {
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
