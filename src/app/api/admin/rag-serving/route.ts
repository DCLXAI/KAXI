import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/security";
import {
  getRagServingProjectionStatus,
  syncRagServingProjection,
} from "@/lib/knowledge/serving-projection";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req, { roles: ["owner", "admin", "viewer"] });
  if (unauthorized) return unauthorized;
  try {
    return NextResponse.json({ status: await getRagServingProjectionStatus() });
  } catch (error) {
    console.error("[GET /api/admin/rag-serving]", error);
    return NextResponse.json({ error: "RAG serving status unavailable" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req, { roles: ["owner", "admin"] });
  if (unauthorized) return unauthorized;
  try {
    const body = await req.json().catch(() => ({}));
    const result = await syncRagServingProjection({
      limit: Number.parseInt(String(body?.limit || "10"), 10),
      force: body?.force === true,
    });
    return NextResponse.json(result, { status: result.failed.length > 0 ? 207 : 200 });
  } catch (error) {
    console.error("[POST /api/admin/rag-serving]", error);
    return NextResponse.json({ error: "RAG serving sync failed" }, { status: 503 });
  }
}
