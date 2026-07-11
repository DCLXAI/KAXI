import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canWriteRuntimeDatabase, db } from "@/lib/db";
import { getAdminContext, parsePositiveInt, rateLimit, requireAdmin } from "@/lib/api/security";
import { parseJsonBody } from "@/lib/api/validation";
import { canPersistPiiValue, preparePiiField, retentionUntil } from "@/lib/privacy/pii";
import { serializeLeadForResponse } from "@/lib/privacy/serializers";
import { getCurrentKaxiUser } from "@/lib/supabase/auth";

// Prisma's DiagnosisLead.age/budget/brokerCost/estimatedCost are all Int
// columns, so every numeric field here is coerced and validated as an
// integer — a decimal like 25.5 must be rejected (400) rather than fail
// later as a 500 at db.create.
const leadSchema = z.object({
  nickname: z.string().min(1).max(80),
  nationality: z.string().min(1),
  pathKey: z.string().min(1),
  age: z.coerce.number().int().min(0).max(150).optional().default(0),
  education: z.string().optional().default(""),
  koreanLevel: z.string().optional().default(""),
  goal: z.string().optional().default(""),
  budget: z.coerce.number().int().min(0).optional().default(0),
  region: z.string().optional().default(""),
  // NOTE: z.coerce.boolean() is JS-truthiness (Boolean(x)) — the STRING "false"
  // coerces to true. That matches this route's prior Boolean(x) behavior, but do
  // not copy it for fields that receive "true"/"false" strings; parse those
  // explicitly instead.
  usingBroker: z.coerce.boolean().optional().default(false),
  brokerCost: z.coerce.number().int().min(0).optional().default(0),
  hasHistory: z.coerce.boolean().optional().default(false),
  estimatedCost: z.coerce.number().int().min(0).optional().default(0),
  prepTime: z.string().optional().default(""),
  requiredDocs: z.array(z.string()).optional().default([]),
  warnings: z.array(z.string()).optional().default([]),
  nextActions: z.array(z.string()).optional().default([]),
  contact: z.string().max(160).optional(),
  contactType: z.string().optional(),
});

// GET /api/leads - 리드 목록 조회
export async function GET(req: NextRequest) {
  try {
    const unauthorized = await requireAdmin(req, { roles: ["owner", "admin", "viewer"] });
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

    const leads = await db.diagnosisLead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { partnerRequests: true },
    });

    return NextResponse.json({
      leads: leads.map((lead) => serializeLeadForResponse(lead, { revealPii: true })),
      actor: await getAdminContext(req),
    });
  } catch (e) {
    console.error("[GET /api/leads]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST /api/leads - 리드 생성
export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimit(req, { key: "lead:create", limit: 20, windowMs: 60 * 60 * 1000 });
    if (limited) return limited;

    const parsed = await parseJsonBody(req, leadSchema);
    if (!parsed.ok) return parsed.response;
    const data = parsed.data;

    if (!canWriteRuntimeDatabase()) {
      return NextResponse.json(
        { error: "Writable production database is not configured", persisted: false },
        { status: 503 }
      );
    }
    if (!canPersistPiiValue(data.contact ?? null)) {
      return NextResponse.json(
        { error: "PII encryption is required before storing contact in production", persisted: false },
        { status: 503 }
      );
    }

    const protectedContact = preparePiiField(data.contact ?? null, {
      kind: "contact",
      maxPlainLength: 160,
    });
    // 로그인 상태로 저장하면 계정에 연결(익명 저장은 그대로 null). 동일 오리진 fetch라 세션 쿠키 자동 전송.
    const kaxiUser = await getCurrentKaxiUser();
    const lead = await db.diagnosisLead.create({
      data: {
        userId: kaxiUser?.id ?? null,
        nickname: data.nickname,
        nationality: data.nationality,
        age: data.age,
        education: data.education,
        koreanLevel: data.koreanLevel,
        goal: data.goal,
        budget: data.budget,
        region: data.region,
        usingBroker: data.usingBroker,
        brokerCost: data.brokerCost,
        hasHistory: data.hasHistory,
        pathKey: data.pathKey,
        estimatedCost: data.estimatedCost,
        prepTime: data.prepTime,
        requiredDocs: JSON.stringify(data.requiredDocs),
        warningsJson: JSON.stringify(data.warnings),
        nextActionsJson: JSON.stringify(data.nextActions),
        contact: protectedContact.plaintext,
        contactCiphertext: protectedContact.ciphertext,
        contactHash: protectedContact.hash,
        contactRedacted: protectedContact.redacted,
        contactType: data.contactType || null,
        retentionUntil: retentionUntil(parsePositiveInt(process.env.PRIVACY_LEAD_RETENTION_DAYS, 365)),
      },
    });

    return NextResponse.json({ lead: serializeLeadForResponse(lead) }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/leads]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
