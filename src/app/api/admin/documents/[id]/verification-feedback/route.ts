import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { recordAuditLog } from "@/lib/audit";
import { getAdminContext, getClientIp, requireAdmin } from "@/lib/api/security";
import { db } from "@/lib/db";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ id: string }>;
};

const FEEDBACK_LABELS = new Set(["ACCURATE", "FALSE_POSITIVE", "FALSE_NEGATIVE", "NEEDS_REVIEW"]);

function inputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function issueCodesFromValidation(validation: unknown): string[] {
  const issues = asRecord(validation).issues;
  if (!Array.isArray(issues)) return [];
  return issues
    .map((issue) => asRecord(issue).code)
    .filter((code): code is string => typeof code === "string" && code.trim().length > 0)
    .slice(0, 50);
}

function layerStatusesFromValidation(validation: unknown): Record<string, unknown> {
  return asRecord(asRecord(validation).layers);
}

async function reviewerUserId(actor: string): Promise<string | null> {
  if (!actor.includes("@")) return null;
  const user = await db.user.findUnique({ where: { email: actor }, select: { id: true } });
  return user?.id || null;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const unauthorized = await requireAdmin(req, { roles: ["owner", "admin", "viewer"] });
    if (unauthorized) return unauthorized;

    const { id } = await params;
    const rows = await db.documentVerificationFeedback.findMany({
      where: { documentItemId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ ok: true, feedback: rows });
  } catch (err) {
    console.error("[GET /api/admin/documents/:id/verification-feedback]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 400 });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const unauthorized = await requireAdmin(req, { roles: ["owner", "admin"] });
    if (unauthorized) return unauthorized;

    const context = await getAdminContext(req);
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const label = typeof body.label === "string" ? body.label.trim().toUpperCase() : "";
    if (!FEEDBACK_LABELS.has(label)) {
      return NextResponse.json({ error: "label must be ACCURATE, FALSE_POSITIVE, FALSE_NEGATIVE, or NEEDS_REVIEW" }, { status: 400 });
    }

    const document = await db.documentItem.findUnique({
      where: { id },
      select: { id: true, ocrValidation: true },
    });
    if (!document) return NextResponse.json({ error: "DocumentItem not found" }, { status: 404 });

    const actor = context?.actor || "admin";
    const role = context?.role || "admin";
    const feedback = await db.documentVerificationFeedback.create({
      data: {
        documentItemId: id,
        reviewerUserId: await reviewerUserId(actor),
        reviewerActor: actor,
        reviewerRole: role,
        label,
        issueCodes: inputJson(stringArray(body.issueCodes).length ? stringArray(body.issueCodes).slice(0, 50) : issueCodesFromValidation(document.ocrValidation)),
        layerStatuses: inputJson(asRecord(body.layerStatuses).constructor === Object && Object.keys(asRecord(body.layerStatuses)).length
          ? asRecord(body.layerStatuses)
          : layerStatusesFromValidation(document.ocrValidation)),
        verificationSnapshot: document.ocrValidation ? inputJson(document.ocrValidation) : Prisma.JsonNull,
        note: typeof body.note === "string" ? body.note.slice(0, 1000) : null,
      },
    });

    await recordAuditLog({
      actor,
      actorRole: role,
      action: "document.verification_feedback.recorded",
      targetType: "documentItem",
      targetId: id,
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      metadata: {
        feedbackId: feedback.id,
        label: feedback.label,
        issueCodes: feedback.issueCodes,
      },
    });

    return NextResponse.json({ ok: true, feedback });
  } catch (err) {
    console.error("[POST /api/admin/documents/:id/verification-feedback]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 400 });
  }
}
