import { db } from "@/lib/db";
import { withdrawLeadConsentsForPrivacyRequest } from "@/lib/privacy/consent";
import type { DeletionSubject, DeletionSubjectLookup } from "@/lib/privacy/deletion-scope";

// The database half of P0-1a/P0-1b, in one place because two routes reach it —
// POST when the caller already had a proof, and the verify route once they have
// redeemed the link mailed to their address. A second copy of these queries is
// how one of them ends up keyed on something the caller typed.

export const deletionSubjectLookup: DeletionSubjectLookup = {
  findLeadIdsForUser: async (userId) =>
    (await db.diagnosisLead.findMany({ where: { userId }, select: { id: true } })).map((row) => row.id),

  findSessionKeysForUser: async (userId) =>
    (await db.chatSession.findMany({ where: { userId }, select: { sessionKey: true } })).map((row) => row.sessionKey),

  findSessionKeysForLeads: async (leadIds) => {
    if (leadIds.length === 0) return [];
    const [handoffLeads, handoffContacts] = await Promise.all([
      db.handoffLead.findMany({ where: { id: { in: leadIds } }, select: { sessionKey: true } }),
      db.handoffLeadContact.findMany({ where: { leadId: { in: leadIds } }, select: { sessionKey: true } }),
    ]);
    return [...handoffLeads, ...handoffContacts].map((row) => row.sessionKey);
  },

  findLeadIdsForContactHash: async (contactHash) =>
    (await db.diagnosisLead.findMany({ where: { contactHash }, select: { id: true } })).map((row) => row.id),
};

export interface DeletionScopeSummary {
  leadsMarked: number;
  partnerRequestsMarked: number;
  sessionsMarked: number;
  consentsWithdrawn: number;
}

/**
 * Marks everything in the proven subject, and nothing else.
 *
 * Every `where` clause is keyed on an id that came out of resolveDeletionSubject.
 * Re-running it is harmless: writing a fresh deleteRequestedAt onto rows that
 * already carry one changes nothing about what the retention sweep will do, so a
 * user who clicks their verification link twice is not a special case.
 */
export async function applyDeletionSubject(
  subject: DeletionSubject,
  context: { actor: string; ip?: string | null; userAgent?: string | null },
): Promise<DeletionScopeSummary> {
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
      actor: context.actor,
      actorRole: "user",
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
    },
  });

  return {
    leadsMarked: leads.count,
    partnerRequestsMarked: partnerRequests.count,
    sessionsMarked: sessions.count,
    consentsWithdrawn: consentWithdrawal.consents,
  };
}
