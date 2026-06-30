import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invalidateSynonymCache } from "@/lib/embeddings/vector-store";

// GET /api/synonyms - 동의어 목록 조회
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const category = searchParams.get("category");
    const origin = searchParams.get("origin");
    const enabledOnly = searchParams.get("enabled") !== "false";
    const q = searchParams.get("q") || "";

    const where: any = {};
    if (category && category !== "all") where.category = category;
    if (origin && origin !== "all") where.origin = origin;
    if (enabledOnly) where.enabled = true;
    if (q) {
      where.OR = [
        { source: { contains: q } },
        { targets: { contains: q } },
      ];
    }

    const synonyms = await db.synonym.findMany({
      where,
      orderBy: { category: "asc" },
      take: 500,
    });

    // 파싱해서 반환
    const parsed = synonyms.map((s) => ({
      ...s,
      targets: JSON.parse(s.targets),
      autoMeta: s.autoMeta ? JSON.parse(s.autoMeta) : null,
    }));

    return NextResponse.json({ synonyms: parsed, total: parsed.length });
  } catch (e) {
    console.error("[GET /api/synonyms]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST /api/synonyms - 동의어 추가
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { source, targets, category, origin, enabled } = body || {};

    if (!source || !Array.isArray(targets) || targets.length === 0) {
      return NextResponse.json(
        { error: "source (string) and targets (string[]) required" },
        { status: 400 }
      );
    }

    const synonym = await db.synonym.create({
      data: {
        source: String(source).trim(),
        targets: JSON.stringify(targets.map((t: string) => t.trim())),
        category: category || "general",
        origin: origin || "manual",
        enabled: enabled !== false,
      },
    });

    // 동의어 캐시 무효화
    invalidateSynonymCache();

    return NextResponse.json(
      { synonym: { ...synonym, targets: JSON.parse(synonym.targets) } },
      { status: 201 }
    );
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json(
        { error: "Source already exists" },
        { status: 409 }
      );
    }
    console.error("[POST /api/synonyms]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
