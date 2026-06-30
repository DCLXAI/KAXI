import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, rateLimit, requireAdmin } from "@/lib/api/security";

// GET /api/leads - 리드 목록 조회
export async function GET(req: NextRequest) {
  try {
    const unauthorized = await requireAdmin(req);
    if (unauthorized) return unauthorized;

    const searchParams = req.nextUrl.searchParams;
    const q = searchParams.get("q") || "";
    const limit = Math.min(Number(searchParams.get("limit") || "100"), 500);

    const where = q
      ? {
          OR: [
            { nickname: { contains: q } },
            { nationality: { contains: q } },
          ],
        }
      : {};

    const leads = await db.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { partnerRequests: true },
    });

    return NextResponse.json({ leads });
  } catch (e) {
    console.error("[GET /api/leads]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST /api/leads - 리드 생성
export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, { key: "lead:create", limit: 20, windowMs: 60 * 60 * 1000 });
    if (limited) return limited;

    const body = await req.json();
    const {
      nickname,
      nationality,
      age,
      education,
      koreanLevel,
      goal,
      budget,
      region,
      usingBroker,
      brokerCost,
      hasHistory,
      pathKey,
      estimatedCost,
      prepTime,
      requiredDocs,
      warnings,
      nextActions,
      contact,
      contactType,
    } = body || {};

    if (!nickname || !nationality || !pathKey) return jsonError("Missing required fields: nickname, nationality, pathKey", 400);
    if (String(nickname).length > 80) return jsonError("Nickname is too long", 413);
    if (contact && String(contact).length > 160) return jsonError("Contact is too long", 413);

    const lead = await db.lead.create({
      data: {
        nickname: String(nickname),
        nationality: String(nationality),
        age: Number(age) || 0,
        education: String(education),
        koreanLevel: String(koreanLevel),
        goal: String(goal),
        budget: Number(budget) || 0,
        region: String(region),
        usingBroker: Boolean(usingBroker),
        brokerCost: Number(brokerCost) || 0,
        hasHistory: Boolean(hasHistory),
        pathKey: String(pathKey),
        estimatedCost: Number(estimatedCost) || 0,
        prepTime: String(prepTime || ""),
        requiredDocs: JSON.stringify(requiredDocs || []),
        warningsJson: JSON.stringify(warnings || []),
        nextActionsJson: JSON.stringify(nextActions || []),
        contact: contact || null,
        contactType: contactType || null,
      },
    });

    return NextResponse.json({ lead }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/leads]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
