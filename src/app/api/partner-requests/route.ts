import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recordRequestAudit } from "@/lib/audit";
import { getCurrentKaxiUser } from "@/lib/supabase/auth";
import { LEAD_ACCESS_COOKIE, resolveOwnedLead } from "@/lib/leads/ownership";
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
    const { leadId, partnerType, question, name, contact, contactType, consent } = body || {};

    if (!leadId || !partnerType) return jsonError("Missing required fields: leadId, partnerType", 400);
    if (!name || !contact) return jsonError("Name and contact are required", 400);
    if (question && String(question).length > 1000) return jsonError("Question is too long", 413);
    if (name && String(name).length > 80) return jsonError("Name is too long", 413);
    if (contact && String(contact).length > 160) return jsonError("Contact is too long", 413);

    // P0-4. The body's leadId is a hint, never an authority. resolveOwnedLead
    // returns an id only when the caller proved they own it — through the session
    // user for an authenticated caller, or the signed lead_access cookie issued
    // when they created the diagnosis. Anything else resolves to null and the
    // repository creates a fresh anonymous lead, which is what P0-0 did for
    // every caller.
    //
    // The failure reason is audited but never returned: telling the client that
    // a lead exists but is not theirs is itself a disclosure.
    const ownership = await resolveOwnedLead(
      { findLeadOwner: (id) => db.diagnosisLead.findUnique({ where: { id }, select: { userId: true } }) },
      {
        requestedLeadId: typeof leadId === "string" ? leadId : null,
        leadAccessToken: req.cookies.get(LEAD_ACCESS_COOKIE)?.value ?? null,
        sessionUserId: (await getCurrentKaxiUser().catch(() => null))?.id ?? null,
      },
    );

    if (leadId && !ownership.leadId) {
      await recordRequestAudit(req, {
        actor: "public-user",
        actorRole: "user",
        action: "partner.lead.ownership_rejected",
        targetType: "DiagnosisLead",
        // The requested id is not recorded: it is unverified and may be someone
        // else's, and an audit log is not a place to accumulate other people's
        // identifiers.
        targetId: null,
        metadata: { reason: ownership.reason },
      });
    }

    const request = await createPartnerRequest({
      leadId: ownership.leadId,
      partnerType: String(partnerType),
      question: question || null,
      name: name || null,
      contact: contact || null,
      contactType: contactType || null,
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
