import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invalidateSynonymCache } from "@/lib/embeddings/vector-store";
import { getAdminContext, requireAdmin } from "@/lib/api/security";
import { recordRequestAudit } from "@/lib/audit";

// PATCH /api/synonyms/[id] - 동의어 수정 (활성화/비활성화, targets 변경)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const unauthorized = await requireAdmin(req);
    if (unauthorized) return unauthorized;

    const { id } = await params;
    const body = await req.json();
    const { targets, category, enabled, origin } = body || {};

    const data: any = {};
    if (Array.isArray(targets)) {
      data.targets = JSON.stringify(targets.map((t: string) => t.trim()));
    }
    if (category) data.category = category;
    if (typeof enabled === "boolean") data.enabled = enabled;
    if (origin) data.origin = origin;

    const synonym = await db.synonym.update({
      where: { id },
      data,
    });

    invalidateSynonymCache();
    const actor = await getAdminContext(req);
    await recordRequestAudit(req, {
      actor: actor?.actor || "unknown",
      actorRole: actor?.role || "admin",
      action: "synonym.update",
      targetType: "Synonym",
      targetId: id,
      metadata: { fields: Object.keys(data) },
    });

    return NextResponse.json({
      synonym: { ...synonym, targets: JSON.parse(synonym.targets) },
    });
  } catch (e) {
    console.error("[PATCH /api/synonyms/[id]]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// DELETE /api/synonyms/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const unauthorized = await requireAdmin(_req);
    if (unauthorized) return unauthorized;

    const { id } = await params;
    await db.synonym.delete({ where: { id } });
    invalidateSynonymCache();
    const actor = await getAdminContext(_req);
    await recordRequestAudit(_req, {
      actor: actor?.actor || "unknown",
      actorRole: actor?.role || "admin",
      action: "synonym.delete",
      targetType: "Synonym",
      targetId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/synonyms/[id]]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
