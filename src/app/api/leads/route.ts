import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/leads - 리드 목록 조회
export async function GET(req: NextRequest) {
  try {
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

    if (!nickname || !nationality || !pathKey) {
      return NextResponse.json(
        { error: "Missing required fields: nickname, nationality, pathKey" },
        { status: 400 }
      );
    }

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
