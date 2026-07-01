import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getAdminContext, requireAdmin } from "@/lib/api/security";
import { recordRequestAudit } from "@/lib/audit";
import { getRagDocumentMetadata, KNOWLEDGE_DOCS, pickLangText } from "@/lib/data/knowledge";
import { staticKnowledgeItems, toAdminKnowledgeItem } from "@/lib/admin/serializers";

export const runtime = "nodejs";

function isKnowledgeAction(value: unknown): value is "approve" | "discard" | "recheck" {
  return value === "approve" || value === "discard" || value === "recheck";
}

function supersedesJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function GET(req: NextRequest) {
  try {
    const unauthorized = await requireAdmin(req, { roles: ["owner", "admin", "viewer"] });
    if (unauthorized) return unauthorized;

    const documents = await db.knowledgeDocument.findMany({
      include: { chunks: true },
      orderBy: [{ reviewStatus: "asc" }, { lastCheckedAt: "desc" }],
    });

    if (documents.length === 0) {
      return NextResponse.json({ documents: staticKnowledgeItems(), source: "static" });
    }

    return NextResponse.json({ documents: documents.map(toAdminKnowledgeItem), source: "db" });
  } catch (err) {
    console.error("[GET /api/admin/knowledge]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const unauthorized = await requireAdmin(req, { roles: ["owner", "admin"] });
    if (unauthorized) return unauthorized;
    const context = await getAdminContext(req);
    const body = (await req.json().catch(() => ({}))) as {
      docId?: string;
      action?: string;
    };

    if (!body.docId || !isKnowledgeAction(body.action)) {
      return NextResponse.json({ error: "docId and valid action are required" }, { status: 400 });
    }

    const now = new Date();
    const staticDoc = KNOWLEDGE_DOCS.find((doc) => doc.id === body.docId);
    const existing = await db.knowledgeDocument.findUnique({ where: { docId: body.docId } });

    const reviewStatus = body.action === "discard" ? "REJECTED" : "APPROVED";
    const validTo = body.action === "discard" ? now : null;

    const document = existing
      ? await db.knowledgeDocument.update({
          where: { docId: body.docId },
          data: {
            reviewStatus,
            validTo,
            lastCheckedAt: now,
            checkedBy: context?.actor || "admin",
          },
          include: { chunks: true },
        })
      : await db.knowledgeDocument.create({
          data: {
            docId: body.docId,
            title: staticDoc ? pickLangText(staticDoc.title, "ko") : body.docId,
            sourceUrl: staticDoc ? getRagDocumentMetadata(staticDoc, "ko").source_url : "",
            sourceType: staticDoc ? getRagDocumentMetadata(staticDoc, "ko").source_type : "internal_analysis",
            language: "ko",
            jurisdiction: staticDoc ? getRagDocumentMetadata(staticDoc, "ko").jurisdiction : "KAXI",
            topic: staticDoc?.category || "process",
            validFrom: staticDoc ? new Date(getRagDocumentMetadata(staticDoc, "ko").valid_from) : now,
            validTo,
            lastCheckedAt: now,
            checkedBy: context?.actor || "admin",
            reviewStatus,
            supersedes: staticDoc ? supersedesJson(getRagDocumentMetadata(staticDoc, "ko").supersedes) : Prisma.JsonNull,
            supersededBy: staticDoc ? getRagDocumentMetadata(staticDoc, "ko").superseded_by : null,
          },
          include: { chunks: true },
        });

    await recordRequestAudit(req, {
      actor: context?.actor || "admin",
      actorRole: context?.role || "admin",
      action: `knowledge.${body.action}`,
      targetType: "knowledgeDocument",
      targetId: document.docId,
      metadata: {
        reviewStatus,
        validTo: validTo?.toISOString() || null,
      },
    });

    return NextResponse.json({ ok: true, document: toAdminKnowledgeItem(document) });
  } catch (err) {
    console.error("[PATCH /api/admin/knowledge]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
