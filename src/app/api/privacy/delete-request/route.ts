import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { canWriteRuntimeDatabase, db } from "@/lib/db";
import { JsonBodyError, readJsonBody } from "@/lib/api/json-body";
import { recordRequestAudit } from "@/lib/audit";
import { LEAD_ACCESS_COOKIE } from "@/lib/leads/ownership";
import { applyDeletionSubject, deletionSubjectLookup } from "@/lib/privacy/deletion-apply";
import { resolveDeletionSubject } from "@/lib/privacy/deletion-scope";
import {
  DELETION_TOKEN_TTL_MS,
  deletionVerificationCopy,
  deletionVerifyPath,
  issueDeletionToken,
} from "@/lib/privacy/deletion-verification";
import { hashPii } from "@/lib/privacy/pii";
import { sendNotificationEmail } from "@/lib/notifications/email";
import { getCurrentKaxiUser } from "@/lib/supabase/auth";
import { getClientIp, jsonError, rateLimit } from "@/lib/api/security";

/**
 * The one response this endpoint gives.
 *
 * It cannot depend on whether anything was found, on whether the caller proved
 * anything, or on whether a verification mail went out — a caller who could tell
 * those apart could use this endpoint to ask "does a record for this person
 * exist?", which is the disclosure the whole design is built to avoid.
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

    // leadId in the body is deliberately NOT read: it would be an unverified
    // claim about someone's data, which is what the original endpoint acted on.
    // contact is read only as a destination to send a confirmation link TO, never
    // as a selector — nothing is deleted on the strength of typing an address.
    const contact = typeof body.contact === "string" ? body.contact.trim() : "";
    const locale = typeof body.locale === "string" ? body.locale.trim() : "ko";

    const subject = await resolveDeletionSubject(deletionSubjectLookup, {
      sessionUserId: (await getCurrentKaxiUser().catch(() => null))?.id ?? null,
      leadAccessToken: req.cookies.get(LEAD_ACCESS_COOKIE)?.value ?? null,
    });

    if (!canWriteRuntimeDatabase()) {
      await recordRequestAudit(req, {
        actor: "public-user",
        actorRole: "user",
        action: "privacy.delete.request.deferred",
        targetType: "UserData",
        targetId: subject?.userId ?? null,
        metadata: { requestId, proof: subject?.proof ?? null, reason: "database_not_writable" },
      });
      return accepted(requestId);
    }

    if (subject) {
      const result = await applyDeletionSubject(subject, {
        actor: subject.userId || "public-user",
        ip: getClientIp(req),
        userAgent: req.headers.get("user-agent"),
      });

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
    }

    // No proof, but an address to send one to. P0-1a recorded this case and did
    // nothing; now the address itself becomes the proof, if its owner confirms.
    if (contact) {
      await openContactVerification(req, { requestId, contact, locale });
      return accepted(requestId);
    }

    await recordRequestAudit(req, {
      actor: "public-user",
      actorRole: "user",
      action: "privacy.delete.request.unproven",
      targetType: "PrivacyDeletionRequest",
      targetId: null,
      metadata: { requestId, proof: null, reason: "no_proof_and_no_contact" },
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
 * Opens a pending request and mails a one-time link to the address.
 *
 * Nothing is marked for deletion here — that is the point. The address is a
 * destination, and only redeeming the link proves the person asking is the
 * person who owns it.
 */
async function openContactVerification(
  req: NextRequest,
  input: { requestId: string; contact: string; locale: string },
) {
  const subjectHash = hashPii(input.contact);
  if (!subjectHash) {
    // hashPii returns null when PII_HASH_SECRET is absent. Without it there is
    // no way to record which address a request is about that does not mean
    // storing the address, so the request is audited and left unopened.
    await recordRequestAudit(req, {
      actor: "public-user",
      actorRole: "user",
      action: "privacy.delete.request.unproven",
      targetType: "PrivacyDeletionRequest",
      targetId: null,
      metadata: { requestId: input.requestId, proof: null, reason: "contact_hashing_unavailable" },
    });
    return;
  }

  // One open request per subject, so a link cannot be kept alive indefinitely by
  // requesting again, and an old mail cannot be redeemed after a newer one.
  await db.privacyDeletionRequest.updateMany({
    where: { subjectHash, status: "pending_verification" },
    data: { status: "superseded", verificationTokenHash: null },
  });

  const { token, tokenHash } = issueDeletionToken();
  const record = await db.privacyDeletionRequest.create({
    data: {
      subjectType: "contact",
      subjectHash,
      verificationChannel: "email",
      verificationTokenHash: tokenHash,
      status: "pending_verification",
      expiresAt: new Date(Date.now() + DELETION_TOKEN_TTL_MS),
    },
    select: { id: true },
  });

  const copy = deletionVerificationCopy(input.locale);
  const delivery = await sendNotificationEmail({
    to: input.contact,
    subject: copy.subject,
    body: copy.body,
    href: deletionVerifyPath(token),
  });

  await recordRequestAudit(req, {
    actor: "public-user",
    actorRole: "user",
    action: "privacy.delete.request.verification_sent",
    targetType: "PrivacyDeletionRequest",
    // The request row, which holds no address. Safe to name, unlike the contact.
    targetId: record.id,
    metadata: {
      requestId: input.requestId,
      channel: "email",
      // Whether the mail went out, never where it went.
      delivery: delivery.status,
      expiresInHours: Math.round(DELETION_TOKEN_TTL_MS / 3_600_000),
    },
  });
}
