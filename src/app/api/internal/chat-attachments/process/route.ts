import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/security";
import { getChatAttachmentQueueStatus } from "@/lib/chat/attachment-jobs";
import { authorizeCronRequest } from "@/lib/security/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const unauthorized = authorizeCronRequest(req);
  if (unauthorized) return unauthorized;
  const queue = await getChatAttachmentQueueStatus();
  return NextResponse.json({ accepted: true, executionOwner: "kaxi-worker", queue }, { status: 202 });
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req, { roles: ["owner", "admin"] });
  if (unauthorized) return unauthorized;
  const queue = await getChatAttachmentQueueStatus();
  return NextResponse.json({ accepted: true, executionOwner: "kaxi-worker", queue }, { status: 202 });
}
