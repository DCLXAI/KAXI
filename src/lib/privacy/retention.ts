import { db } from "@/lib/db";
import { parsePositiveInt } from "@/lib/api/security";
import { expireLeadConsentsForRetention } from "@/lib/privacy/consent";

export interface RetentionResult {
  dryRun: boolean;
  chatLogs: number;
  partnerRequests: number;
  leadsRedacted: number;
  leadsDeleted: number;
  consentsExpired: number;
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export function retentionConfig() {
  return {
    chatLogDays: parsePositiveInt(process.env.PRIVACY_CHATLOG_RETENTION_DAYS, 90),
    partnerRequestDays: parsePositiveInt(process.env.PRIVACY_PARTNER_REQUEST_RETENTION_DAYS, 180),
    leadDays: parsePositiveInt(process.env.PRIVACY_LEAD_RETENTION_DAYS, 365),
  };
}

export async function enforcePrivacyRetention(options: { dryRun?: boolean } = {}): Promise<RetentionResult> {
  const dryRun = Boolean(options.dryRun);
  const now = new Date();
  const config = retentionConfig();

  const chatWhere = {
    OR: [
      { deleteRequestedAt: { not: null } },
      { retentionUntil: { lte: now } },
      { createdAt: { lt: daysAgo(config.chatLogDays) } },
    ],
    questionRedacted: false,
  };
  const partnerWhere = {
    OR: [
      { deleteRequestedAt: { not: null } },
      { retentionUntil: { lte: now } },
      { createdAt: { lt: daysAgo(config.partnerRequestDays) } },
    ],
    questionRedacted: false,
  };
  const leadRedactWhere = {
    OR: [
      { retentionUntil: { lte: now } },
      { createdAt: { lt: daysAgo(config.leadDays) } },
    ],
    contactRedacted: false,
  };
  const leadConsentExpiryWhere = {
    OR: [
      { retentionUntil: { lte: now } },
      { createdAt: { lt: daysAgo(config.leadDays) } },
      { deleteRequestedAt: { not: null } },
    ],
  };
  const leadDeleteWhere = {
    deleteRequestedAt: { not: null },
  };

  if (dryRun) {
    const [chatLogs, partnerRequests, leadsRedacted, leadsDeleted, redactLeads, deleteLeads] = await Promise.all([
      db.chatLog.count({ where: chatWhere }),
      db.partnerRequest.count({ where: partnerWhere }),
      db.lead.count({ where: leadRedactWhere }),
      db.lead.count({ where: leadDeleteWhere }),
      db.lead.findMany({ where: leadConsentExpiryWhere, select: { id: true } }),
      db.lead.findMany({ where: leadDeleteWhere, select: { id: true } }),
    ]);
    const leadIds = [...new Set([...redactLeads, ...deleteLeads].map((lead) => lead.id))];
    const consentUsers = leadIds.length
      ? await db.user.findMany({
          where: { zaloUid: { in: leadIds.map((id) => `lead:${id}`) } },
          select: { id: true },
        })
      : [];
    const consentsExpired = consentUsers.length
      ? await db.consent.count({
          where: {
            userId: { in: consentUsers.map((user) => user.id) },
            status: "GRANTED",
          },
        })
      : 0;
    return { dryRun, chatLogs, partnerRequests, leadsRedacted, leadsDeleted, consentsExpired };
  }

  const [redactLeads, deleteLeads] = await Promise.all([
    db.lead.findMany({ where: leadConsentExpiryWhere, select: { id: true } }),
    db.lead.findMany({ where: leadDeleteWhere, select: { id: true } }),
  ]);
  const consentLeadIds = [...new Set([...redactLeads, ...deleteLeads].map((lead) => lead.id))];

  const [chatLogs, partnerRequests, leadsRedacted, leadsDeleted] = await db.$transaction([
    db.chatLog.updateMany({
      where: chatWhere,
      data: {
        question: "[redacted-retention]",
        questionCiphertext: null,
        questionHash: null,
        questionRedacted: true,
        deletedAt: now,
      },
    }),
    db.partnerRequest.updateMany({
      where: partnerWhere,
      data: {
        question: "[redacted-retention]",
        questionCiphertext: null,
        questionHash: null,
        questionRedacted: true,
        deletedAt: now,
      },
    }),
    db.lead.updateMany({
      where: leadRedactWhere,
      data: {
        contact: null,
        contactCiphertext: null,
        contactHash: null,
        contactRedacted: true,
        deletedAt: now,
      },
    }),
    db.lead.deleteMany({ where: leadDeleteWhere }),
  ]);

  const consentExpiry = await expireLeadConsentsForRetention({
    leadIds: consentLeadIds,
    reason: "privacy.retention",
    context: {
      actor: "retention-policy",
      actorRole: "system",
    },
  });

  return {
    dryRun,
    chatLogs: chatLogs.count,
    partnerRequests: partnerRequests.count,
    leadsRedacted: leadsRedacted.count,
    leadsDeleted: leadsDeleted.count,
    consentsExpired: consentExpiry.consents,
  };
}
