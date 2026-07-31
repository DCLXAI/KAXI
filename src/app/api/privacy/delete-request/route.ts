import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { canWriteRuntimeDatabase, db } from "@/lib/db";
import { JsonBodyError, readJsonBody } from "@/lib/api/json-body";
import { recordRequestAudit } from "@/lib/audit";
import { withdrawLeadConsentsForPrivacyRequest } from "@/lib/privacy/consent";
import { hashPii } from "@/lib/privacy/pii";
import { isPrivacyDeletionAutomationEnabled } from "@/lib/privacy/deletion-automation";
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

    // CONTAINMENT (P0-0). This endpoint has no way to prove the caller owns the
    // data it is asked to delete: it took an unauthenticated leadId, contact or
    // question and set deleteRequestedAt on every matching row. The question path
    // is the dangerous one — it matched hashPii(question), and a question like
    // "비자 연장 서류" is typed by many different people, so a single anonymous
    // request could schedule unrelated users' records for deletion and withdraw
    // their consents.
    //
    // Until P0-1 adds ownership verification, the request is accepted and audited
    // but performs NO mutation. The response shape does not depend on whether
    // anything matched, so it cannot be used to probe for the existence of a
    // record — which is also the contract P0-1 has to keep.
    if (!isPrivacyDeletionAutomationEnabled()) {
      const requestId = randomUUID();
      await recordRequestAudit(req, {
        actor: "public-user",
        actorRole: "user",
        action: "privacy.delete.request.received",
        targetType: "UserData",
        // No identifier is echoed. leadId is caller-supplied and unverified, so
        // recording it would let the audit log accumulate other people's ids.
        targetId: null,
        metadata: {
          requestId,
          automationEnabled: false,
          containment: "p0_unverified_deletion_containment",
          // Which FIELDS were supplied, never their values or hashes.
          leadIdProvided: Boolean(leadId),
          contactProvided: Boolean(contact),
          questionProvided: Boolean(question),
        },
      });

      return NextResponse.json(
        {
          ok: true,
          accepted: true,
          persisted: false,
          requestId,
          status: "received",
          message: "요청을 접수했습니다. 본인 확인 절차를 거친 뒤 처리 결과를 안내합니다.",
        },
        { status: 202 },
      );
    }

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
