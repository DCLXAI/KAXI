import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { JsonBodyError, readJsonBody } from "@/lib/api/json-body";
import { z } from "zod";
import { canWriteRuntimeDatabase, db } from "@/lib/db";
import { getAdminContext, parsePositiveInt, rateLimit, requireAdmin } from "@/lib/api/security";
import { leadSchema } from "@/lib/data/lead-payload";
import { canPersistPiiValue, preparePiiField, retentionUntil } from "@/lib/privacy/pii";
import { serializeLeadForResponse } from "@/lib/privacy/serializers";
import { getCurrentKaxiUser } from "@/lib/supabase/auth";
import { sendOpsAlert } from "@/lib/ops/alerts";
import { siteBaseUrl } from "@/lib/config/site-url";


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

    // The client has to be able to tell a contract violation from a transient
    // failure. It could not: every error looked the same, so saveDiagnosis
    // treated a 400 exactly like a dropped connection and fabricated a local
    // lead. `retryable: false` is the field that makes "do not pretend this
    // saved" decidable on the client.
    const requestId = randomUUID();
    const parsedBody = await readJsonBody<unknown>(req, 16_384).catch((err) => err);
    if (parsedBody instanceof Error) {
      const status = parsedBody instanceof JsonBodyError ? parsedBody.status : 400;
      return NextResponse.json(
        {
          ok: false,
          persisted: false,
          code: "LEAD_BODY_UNREADABLE",
          retryable: false,
          error: parsedBody.message,
          requestId,
        },
        { status },
      );
    }

    const validated = leadSchema.safeParse(parsedBody);
    if (!validated.success) {
      // Field paths and messages only — never the offending value, which for
      // this route can be a contact detail.
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of validated.error.issues) {
        const key = issue.path.join(".") || "_";
        (fieldErrors[key] ||= []).push(issue.message);
      }
      return NextResponse.json(
        {
          ok: false,
          persisted: false,
          code: "LEAD_PAYLOAD_INVALID",
          retryable: false,
          fieldErrors,
          requestId,
        },
        { status: 400 },
      );
    }
    const data = validated.data;

    if (!canWriteRuntimeDatabase()) {
      return NextResponse.json(
        {
          ok: false,
          persisted: false,
          code: "LEAD_DATABASE_UNAVAILABLE",
          retryable: true,
          error: "Writable production database is not configured",
          requestId,
        },
        { status: 503 }
      );
    }
    if (!canPersistPiiValue(data.contact ?? null)) {
      return NextResponse.json(
        {
          ok: false,
          persisted: false,
          code: "LEAD_PII_ENCRYPTION_REQUIRED",
          // Configuration, not transport: retrying the same body cannot fix it.
          retryable: false,
          error: "PII encryption is required before storing contact in production",
          requestId,
        },
        { status: 503 }
      );
    }

    const protectedContact = preparePiiField(data.contact ?? null, {
      kind: "contact",
      maxPlainLength: 160,
    });
    // 로그인 상태로 저장하면 계정에 연결(익명 저장은 그대로 null). 동일 오리진 fetch라 세션 쿠키 자동 전송.
    // best-effort: 세션 조회가 일시적으로 실패해도 익명 저장은 깨지지 않게 null로 강등.
    let linkedUserId: string | null = null;
    try {
      linkedUserId = (await getCurrentKaxiUser())?.id ?? null;
    } catch (err) {
      console.error("[POST /api/leads] session lookup failed, saving anonymously", err instanceof Error ? err.message : err);
    }
    const lead = await db.diagnosisLead.create({
      data: {
        userId: linkedUserId,
        nickname: data.nickname,
        nationality: data.nationality,
        age: data.age,
        education: data.education,
        koreanLevel: data.koreanLevel,
        goal: data.goal,
        currentVisa: data.currentVisa,
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

    sendOpsAlert({
      kind: "kaxi_ops_alert",
      source: "kaxi-leads",
      severity: "warning",
      eventType: "lead_created",
      message: "새 진단 리드가 생성되었습니다.",
      occurredAt: new Date().toISOString(),
      details: { leadId: lead.id, pathKey: lead.pathKey, nationality: lead.nationality, linked: Boolean(lead.userId) },
      adminUrl: `${siteBaseUrl()}/admin/leads`,
    }).catch((err) => console.warn("[ops alert] lead", err instanceof Error ? err.message : err));

    return NextResponse.json(
      { ok: true, persisted: true, lead: serializeLeadForResponse(lead), requestId },
      { status: 201 },
    );
  } catch (e) {
    console.error("[POST /api/leads]", e);
    // retryable: the request was well formed and something on our side failed,
    // so the client keeping it for a retry is correct.
    return NextResponse.json(
      { ok: false, persisted: false, code: "LEAD_INTERNAL_ERROR", retryable: true, error: "Internal error" },
      { status: 500 },
    );
  }
}
