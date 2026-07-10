import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireAdmin } from "@/lib/api/security";
import { drainChatAttachmentJobs } from "@/lib/chat/attachment-jobs";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function limit(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(Math.max(Math.trunc(parsed), 1), 20) : 5;
}

function cronAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim() || "";
  if (!secret) return process.env.NODE_ENV === "production" ? jsonError("CRON_SECRET is not configured", 503) : null;
  return req.headers.get("authorization") === `Bearer ${secret}` ? null : jsonError("Unauthorized", 401);
}

export async function GET(req: NextRequest) {
  const unauthorized = cronAuthorized(req);
  if (unauthorized) return unauthorized;
  const result = await drainChatAttachmentJobs({ limit: limit(req.nextUrl.searchParams.get("limit")) });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req, { roles: ["owner", "admin"] });
  if (unauthorized) return unauthorized;
  const body = await req.json().catch(() => ({}));
  const result = await drainChatAttachmentJobs({ limit: limit(body?.limit) });
  return NextResponse.json(result);
}
