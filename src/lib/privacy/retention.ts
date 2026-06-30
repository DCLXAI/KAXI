import { db } from "@/lib/db";
import { parsePositiveInt } from "@/lib/api/security";

export interface RetentionResult {
  dryRun: boolean;
  chatLogs: number;
  partnerRequests: number;
  leadsRedacted: number;
  leadsDeleted: number;
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
  const leadDeleteWhere = {
    deleteRequestedAt: { not: null },
  };

  if (dryRun) {
    const [chatLogs, partnerRequests, leadsRedacted, leadsDeleted] = await Promise.all([
      db.chatLog.count({ where: chatWhere }),
      db.partnerRequest.count({ where: partnerWhere }),
      db.lead.count({ where: leadRedactWhere }),
      db.lead.count({ where: leadDeleteWhere }),
    ]);
    return { dryRun, chatLogs, partnerRequests, leadsRedacted, leadsDeleted };
  }

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

  return {
    dryRun,
    chatLogs: chatLogs.count,
    partnerRequests: partnerRequests.count,
    leadsRedacted: leadsRedacted.count,
    leadsDeleted: leadsDeleted.count,
  };
}
