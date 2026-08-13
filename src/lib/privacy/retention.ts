import { runtimeEnvironment } from "@/infrastructure/config/runtime-environment";
import { db } from "@/lib/db";
import { parsePositiveInt } from "@/lib/runtime/config";
import { expireLeadConsentsForRetention } from "@/lib/privacy/consent";
import { enforceTypebotResultRetention, type TypebotResultRetentionResult } from "@/lib/typebot/result-retention";
import { createSupabaseServiceRoleClient } from "@/infrastructure/supabase/service-role-client";

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
  outboxEventsDeleted: number;
  productEventsDeleted: number;
  typebotResults: TypebotResultRetentionResult;
}

/**
 * The retention policy version stamped onto rows the sweep has processed.
 *
 * Bump this when the policy changes what it removes, so a row processed under
 * an older, weaker policy can be found and re-processed rather than looking
 * finished forever.
 */
export const RETENTION_POLICY_VERSION = "2026-08-02.ciphertext-v1";

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export function retentionConfig() {
  return {
    chatLogDays: parsePositiveInt(runtimeEnvironment().PRIVACY_CHATLOG_RETENTION_DAYS, 90),
    partnerRequestDays: parsePositiveInt(runtimeEnvironment().PRIVACY_PARTNER_REQUEST_RETENTION_DAYS, 180),
    leadDays: parsePositiveInt(runtimeEnvironment().PRIVACY_LEAD_RETENTION_DAYS, 365),
    chatAttachmentDays: parsePositiveInt(runtimeEnvironment().PRIVACY_CHAT_ATTACHMENT_RETENTION_DAYS, 30),
    productAnalyticsDays: parsePositiveInt(runtimeEnvironment().PRIVACY_PRODUCT_ANALYTICS_RETENTION_DAYS, 180),
  };
}

async function deleteExpiredChatAttachments(now: Date) {
  const candidates = await db.chatAttachment.findMany({
    where: { OR: [{ retentionUntil: { lte: now } }, { deletedAt: { not: null } }] },
    select: { id: true, bucket: true, storageKey: true },
    take: 500,
  });
  if (candidates.length === 0) return { deleted: 0, failures: 0 };

  let supabase;
  try {
    supabase = createSupabaseServiceRoleClient();
  } catch {
    return { deleted: 0, failures: candidates.length };
  }
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

  let supabase;
  try {
    supabase = createSupabaseServiceRoleClient();
  } catch {
    return { sessionsDeleted: 0, failures: sessions.length, auditRowsDeleted: 0, handoffRowsDeleted: 0 };
  }
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
    // NOT questionRedacted:false. That flag is the state of the display
    // plaintext and is already true at write time whenever encryption is
    // configured, so this clause matched nothing in production and the
    // ciphertext outlived its window while the job reported zero rows due.
    retentionProcessedAt: null,
  };
  const partnerWhere = {
    OR: [
      { deleteRequestedAt: { not: null } },
      { retentionUntil: { lte: now } },
      { createdAt: { lt: daysAgo(config.partnerRequestDays) } },
    ],
    retentionProcessedAt: null,
  };
  const leadRedactWhere = {
    OR: [
      { retentionUntil: { lte: now } },
      { createdAt: { lt: daysAgo(config.leadDays) } },
    ],
    retentionProcessedAt: null,
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
    const [chatLogs, partnerRequests, leadsRedacted, leadsDeleted, redactLeads, deleteLeads, chatAttachmentsDeleted, canonicalChatSessionsDeleted, outboxEventsDeleted, productEventsDeleted, typebotResults] = await Promise.all([
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
      db.outboxEvent.count({ where: { retentionUntil: { lte: now } } }),
      db.productEvent.count({ where: { occurredAt: { lt: daysAgo(config.productAnalyticsDays) } } }),
      enforceTypebotResultRetention({ dryRun: true, now }),
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
      outboxEventsDeleted,
      productEventsDeleted,
      typebotResults,
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
        retentionProcessedAt: now,
        retentionVersion: RETENTION_POLICY_VERSION,
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
        retentionProcessedAt: now,
        retentionVersion: RETENTION_POLICY_VERSION,
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
        retentionProcessedAt: now,
        retentionVersion: RETENTION_POLICY_VERSION,
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
  const typebotResults = await enforceTypebotResultRetention({ now });
  const productEvents = await db.productEvent.deleteMany({
    where: { occurredAt: { lt: daysAgo(config.productAnalyticsDays) } },
  });
  const outboxEvents = await db.outboxEvent.deleteMany({
    where: { retentionUntil: { lte: now } },
  });

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
    outboxEventsDeleted: outboxEvents.count,
    productEventsDeleted: productEvents.count,
    typebotResults,
  };
}
