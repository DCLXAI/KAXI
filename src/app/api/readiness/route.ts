import { NextResponse } from "next/server";
import { getReadinessPayload } from "@/lib/ops/readiness";

export const runtime = "nodejs";

export async function GET() {
  const payload = await getReadinessPayload();
  return NextResponse.json(payload, { status: payload.status === "ready" ? 200 : 503 });
}
