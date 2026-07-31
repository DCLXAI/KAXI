import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { canWriteRuntimeDatabase, db } from "@/lib/db";
import { JsonBodyError, readJsonBody } from "@/lib/api/json-body";
import { recordRequestAudit } from "@/lib/audit";
import { withdrawLeadConsentsForPrivacyRequest } from "@/lib/privacy/consent";
import { LEAD_ACCESS_COOKIE } from "@/lib/leads/ownership";
import { resolveDeletionSubject, type DeletionSubject } from "@/lib/privacy/deletion-scope";
import { getCurrentKaxiUser } from "@/lib/supabase/auth";
import { getClientIp, jsonError, rateLimit } from "@/lib/api/security";

/**
 * The one response this endpoint gives.
 *
 * It cannot depend on whether anything was found, or on whether the caller
 * proved anything, because a caller who could tell those apart could use this
 * endpoint to ask "does a record for this person exist?" — which is the
 * disclosure the whole design is built to avoid.
 */
function accepted(requestId: string) {
  return NextResponse.json(
    {
      ok: true,
      accepted: true,
      requestId,
      status: "received",
      message: "요청을 접수했습니다. 본인 확인이 끝나면 처리 결과를 안내합니다.",
    },
    { status: 202 },
  );
}

export async function POST(req: NextRequest) {
  const requestId = randomUUID();

  try {
    const limited = await rateLimit(req, { key: "privacy:delete-request", limit: 5, windowMs: 60 * 60 * 1000 });
    if (limited) return limited;

    const body = await readJsonBody<Record<string, unknown>>(req, 16 * 1024);

    // The question path is gone, not gated. It matched hashPii(question) across
    // every row, and many people type the same question, so it could never
    // identify one person's data no matter what verification sat in front of it.
    // Rejected loudly rather than ignored, so a client still sending it finds
    // out instead of believing its data was covered.
    if (typeof body.question === "string" && body.question.trim()) {
      return jsonError(
        "A question string cannot identify whose data to delete and is no longer accepted.",
        400,
      );
    }

    // leadId and contact in the body are deliberately NOT read. The subject is
    // derived from the caller's proof below; anything they type here would be an
    // unverified claim about someone's data, and the previous version of this
    // endpoint acted on exactly that.

    const subject = await resolveDeletionSubject(
      {
        findLeadIdsForUser: async (userId) =>
          (await db.diagnosisLead.findMany({ where: { userId }, select: { id: true } })).map((row) => row.id),
        findSessionKeysForUser: async (userId) =>
          (await db.chatSession.findMany({ where: { userId }, select: { sessionKey: true } })).map(
            (row) => row.sessionKey,
          ),
        findSessionKeysForLeads: async (leadIds) => {
          const [handoffLeads, handoffContacts] = await Promise.all([
            db.handoffLead.findMany({ where: { id: { in: leadIds } }, select: { sessionKey: true } }),
            db.handoffLeadContact.findMany({ where: { leadId: { in: leadIds } }, select: { sessionKey: true } }),
          ]);
          return [...handoffLeads, ...handoffContacts].map((row) => row.sessionKey);
        },
      },
      {
        sessionUserId: (await getCurrentKaxiUser().catch(() => null))?.id ?? null,
        leadAccessToken: req.cookies.get(LEAD_ACCESS_COOKIE)?.value ?? null,
      },
    );

    if (!subject) {
      // Nothing was proven, so nothing is touched. The request is still recorded:
      // a person who cannot prove ownership today still asked, and P0-1b's
      // verification channel is what will let that request be honoured.
      await recordRequestAudit(req, {
        actor: "public-user",
        actorRole: "user",
        action: "privacy.delete.request.unproven",
        targetType: "UserData",
        targetId: null,
        metadata: { requestId, proof: null },
      });
      return accepted(requestId);
    }

    if (!canWriteRuntimeDatabase()) {
      await recordRequestAudit(req, {
        actor: "public-user",
        actorRole: "user",
        action: "privacy.delete.request.deferred",
        targetType: "UserData",
        targetId: subject.userId,
        metadata: { requestId, proof: subject.proof, reason: "database_not_writable" },
      });
      return accepted(requestId);
    }

    const result = await markSubjectForDeletion(subject, req);

    await recordRequestAudit(req, {
      actor: subject.userId || "public-user",
      actorRole: "user",
      action: "privacy.delete.request",
      targetType: "UserData",
      targetId: subject.userId,
      metadata: {
        requestId,
        proof: subject.proof,
        // Counts, never identifiers. An audit row is not a place to accumulate
        // the ids of the records a person asked to have erased.
        leads: subject.leadIds.length,
        sessions: subject.sessionKeys.length,
        ...result,
      },
    });

    return accepted(requestId);
  } catch (err) {
    if (err instanceof JsonBodyError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[POST /api/privacy/delete-request]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * Marks everything in the proven subject, and nothing else.
 *
 * Each `where` clause is keyed on an id that came out of resolveDeletionSubject.
 * Re-running it is harmless: setting deleteRequestedAt to a fresh timestamp on
 * rows that already carry one changes nothing about what the retention sweep
 * will do.
 */
async function markSubjectForDeletion(subject: DeletionSubject, req: NextRequest) {
  const now = new Date();
  const { leadIds, sessionKeys } = subject;

  const [leads, partnerRequests, sessions] = await Promise.all([
    leadIds.length > 0
      ? db.diagnosisLead.updateMany({ where: { id: { in: leadIds } }, data: { deleteRequestedAt: now } })
      : Promise.resolve({ count: 0 }),
    leadIds.length > 0
      ? db.partnerRequest.updateMany({ where: { leadId: { in: leadIds } }, data: { deleteRequestedAt: now } })
      : Promise.resolve({ count: 0 }),
    sessionKeys.length > 0
      ? db.chatSession.updateMany({ where: { sessionKey: { in: sessionKeys } }, data: { deleteRequestedAt: now } })
      : Promise.resolve({ count: 0 }),
  ]);

  const consentWithdrawal = await withdrawLeadConsentsForPrivacyRequest({
    leadIds,
    reason: "privacy.delete.request",
    context: {
      actor: subject.userId || "public-user",
      actorRole: "user",
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    },
  });

  return {
    leadsMarked: leads.count,
    partnerRequestsMarked: partnerRequests.count,
    sessionsMarked: sessions.count,
    consentsWithdrawn: consentWithdrawal.consents,
  };
}
