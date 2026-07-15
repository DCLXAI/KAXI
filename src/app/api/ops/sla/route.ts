import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/security";
import { runSlaWatchdog } from "@/lib/ops/sla-watchdog";
import { authorizeCronRequest } from "@/lib/security/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const unauthorized = authorizeCronRequest(req);
  if (unauthorized) return unauthorized;
  const result = await runSlaWatchdog("daily-cron");
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req, { roles: ["owner", "admin"] });
  if (unauthorized) return unauthorized;
  const result = await runSlaWatchdog("admin-manual");
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
