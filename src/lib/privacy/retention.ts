import { db } from "@/lib/db";
import { parsePositiveInt } from "@/lib/api/security";
import { expireLeadConsentsForRetention } from "@/lib/privacy/consent";
import { createClient } from "@supabase/supabase-js";

export interface RetentionResult {
  dryRun: boolean;
  chatLogs: number;
  partnerRequests: number;
  leadsRedacted: number;
  leadsDeleted: number;
  consentsExpired: number;
  chatAttachmentsDeleted: number;
  chatAttachmentDeleteFailures: number;
  canonicalChatSessionsDeleted: number;
  canonicalChatSessionDeleteFailures: number;
  canonicalAuditRowsDeleted: number;
  canonicalHandoffRowsDeleted: number;
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export function retentionConfig() {
  return {
    chatLogDays: parsePositiveInt(process.env.PRIVACY_CHATLOG_RETENTION_DAYS, 90),
    partnerRequestDays: parsePositiveInt(process.env.PRIVACY_PARTNER_REQUEST_RETENTION_DAYS, 180),
    leadDays: parsePositiveInt(process.env.PRIVACY_LEAD_RETENTION_DAYS, 365),
    chatAttachmentDays: parsePositiveInt(process.env.PRIVACY_CHAT_ATTACHMENT_RETENTION_DAYS, 30),
  };
}

async function deleteExpiredChatAttachments(now: Date) {
  const candidates = await db.chatAttachment.findMany({
    where: { OR: [{ retentionUntil: { lte: now } }, { deletedAt: { not: null } }] },
    select: { id: true, bucket: true, storageKey: true },
    take: 500,
  });
  if (candidates.length === 0) return { deleted: 0, failures: 0 };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  if (!url || !key) return { deleted: 0, failures: candidates.length };
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const removedIds: string[] = [];
  const byBucket = new Map<string, typeof candidates>();
  for (const item of candidates) {
    byBucket.set(item.bucket, [...(byBucket.get(item.bucket) || []), item]);
  }

  for (const [bucket, files] of byBucket) {
    const removed = await supabase.storage.from(bucket).remove(files.map((item) => item.storageKey));
    if (!removed.error) removedIds.push(...files.map((item) => item.id));
  }
  if (removedIds.length > 0) await db.chatAttachment.deleteMany({ where: { id: { in: removedIds } } });
  return { deleted: removedIds.length, failures: candidates.length - removedIds.length };
}

async function deleteExpiredCanonicalChatSessions(now: Date) {
  const sessions = await db.chatSession.findMany({
    where: {
      deletedAt: null,
      OR: [
        { deleteRequestedAt: { not: null } },
        { retentionUntil: { lte: now } },
      ],
    },
    select: {
      sessionKey: true,
      attachments: { select: { bucket: true, storageKey: true } },
    },
    take: 100,
  });
  if (sessions.length === 0) {
    return { sessionsDeleted: 0, failures: 0, auditRowsDeleted: 0, handoffRowsDeleted: 0 };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  if (!url || !key) {
    return { sessionsDeleted: 0, failures: sessions.length, auditRowsDeleted: 0, handoffRowsDeleted: 0 };
  }
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  let sessionsDeleted = 0;
  let failures = 0;
  let auditRowsDeleted = 0;
  let handoffRowsDeleted = 0;

  for (const session of sessions) {
    let storageRemoved = true;
    const filesByBucket = new Map<string, string[]>();
    for (const file of session.attachments) {
      filesByBucket.set(file.bucket, [...(filesByBucket.get(file.bucket) || []), file.storageKey]);
    }
    for (const [bucket, storageKeys] of filesByBucket) {
      const removed = await supabase.storage.from(bucket).remove(storageKeys);
      if (removed.error) storageRemoved = false;
    }
    if (!storageRemoved) {
      failures += 1;
      continue;
    }

    try {
      const [auditRows, updates, tasks, contacts, leads, deletedSession] = await db.$transaction([
        db.$executeRaw`DELETE FROM "n8n_audit_messages" WHERE "session_id" = ${session.sessionKey}`,
        db.$executeRaw`DELETE FROM "handoff_updates" WHERE "session_id" = ${session.sessionKey}`,
        db.$executeRaw`DELETE FROM "handoff_tasks" WHERE "session_id" = ${session.sessionKey}`,
        db.handoffLeadContact.deleteMany({ where: { sessionKey: session.sessionKey } }),
        db.handoffLead.deleteMany({ where: { sessionKey: session.sessionKey } }),
        db.chatSession.deleteMany({ where: { sessionKey: session.sessionKey } }),
      ]);
      auditRowsDeleted += auditRows;
      handoffRowsDeleted += updates + tasks + contacts.count + leads.count;
      sessionsDeleted += deletedSession.count;
    } catch (error) {
      console.error("[privacy retention] canonical chat deletion failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      failures += 1;
    }
  }

  return { sessionsDeleted, failures, auditRowsDeleted, handoffRowsDeleted };
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
    const [chatLogs, partnerRequests, leadsRedacted, leadsDeleted, redactLeads, deleteLeads, chatAttachmentsDeleted, canonicalChatSessionsDeleted] = await Promise.all([
      db.chatLog.count({ where: chatWhere }),
      db.partnerRequest.count({ where: partnerWhere }),
      db.diagnosisLead.count({ where: leadRedactWhere }),
      db.diagnosisLead.count({ where: leadDeleteWhere }),
      db.diagnosisLead.findMany({ where: leadConsentExpiryWhere, select: { id: true } }),
      db.diagnosisLead.findMany({ where: leadDeleteWhere, select: { id: true } }),
      db.chatAttachment.count({ where: { OR: [{ retentionUntil: { lte: now } }, { deletedAt: { not: null } }] } }),
      db.chatSession.count({
        where: {
          deletedAt: null,
          OR: [{ deleteRequestedAt: { not: null } }, { retentionUntil: { lte: now } }],
        },
      }),
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
    return {
      dryRun,
      chatLogs,
      partnerRequests,
      leadsRedacted,
      leadsDeleted,
      consentsExpired,
      chatAttachmentsDeleted,
      chatAttachmentDeleteFailures: 0,
      canonicalChatSessionsDeleted,
      canonicalChatSessionDeleteFailures: 0,
      canonicalAuditRowsDeleted: 0,
      canonicalHandoffRowsDeleted: 0,
    };
  }

  const [redactLeads, deleteLeads] = await Promise.all([
    db.diagnosisLead.findMany({ where: leadConsentExpiryWhere, select: { id: true } }),
    db.diagnosisLead.findMany({ where: leadDeleteWhere, select: { id: true } }),
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
    db.diagnosisLead.updateMany({
      where: leadRedactWhere,
      data: {
        contact: null,
        contactCiphertext: null,
        contactHash: null,
        contactRedacted: true,
        deletedAt: now,
      },
    }),
    db.diagnosisLead.deleteMany({ where: leadDeleteWhere }),
  ]);

  const consentExpiry = await expireLeadConsentsForRetention({
    leadIds: consentLeadIds,
    reason: "privacy.retention",
    context: {
      actor: "retention-policy",
      actorRole: "system",
    },
  });
  const attachmentRetention = await deleteExpiredChatAttachments(now);
  const canonicalChatRetention = await deleteExpiredCanonicalChatSessions(now);

  return {
    dryRun,
    chatLogs: chatLogs.count,
    partnerRequests: partnerRequests.count,
    leadsRedacted: leadsRedacted.count,
    leadsDeleted: leadsDeleted.count,
    consentsExpired: consentExpiry.consents,
    chatAttachmentsDeleted: attachmentRetention.deleted,
    chatAttachmentDeleteFailures: attachmentRetention.failures,
    canonicalChatSessionsDeleted: canonicalChatRetention.sessionsDeleted,
    canonicalChatSessionDeleteFailures: canonicalChatRetention.failures,
    canonicalAuditRowsDeleted: canonicalChatRetention.auditRowsDeleted,
    canonicalHandoffRowsDeleted: canonicalChatRetention.handoffRowsDeleted,
  };
}
