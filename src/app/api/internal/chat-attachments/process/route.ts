import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/security";
import { drainChatAttachmentJobs } from "@/lib/chat/attachment-jobs";
import { authorizeCronRequest } from "@/lib/security/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function limit(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(Math.max(Math.trunc(parsed), 1), 20) : 5;
}

export async function GET(req: NextRequest) {
  const unauthorized = authorizeCronRequest(req);
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
