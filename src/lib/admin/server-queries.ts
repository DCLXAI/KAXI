import "server-only";
import { db } from "@/lib/db";
import {
  staticKnowledgeItems,
  summarizeCaseCounts,
  toAdminAuditLogItem,
  toAdminCaseDetail,
  toAdminCaseListItem,
  toAdminKnowledgeItem,
  toAdminRuleItem,
  toAuditEventItem,
} from "@/lib/admin/serializers";
import type { AdminCaseBucket, AdminKnowledgeItem, AdminKnowledgeReadiness } from "@/lib/admin/types";
import { getProductAnalytics } from "@/lib/analytics/admin";
import { getDocumentVerificationMetrics } from "@/lib/documents/verification-metrics";
import { listAdminHandoffs } from "@/lib/handoffs/admin";
import { getCandidateApprovalReadiness, getRagCorpusReadiness } from "@/lib/knowledge/corpus-readiness";
import { calculateKnowledgeImpacts } from "@/lib/knowledge/repository";
import { getCachedCurrentKaxiSession } from "@/lib/supabase/current-session";
import { serializeLeadForResponse, serializePartnerRequestForResponse } from "@/lib/privacy/serializers";
import { listAdminPartnerRequests } from "@/lib/partners/assignment";

const CASE_INCLUDE = {
  studentProfile: {
    include: {
      user: true,
      documents: { include: { file: true } },
      complianceEvaluations: { include: { ruleVersion: { include: { rule: true } } } },
    },
  },
  reviews: true,
  organization: true,
  assignedUser: true,
  timelineEvents: true,
  documentLinks: { include: { documentItem: true } },
} as const;

export async function forPlatformAdmin<T>(query: () => Promise<T>): Promise<T | null> {
  const session = await getCachedCurrentKaxiSession().catch(() => null);
  return session?.user?.role === "PLATFORM_ADMIN" ? query() : null;
}

export async function queryAdminCases(bucket: AdminCaseBucket = "new", limit = 100) {
  const cases = await db.escalationCase.findMany({
    include: CASE_INCLUDE,
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: Math.min(300, Math.max(1, limit)),
  });
  const counts = summarizeCaseCounts(cases);
  return { cases: cases.map(toAdminCaseListItem).filter((item) => item.bucket === bucket), counts };
}

export async function queryAdminCase(caseId: string) {
  const caseItem = await db.escalationCase.findUnique({ where: { id: caseId }, include: CASE_INCLUDE });
  if (!caseItem) return null;
  const [auditEvents, adminLogs, partnerOffices] = await Promise.all([
    db.auditEvent.findMany({ where: { OR: [{ caseId }, { targetId: caseId }] }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.adminAuditLog.findMany({ where: { targetType: "case", targetId: caseId }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.organization.findMany({
      where: { type: "PARTNER_AGENT_OFFICE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const events = [...auditEvents.map(toAuditEventItem), ...adminLogs.map(toAdminAuditLogItem)]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  return toAdminCaseDetail(caseItem, events, partnerOffices);
}

export async function queryAdminRules() {
  const rules = await db.complianceRule.findMany({
    include: { versions: { include: { tests: true }, orderBy: { version: "desc" } } },
    orderBy: [{ domain: "asc" }, { code: "asc" }],
  });
  return rules.map(toAdminRuleItem);
}

export async function queryAdminAudit(caseId?: string, limit = 100) {
  const boundedLimit = Math.min(500, Math.max(1, limit));
  const [auditEvents, adminLogs] = await Promise.all([
    db.auditEvent.findMany({
      where: caseId ? { OR: [{ caseId }, { targetId: caseId }] } : {},
      orderBy: { createdAt: "desc" },
      take: boundedLimit,
    }),
    db.adminAuditLog.findMany({
      where: caseId ? { targetId: caseId } : {},
      orderBy: { createdAt: "desc" },
      take: boundedLimit,
    }),
  ]);
  return [...auditEvents.map(toAuditEventItem), ...adminLogs.map(toAdminAuditLogItem)]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, boundedLimit);
}

async function knowledgeReadiness(): Promise<AdminKnowledgeReadiness> {
  const [candidateApproval, corpus] = await Promise.all([
    getCandidateApprovalReadiness(),
    getRagCorpusReadiness(),
  ]);
  return { candidateApproval, corpus };
}

async function knowledgeWithImpacts(items: AdminKnowledgeItem[]) {
  const impacts = await calculateKnowledgeImpacts(items.map((item) => ({
    docId: item.docId,
    title: item.title,
    sourceUrl: item.sourceUrl,
    topic: item.topic,
    supersedes: item.supersedes,
  })));
  return items.map((item) => {
    const impact = impacts.get(item.docId);
    return { ...item, impact: impact ? { ...impact, rules: impact.rules.slice(0, 3), users: [] } : undefined };
  });
}

export async function queryAdminKnowledge(page = 1, pageSize = 25) {
  const safePage = Math.min(10_000, Math.max(1, Math.trunc(page)));
  const safePageSize = Math.min(100, Math.max(1, Math.trunc(pageSize)));
  const [total, documents, readiness] = await Promise.all([
    db.knowledgeDocument.count(),
    db.knowledgeDocument.findMany({
      include: { chunks: { select: { id: true } } },
      orderBy: [{ reviewStatus: "asc" }, { lastCheckedAt: "desc" }, { docId: "asc" }],
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
    }),
    knowledgeReadiness(),
  ]);
  const source = total === 0 ? "static" as const : "db" as const;
  const allItems = total === 0 ? staticKnowledgeItems() : documents.map(toAdminKnowledgeItem);
  const pagedItems = total === 0
    ? allItems.slice((safePage - 1) * safePageSize, safePage * safePageSize)
    : allItems;
  const effectiveTotal = total === 0 ? allItems.length : total;
  const totalPages = Math.ceil(effectiveTotal / safePageSize);
  return {
    documents: await knowledgeWithImpacts(pagedItems),
    source,
    readiness,
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      total: effectiveTotal,
      totalPages,
      hasPrevious: safePage > 1,
      hasNext: safePage < totalPages,
    },
  };
}

export const queryAdminAnalytics = (days = 30) => getProductAnalytics(days);
export const queryAdminDocumentMetrics = () => getDocumentVerificationMetrics({ limit: 20 });
export const queryAdminHandoffs = () => listAdminHandoffs({ revealPii: true, limit: 100 });

export async function queryAdminLeadDashboard() {
  const [leadRows, totalRequests, pendingRequests, brokerUsers, byNationality, byPath, recentLeads, partnerQueue] = await Promise.all([
    db.diagnosisLead.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { partnerRequests: true },
    }),
    db.partnerRequest.count(),
    db.partnerRequest.count({ where: { status: "pending" } }),
    db.diagnosisLead.count({ where: { usingBroker: true } }),
    db.diagnosisLead.groupBy({ by: ["nationality"], _count: true }),
    db.diagnosisLead.groupBy({ by: ["pathKey"], _count: true }),
    db.diagnosisLead.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
    listAdminPartnerRequests(),
  ]);
  const leads = leadRows.map((lead) => serializeLeadForResponse(lead, { revealPii: true }));
  return {
    leads,
    stats: {
      totalLeads: await db.diagnosisLead.count(),
      totalRequests,
      pendingRequests,
      brokerUsers,
      recentLeads,
      byNationality,
      byPath,
    },
    partnerQueue: {
      requests: partnerQueue.requests.map((request) => serializePartnerRequestForResponse(request, { revealPii: true })),
      organizations: partnerQueue.organizations,
    },
  };
}
