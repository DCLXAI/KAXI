import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, rateLimit, requireAdmin } from "@/lib/api/security";

// POST /api/partner-requests - 파트너 상담 요청
export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, { key: "partner:create", limit: 10, windowMs: 60 * 60 * 1000 });
    if (limited) return limited;

    const body = await req.json();
    const { leadId, partnerType, question } = body || {};

    if (!leadId || !partnerType) return jsonError("Missing required fields: leadId, partnerType", 400);
    if (question && String(question).length > 1000) return jsonError("Question is too long", 413);

    // leadId가 없는 익명 요청도 허용 (임시 lead 생성)
    let finalLeadId = leadId;
    if (leadId === "anonymous" || !leadId) {
      const lead = await db.lead.create({
        data: {
          nickname: "익명",
          nationality: "unknown",
          age: 0,
          education: "unknown",
          koreanLevel: "unknown",
          goal: "unknown",
          budget: 0,
          region: "unknown",
          pathKey: "unknown",
          estimatedCost: 0,
          prepTime: "",
          requiredDocs: "[]",
          warningsJson: "[]",
          nextActionsJson: "[]",
        },
      });
      finalLeadId = lead.id;
    }

    const request = await db.partnerRequest.create({
      data: {
        leadId: finalLeadId,
        partnerType: String(partnerType),
        question: question || null,
      },
    });

    return NextResponse.json({ request }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/partner-requests]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// GET /api/partner-requests - 파트너 요청 목록 (관리자용)
export async function GET(req: NextRequest) {
  try {
    const unauthorized = requireAdmin(req);
    if (unauthorized) return unauthorized;

    const status = req.nextUrl.searchParams.get("status");
    const where = status ? { status } : {};
    const requests = await db.partnerRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { lead: true },
    });
    return NextResponse.json({ requests });
  } catch (e) {
    console.error("[GET /api/partner-requests]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
