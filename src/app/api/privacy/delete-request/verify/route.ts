import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recordRequestAudit } from "@/lib/audit";
import { applyDeletionSubject, deletionSubjectLookup } from "@/lib/privacy/deletion-apply";
import { resolveDeletionSubject } from "@/lib/privacy/deletion-scope";
import { checkDeletionToken, hashDeletionToken } from "@/lib/privacy/deletion-verification";
import { getClientIp, rateLimit } from "@/lib/api/security";

// P0-1b. Redeeming the one-time link mailed to an address is the proof that the
// person asking owns it. Everything before this point deliberately did nothing.

/**
 * The one response this endpoint gives, for every outcome.
 *
 * A valid link, an expired one, one already used, and one that never existed all
 * look identical. Anything else turns a link found in a forwarded mail, a browser
 * history or a proxy log into an oracle for whether it is still live — and a
 * distinguishable "already used" reply confirms that someone's deletion request
 * exists, which is itself information about them.
 */
function done() {
  return NextResponse.json(
    {
      ok: true,
      status: "processed",
      message: "확인이 완료되었습니다. 요청하신 기록은 삭제 절차에 따라 처리됩니다.",
    },
    { status: 200 },
  );
}

export async function GET(req: NextRequest) {
  try {
    // Tighter than the request endpoint: this one is reachable by GET with a
    // guessable-looking parameter, so it is the natural place to try tokens.
    const limited = await rateLimit(req, { key: "privacy:delete-verify", limit: 10, windowMs: 60 * 60 * 1000 });
    if (limited) return limited;

    const token = req.nextUrl.searchParams.get("token")?.trim() || "";
    if (!token) return done();

    const tokenHash = hashDeletionToken(token);
    const record = await db.privacyDeletionRequest.findUnique({
      where: { verificationTokenHash: tokenHash },
      select: { id: true, subjectHash: true, status: true, expiresAt: true, verifiedAt: true },
    });

    const check = checkDeletionToken(record, new Date());
    if (!check.ok) {
      await recordRequestAudit(req, {
        actor: "public-user",
        actorRole: "user",
        action: "privacy.delete.verify.rejected",
        targetType: "PrivacyDeletionRequest",
        targetId: record?.id ?? null,
        // Recorded for the audit trail; never returned. See done().
        metadata: { reason: check.reason },
      });
      return done();
    }

    // Redeem the token before doing any work, in a single conditional write. Two
    // clicks arriving together would otherwise both pass the check above and both
    // proceed; the row's own state is what decides, and only one update can move
    // it out of pending_verification.
    const redeemed = await db.privacyDeletionRequest.updateMany({
      where: { id: record!.id, status: "pending_verification", verifiedAt: null },
      data: { status: "verified", verifiedAt: new Date(), verificationTokenHash: null },
    });
    if (redeemed.count !== 1) return done();

    const subject = await resolveDeletionSubject(deletionSubjectLookup, {
      verifiedContactHash: record!.subjectHash,
    });

    // A verified address that matches nothing is not an error. The person proved
    // who they are and there was nothing left to erase; the response is the same
    // either way, so the empty case cannot be told from the full one.
    const result = subject
      ? await applyDeletionSubject(subject, {
          actor: "public-user",
          ip: getClientIp(req),
          userAgent: req.headers.get("user-agent"),
        })
      : { leadsMarked: 0, partnerRequestsMarked: 0, sessionsMarked: 0, consentsWithdrawn: 0 };

    await db.privacyDeletionRequest.update({
      where: { id: record!.id },
      data: {
        subjectType: "contact",
        // Counts only. The row must not become a list of which records a person
        // asked to have erased.
        scopeSummary: { ...result, leads: subject?.leadIds.length ?? 0, sessions: subject?.sessionKeys.length ?? 0 },
      },
    });

    await recordRequestAudit(req, {
      actor: "public-user",
      actorRole: "user",
      action: "privacy.delete.verify.completed",
      targetType: "PrivacyDeletionRequest",
      targetId: record!.id,
      metadata: {
        proof: subject?.proof ?? "contact_token",
        leads: subject?.leadIds.length ?? 0,
        sessions: subject?.sessionKeys.length ?? 0,
        ...result,
      },
    });

    return done();
  } catch (err) {
    console.error("[GET /api/privacy/delete-request/verify]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
