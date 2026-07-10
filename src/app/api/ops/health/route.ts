import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireAdmin } from "@/lib/api/security";
import { runRagSystemHealth } from "@/lib/ops/rag-system-health";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function cronAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV === "production" ? jsonError("CRON_SECRET is not configured", 503) : null;
  return req.headers.get("authorization") === `Bearer ${secret}` ? null : jsonError("Unauthorized", 401);
}

export async function GET(req: NextRequest) {
  const unauthorized = cronAuthorized(req);
  if (unauthorized) return unauthorized;
  const result = await runRagSystemHealth("daily-cron");
  return NextResponse.json(result, { status: result.status === "healthy" ? 200 : 503 });
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req, { roles: ["owner", "admin"] });
  if (unauthorized) return unauthorized;
  const result = await runRagSystemHealth("admin-manual");
  return NextResponse.json(result, { status: result.status === "healthy" ? 200 : 503 });
}
