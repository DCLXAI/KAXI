import { NextRequest, NextResponse } from "next/server";
import { canWriteRuntimeDatabase, db } from "@/lib/db";
import { JsonBodyError, readJsonBody } from "@/lib/api/json-body";
import { recordRequestAudit } from "@/lib/audit";
import { withdrawLeadConsentsForPrivacyRequest } from "@/lib/privacy/consent";
import { hashPii } from "@/lib/privacy/pii";
import { getClientIp, jsonError, rateLimit } from "@/lib/api/security";

export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimit(req, { key: "privacy:delete-request", limit: 5, windowMs: 60 * 60 * 1000 });
    if (limited) return limited;

    const body = await readJsonBody<Record<string, unknown>>(req, 16 * 1024);
    const leadId = typeof body.leadId === "string" ? body.leadId.trim() : "";
    const contact = typeof body.contact === "string" ? body.contact.trim() : "";
    const question = typeof body.question === "string" ? body.question.trim() : "";
    if (!leadId && !contact && !question) return jsonError("leadId, contact, or question is required", 400);

    if (!canWriteRuntimeDatabase()) {
      return NextResponse.json({
        ok: true,
        persisted: false,
        reason: "Writable production database is not configured",
      }, { status: 202 });
    }

    const now = new Date();
    let matched = 0;
    const consentLeadIds = new Set<string>();
    const canonicalSessionKeys = new Set<string>();
    if (leadId) {
      const result = await db.diagnosisLead.updateMany({
        where: { id: leadId },
        data: { deleteRequestedAt: now },
      });
      matched += result.count;
      if (result.count > 0) consentLeadIds.add(leadId);
      const handoffLead = await db.handoffLead.findUnique({
        where: { id: leadId },
        select: { sessionKey: true },
      });
      if (handoffLead) canonicalSessionKeys.add(handoffLead.sessionKey);
    }

    if (contact) {
      const contactHash = hashPii(contact);
      if (contactHash) {
        const leads = await db.diagnosisLead.findMany({
          where: { contactHash },
          select: { id: true },
        });
        leads.forEach((lead) => consentLeadIds.add(lead.id));
        const result = await db.diagnosisLead.updateMany({
          where: { contactHash },
          data: { deleteRequestedAt: now },
        });
        matched += result.count;
        const handoffContacts = await db.handoffLeadContact.findMany({
          where: { contactHash },
          select: { sessionKey: true },
        });
        handoffContacts.forEach((item) => canonicalSessionKeys.add(item.sessionKey));
      }
    }

    if (question) {
      const questionHash = hashPii(question);
      if (questionHash) {
        const partnerLeadIds = await db.partnerRequest.findMany({
          where: { questionHash },
          select: { leadId: true },
        });
        partnerLeadIds.forEach((request) => consentLeadIds.add(request.leadId));
        const [chatLogs, partnerRequests] = await Promise.all([
          db.chatLog.updateMany({
            where: { questionHash },
            data: { deleteRequestedAt: now },
          }),
          db.partnerRequest.updateMany({
            where: { questionHash },
            data: { deleteRequestedAt: now },
          }),
        ]);
        matched += chatLogs.count + partnerRequests.count;
        const [canonicalMessages, handoffLeads] = await Promise.all([
          db.chatMessage.findMany({ where: { questionHash }, select: { sessionKey: true } }),
          db.handoffLead.findMany({ where: { questionHash }, select: { sessionKey: true } }),
        ]);
        canonicalMessages.forEach((item) => canonicalSessionKeys.add(item.sessionKey));
        handoffLeads.forEach((item) => canonicalSessionKeys.add(item.sessionKey));
      }
    }

    if (canonicalSessionKeys.size > 0) {
      const result = await db.chatSession.updateMany({
        where: { sessionKey: { in: [...canonicalSessionKeys] } },
        data: { deleteRequestedAt: now },
      });
      matched += result.count;
    }

    const consentWithdrawal = await withdrawLeadConsentsForPrivacyRequest({
      leadIds: [...consentLeadIds],
      reason: "privacy.delete.request",
      context: {
        actor: "public-user",
        actorRole: "user",
        ip: getClientIp(req),
        userAgent: req.headers.get("user-agent"),
      },
    });

    await recordRequestAudit(req, {
      actor: "public-user",
      actorRole: "user",
      action: "privacy.delete.request",
      targetType: "UserData",
      targetId: leadId || null,
      metadata: {
        matched: matched > 0,
        contactProvided: Boolean(contact),
        questionProvided: Boolean(question),
        consentLeadIds: consentLeadIds.size,
        canonicalSessions: canonicalSessionKeys.size,
        consentsWithdrawn: consentWithdrawal.consents,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof JsonBodyError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[POST /api/privacy/delete-request]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
