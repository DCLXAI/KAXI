import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { db } from "../src/lib/db";
import {
  LEGAL_RAG_PROMOTION_DOC_IDS,
  baseKnowledgeDocId,
  canonicalKnowledgeTitle,
  contentHash,
  evaluateKnowledgeDocumentQuality,
  type KnowledgeQualityResult,
} from "../src/lib/knowledge/chunk-quality";

const APPLY_LEGAL_APPROVALS = process.argv.includes("--apply-legal-approvals");
const APPLY_APPROVED_CLEANING = process.argv.includes("--apply-approved-cleaning");
const AUDIT_APPROVED = process.argv.includes("--audit-approved") || APPLY_APPROVED_CLEANING;
const WRITE_REPORT = process.argv.includes("--write-report") || APPLY_LEGAL_APPROVALS || APPLY_APPROVED_CLEANING;
const CHECKED_BY = process.env.KNOWLEDGE_QUALITY_CHECKED_BY || "partner_agent_001";
const REPORT_JSON = process.env.KNOWLEDGE_QUALITY_REPORT_JSON || join("quality", "knowledge-quality-report.json");
const REPORT_MD = process.env.KNOWLEDGE_QUALITY_REPORT_MD || join("quality", "knowledge-quality-report.md");

type QualityDoc = Awaited<ReturnType<typeof loadQualityDocuments>>[number];

function loadQualityDocuments() {
  return db.knowledgeDocument.findMany({
    where: AUDIT_APPROVED ? { reviewStatus: "APPROVED", sourceType: "official_law" } : { reviewStatus: "PENDING" },
    include: {
      chunks: {
        select: {
          chunkIndex: true,
          content: true,
        },
        orderBy: { chunkIndex: "asc" },
      },
    },
    orderBy: [{ sourceType: "asc" }, { docId: "asc" }],
  });
}

function reportRow(result: KnowledgeQualityResult) {
  return {
    docId: result.docId,
    baseDocId: result.baseDocId,
    title: result.title,
    sourceType: result.sourceType,
    topic: result.topic,
    grade: result.grade,
    score: result.score,
    rawLength: result.rawLength,
    cleanLength: result.cleanLength,
    chunkCount: result.chunkCount,
    noiseRatio: result.noiseRatio,
    recommendedAction: result.recommendedAction,
    issues: result.issues,
    officialKeywordHits: result.officialKeywordHits,
    legalKeywordHits: result.legalKeywordHits,
    sourceUrl: result.sourceUrl,
  };
}

function groupCounts(results: KnowledgeQualityResult[]) {
  return results.reduce<Record<string, number>>((acc, item) => {
    acc[item.grade] = (acc[item.grade] || 0) + 1;
    return acc;
  }, {});
}

function markdownReport(results: KnowledgeQualityResult[], promoted: string[]): string {
  const counts = groupCounts(results);
  const rows = results
    .map((result) => {
      const issues = result.issues.length > 0 ? result.issues.join(", ") : "-";
      return `| \`${result.docId}\` | \`${result.baseDocId}\` | ${result.grade} | ${result.score} | ${result.cleanLength} | ${Math.round(
        result.noiseRatio * 100
      )}% | ${result.recommendedAction} | ${issues} |`;
    })
    .join("\n");

  return `# Knowledge Quality Report

Generated: ${new Date().toISOString()}

## Summary

- approve_ready: ${counts.approve_ready || 0}
- needs_cleaning: ${counts.needs_cleaning || 0}
- reject: ${counts.reject || 0}
- legal promotions applied: ${promoted.length}

## Legal Promotions

${promoted.length > 0 ? promoted.map((id) => `- \`${id}\``).join("\n") : "- none"}

## Pending Candidates

