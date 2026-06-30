import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, rateLimit, requireAdmin } from "@/lib/api/security";
import { createPartnerRequest } from "@/lib/partners/repository";
import { readPiiField } from "@/lib/privacy/pii";

function serializePartnerRequest(request: any) {
  return {
    ...request,
    question: readPiiField(request.question, request.questionCiphertext),
    lead: request.lead
      ? {
          ...request.lead,
          contact: readPiiField(request.lead.contact, request.lead.contactCiphertext),
        }
      : request.lead,
  };
}

// POST /api/partner-requests - 파트너 상담 요청
export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimit(req, { key: "partner:create", limit: 10, windowMs: 60 * 60 * 1000 });
    if (limited) return limited;

    const body = await req.json();
    const { leadId, partnerType, question } = body || {};

    if (!leadId || !partnerType) return jsonError("Missing required fields: leadId, partnerType", 400);
    if (question && String(question).length > 1000) return jsonError("Question is too long", 413);

    const request = await createPartnerRequest({
      leadId,
      partnerType: String(partnerType),
      question: question || null,
    });

    return NextResponse.json({ request: serializePartnerRequest(request) }, { status: 201 });
  } catch (e) {
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
    return NextResponse.json({ requests: requests.map(serializePartnerRequest) });
  } catch (e) {
    console.error("[GET /api/partner-requests]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
