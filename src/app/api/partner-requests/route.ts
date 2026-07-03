import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientIp, jsonError, rateLimit, requireAdmin } from "@/lib/api/security";
import { createPartnerRequest, isUnpersistedPartnerRequest } from "@/lib/partners/repository";
import { ConsentRequiredError } from "@/lib/privacy/consent";
import { serializePartnerRequestForResponse } from "@/lib/privacy/serializers";

// POST /api/partner-requests - 파트너 상담 요청
export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimit(req, { key: "partner:create", limit: 10, windowMs: 60 * 60 * 1000 });
    if (limited) return limited;

    const body = await req.json();
    const { leadId, partnerType, question, consent } = body || {};

    if (!leadId || !partnerType) return jsonError("Missing required fields: leadId, partnerType", 400);
    if (question && String(question).length > 1000) return jsonError("Question is too long", 413);

    const request = await createPartnerRequest({
      leadId,
      partnerType: String(partnerType),
      question: question || null,
      consent: consent || null,
      auditContext: {
        actor: "public-user",
        actorRole: "user",
        ip: getClientIp(req),
        userAgent: req.headers.get("user-agent"),
      },
    });
    const persisted = !isUnpersistedPartnerRequest(request);

    return NextResponse.json(
      { request: serializePartnerRequestForResponse(request), persisted },
      { status: persisted ? 201 : 202 }
    );
  } catch (e) {
    if (e instanceof ConsentRequiredError) {
      return NextResponse.json(
        {
          error: e.message,
          code: e.code,
          missingScopes: e.missingScopes,
        },
        { status: e.status }
      );
    }
    console.error("[POST /api/partner-requests]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// GET /api/partner-requests - 파트너 요청 목록 (관리자용)
export async function GET(req: NextRequest) {
  try {
    const unauthorized = await requireAdmin(req, { roles: ["owner", "admin", "viewer"] });
    if (unauthorized) return unauthorized;

    const status = req.nextUrl.searchParams.get("status");
    const where = status ? { status } : {};
    const requests = await db.partnerRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { lead: true },
    });
    return NextResponse.json({
      requests: requests.map((request) => serializePartnerRequestForResponse(request, { revealPii: true })),
    });
  } catch (e) {
    console.error("[GET /api/partner-requests]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
