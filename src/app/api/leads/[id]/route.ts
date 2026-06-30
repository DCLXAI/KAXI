import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api/security";

// GET /api/leads/[id] - 리드 상세
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const unauthorized = await requireAdmin(_req);
    if (unauthorized) return unauthorized;

    const { id } = await params;
    const lead = await db.lead.findUnique({
      where: { id },
      include: { partnerRequests: true },
    });
    if (!lead) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ lead });
  } catch (e) {
    console.error("[GET /api/leads/[id]]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// DELETE /api/leads/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const unauthorized = await requireAdmin(_req);
    if (unauthorized) return unauthorized;

    const { id } = await params;
    await db.lead.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/leads/[id]]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