| Doc ID | Base doc ID | Grade | Score | Clean chars | Noise | Action | Issues |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
${rows}
`;
}

function ensureParent(path: string) {
  mkdirSync(dirname(path), { recursive: true });
}

function isPromotableLegal(result: KnowledgeQualityResult): boolean {
  return (
    result.grade === "approve_ready" &&
    result.sourceType === "official_law" &&
    !result.issues.includes("missing_required_article_body") &&
    (LEGAL_RAG_PROMOTION_DOC_IDS as readonly string[]).includes(result.baseDocId)
  );
}

function requiresApprovedHold(result: KnowledgeQualityResult): boolean {
  return (
    result.sourceType === "official_law" &&
    (result.grade === "reject" ||
      ((LEGAL_RAG_PROMOTION_DOC_IDS as readonly string[]).includes(result.baseDocId) &&
        result.issues.includes("missing_required_article_body")))
  );
}

async function promoteLegalCandidate(doc: QualityDoc, result: KnowledgeQualityResult) {
  const baseDocId = result.baseDocId;
  const existingBase = await db.knowledgeDocument.findUnique({
    where: { docId: baseDocId },
    select: { id: true, reviewStatus: true },
  });
  const cleanedChunks = result.cleanedChunks.length > 0 ? result.cleanedChunks : [result.cleanedContent];

  if (existingBase?.id && existingBase.id !== doc.id) {
    await db.knowledgeDocument.update({
      where: { id: doc.id },
      data: {
        reviewStatus: "REJECTED",
        supersededBy: baseDocId,
        checkedBy: CHECKED_BY,
      },
    });
    return { action: "superseded_existing", docId: baseDocId };
  }

  await db.$transaction(async (tx) => {
    await tx.knowledgeChunk.deleteMany({ where: { documentId: doc.id } });
    await tx.knowledgeDocument.update({
      where: { id: doc.id },
      data: {
        docId: baseDocId,
        title: canonicalKnowledgeTitle(doc.title),
        sourceType: "official_law",
        language: "ko",
        jurisdiction: "KR",
        checkedBy: CHECKED_BY,
        reviewStatus: "APPROVED",
        supersededBy: null,
        chunks: {
          create: cleanedChunks.map((content, chunkIndex) => ({
            chunkIndex,
            content,
            contentHash: contentHash(content),
          })),
        },
      },
    });
  });

  return { action: "approved", docId: baseDocId };
}

async function cleanApprovedLawDocument(doc: QualityDoc, result: KnowledgeQualityResult) {
  const cleanedChunks = result.cleanedChunks.length > 0 ? result.cleanedChunks : [result.cleanedContent].filter(Boolean);
  const holdForCleaning = requiresApprovedHold(result);
  const nextDocId = holdForCleaning
    ? `${result.baseDocId}__candidate__quality-hold-${contentHash(result.cleanedContent || result.docId).slice(0, 12)}`
    : doc.docId;

  await db.$transaction(async (tx) => {
    await tx.knowledgeChunk.deleteMany({ where: { documentId: doc.id } });
    await tx.knowledgeDocument.update({
      where: { id: doc.id },
      data: {
        docId: nextDocId,
        checkedBy: CHECKED_BY,
        reviewStatus: holdForCleaning ? "PENDING" : "APPROVED",
        supersededBy: null,
        chunks: {
          create: cleanedChunks.map((content, chunkIndex) => ({
            chunkIndex,
            content,
            contentHash: contentHash(content),
          })),
        },
      },
    });
  });

  return { action: holdForCleaning ? "held_for_cleaning" : "cleaned", docId: nextDocId };
}

async function main() {
  const docs = await loadQualityDocuments();
  const results = docs.map((doc) =>
    evaluateKnowledgeDocumentQuality({
      docId: doc.docId,
      title: doc.title,
      sourceUrl: doc.sourceUrl,
      sourceType: doc.sourceType,
      topic: doc.topic,
      reviewStatus: doc.reviewStatus,
      chunks: doc.chunks,
    })
  );

  const promoted: string[] = [];
  const eligible = AUDIT_APPROVED ? [] : results.filter(isPromotableLegal);
  if (APPLY_LEGAL_APPROVALS) {
    for (const result of eligible) {
      const doc = docs.find((item) => item.docId === result.docId);
      if (!doc) continue;
      const promotion = await promoteLegalCandidate(doc, result);
      promoted.push(`${promotion.docId}:${promotion.action}`);
    }
  }
  if (APPLY_APPROVED_CLEANING) {
    for (const result of results) {
      const doc = docs.find((item) => item.docId === result.docId);
      if (!doc) continue;
      const cleaned = await cleanApprovedLawDocument(doc, result);
      promoted.push(`${cleaned.docId}:${cleaned.action}`);
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: APPLY_APPROVED_CLEANING
      ? "apply-approved-cleaning"
      : APPLY_LEGAL_APPROVALS
        ? "apply-legal-approvals"
        : AUDIT_APPROVED
          ? "audit-approved"
          : "audit-pending",
    totalPending: AUDIT_APPROVED ? 0 : results.length,
    totalApprovedAudited: AUDIT_APPROVED ? results.length : 0,
    counts: groupCounts(results),
    promotableLegalDocIds: eligible.map((item) => item.baseDocId),
    promoted,
    candidates: results.map(reportRow),
  };

  if (WRITE_REPORT) {
    ensureParent(REPORT_JSON);
    ensureParent(REPORT_MD);
    writeFileSync(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);
    writeFileSync(REPORT_MD, markdownReport(results, promoted));
  }

  console.log(JSON.stringify(report, null, 2));
}

try {
  await main();
} finally {
  await db.$disconnect();
}
