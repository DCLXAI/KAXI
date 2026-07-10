import { readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { LegalReviewStatus, Prisma } from "@prisma/client";
import { db } from "../src/lib/db";
import {
  approveKnowledgeDocument,
  discardKnowledgeDocument,
} from "../src/lib/knowledge/repository";

type TargetType = "knowledge_document" | "compliance_rule_version" | "visa_document_requirement";

interface ReviewDecision {
  targetType?: TargetType;
  target_type?: TargetType;
  targetId?: string;
  target_id?: string;
  version?: number;
  decision?: string;
  checkedBy?: string;
  checked_by?: string;
  checkedAt?: string;
  checked_at?: string;
  notes?: string;
  validTo?: string | null;
  valid_to?: string | null;
  supersededBy?: string | null;
  superseded_by?: string | null;
  effectiveTo?: string | null;
  effective_to?: string | null;
  validityDays?: number | null;
  validity_days?: number | null;
}

interface ParsedDecision {
  line: number;
  targetType: TargetType;
  targetId: string;
  version?: number;
  status: LegalReviewStatus;
  checkedBy: string;
  checkedAt: Date;
  notes: string;
  validTo?: Date | null;
  supersededBy?: string | null;
  effectiveTo?: Date | null;
  validityDays?: number | null;
}

interface ApplyResult {
  targetType: "KnowledgeDocument" | "ComplianceRuleVersion" | "VisaDocumentRequirement";
  targetId: string;
  before: LegalReviewStatus;
  after: LegalReviewStatus;
}

type CandidateChunkStatsRow = {
  doc_id: string;
  chunks: bigint;
  embedded_chunks: bigint;
};

const APPLY = process.argv.includes("--apply");
const DEFAULT_CHECKED_BY = process.env.LEGAL_REVIEW_CHECKED_BY?.trim() || "";

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] || null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function numberArg(name: string): number | undefined {
  const raw = argValue(name);
  if (raw === null) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    fail(`${name} must be a non-negative number.`);
  }
  return value;
}

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function normalizeStatus(value: string | undefined): LegalReviewStatus | null {
  const normalized = (value || "").trim().toUpperCase();
  if (!normalized || normalized === "TODO" || normalized === "__FILL__") return null;
  if (normalized === "APPROVED") return LegalReviewStatus.APPROVED;
  if (normalized === "PENDING" || normalized === "NEEDS_REVIEW") return LegalReviewStatus.PENDING;
  if (normalized === "REJECTED" || normalized === "DEPRECATED") return LegalReviewStatus.REJECTED;
  fail(`Unsupported decision "${value}". Use APPROVED, PENDING, REJECTED, or blank.`);
}

function nullableDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value.trim() === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) fail(`Invalid date: ${value}`);
  return date;
}

function isPlaceholderReviewer(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return [
    "",
    "__fill__",
    "todo",
    "tbd",
    "fill_me",
    "reviewer",
    "admin",
    "test",
    "partner_agent_001",
    "관리자",
    "검수자",
    "홍길동",
  ].includes(normalized);
}

function requiredDate(value: string | undefined, line: number): Date {
  const raw = value?.trim();
  if (!raw) fail(`Line ${line}: checkedAt is required for legal-review apply.`);
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) fail(`Invalid checkedAt date: ${raw}`);
  if (date.getTime() > new Date().getTime()) fail(`Line ${line}: checkedAt cannot be in the future (${date.toISOString()}).`);
  return date;
}

function parseDecision(raw: ReviewDecision, line: number): ParsedDecision | null {
  const status = normalizeStatus(raw.decision);
  if (!status) return null;

  const targetType = raw.targetType || raw.target_type;
  const targetId = raw.targetId || raw.target_id;
  if (targetType !== "knowledge_document" && targetType !== "compliance_rule_version" && targetType !== "visa_document_requirement") {
    fail(`Line ${line}: targetType must be knowledge_document, compliance_rule_version, or visa_document_requirement.`);
  }
  if (!targetId?.trim()) fail(`Line ${line}: targetId is required.`);

  const checkedBy = raw.checkedBy?.trim() || raw.checked_by?.trim() || DEFAULT_CHECKED_BY;
  if (!checkedBy) {
    fail(`Line ${line}: checkedBy is required. Fill checkedBy or set LEGAL_REVIEW_CHECKED_BY.`);
  }
  if (isPlaceholderReviewer(checkedBy)) {
    fail(`Line ${line}: checkedBy must identify the real legal reviewer, not a placeholder.`);
  }

  return {
    line,
    targetType,
    targetId: targetId.trim(),
    version: raw.version,
    status,
    checkedBy,
    checkedAt: requiredDate(raw.checkedAt || raw.checked_at, line),
    notes: raw.notes?.trim() || "",
    validTo: nullableDate(raw.validTo ?? raw.valid_to),
    supersededBy: raw.supersededBy ?? raw.superseded_by,
    effectiveTo: nullableDate(raw.effectiveTo ?? raw.effective_to),
    validityDays: raw.validityDays ?? raw.validity_days,
  };
}

async function parseJsonl(file: string): Promise<{ parsed: ParsedDecision[]; skipped: number }> {
  const text = await readFile(file, "utf8");
  const parsed: ParsedDecision[] = [];
  let skipped = 0;

  for (const [index, rawLine] of text.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    let value: ReviewDecision;
    try {
      value = JSON.parse(line) as ReviewDecision;
    } catch (error) {
      fail(`Line ${index + 1}: invalid JSON (${error instanceof Error ? error.message : String(error)})`);
    }
    const decision = parseDecision(value, index + 1);
    if (decision) parsed.push(decision);
    else skipped++;
  }

  return { parsed, skipped };
}

function auditMetadata(decision: ParsedDecision, before: unknown, after: unknown): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify({
      line: decision.line,
      decision: decision.status,
      checkedBy: decision.checkedBy,
      checkedAt: decision.checkedAt.toISOString(),
      notes: decision.notes,
      before,
      after,
    })
  ) as Prisma.InputJsonValue;
}

async function candidateChunkStats(docIds: string[]): Promise<Map<string, { chunks: number; embeddedChunks: number }>> {
  const uniqueDocIds = Array.from(new Set(docIds.filter(Boolean)));
  if (uniqueDocIds.length === 0) return new Map();

  const rows = await db.$queryRaw<CandidateChunkStatsRow[]>(Prisma.sql`
    SELECT
      d."docId" AS doc_id,
      count(c.id)::bigint AS chunks,
      count(c.id) FILTER (WHERE c.embedding IS NOT NULL)::bigint AS embedded_chunks
    FROM "KnowledgeDocument" d
    LEFT JOIN "KnowledgeChunk" c ON c."documentId" = d.id
    WHERE d."docId" IN (${Prisma.join(uniqueDocIds)})
    GROUP BY d."docId"
  `);

  return new Map(rows.map((row) => [
    row.doc_id,
    {
      chunks: Number(row.chunks || 0),
      embeddedChunks: Number(row.embedded_chunks || 0),
    },
  ]));
}

async function applyKnowledgeDecision(decision: ParsedDecision): Promise<ApplyResult> {
  const existing = await db.knowledgeDocument.findUnique({
    where: { docId: decision.targetId },
    include: { chunks: { orderBy: { chunkIndex: "asc" } } },
  });
  if (!existing) fail(`Line ${decision.line}: KnowledgeDocument not found for docId=${decision.targetId}`);

  const data = {
    reviewStatus: decision.status,
    checkedBy: decision.checkedBy,
    lastCheckedAt: decision.checkedAt,
    ...(decision.validTo !== undefined ? { validTo: decision.validTo } : {}),
    ...(decision.supersededBy !== undefined ? { supersededBy: decision.supersededBy || null } : {}),
  };

  if (!APPLY) {
    return { targetType: "KnowledgeDocument", targetId: decision.targetId, before: existing.reviewStatus, after: data.reviewStatus };
  }

  if (decision.status === LegalReviewStatus.APPROVED) {
    await approveKnowledgeDocument({
      docId: decision.targetId,
      actor: decision.checkedBy,
      now: decision.checkedAt,
      ...(decision.supersededBy !== undefined ? { supersededBy: decision.supersededBy || null } : {}),
    });
  } else if (decision.status === LegalReviewStatus.REJECTED) {
    await discardKnowledgeDocument({
      docId: decision.targetId,
      actor: decision.checkedBy,
      now: decision.checkedAt,
      ...(decision.supersededBy !== undefined ? { supersededBy: decision.supersededBy || null } : {}),
    });
  } else {
    await db.knowledgeDocument.update({
      where: { docId: decision.targetId },
      data,
    });
  }
  if (decision.validTo !== undefined || decision.supersededBy !== undefined) {
    await db.knowledgeDocument.update({
      where: { docId: decision.targetId },
      data: {
        ...(decision.validTo !== undefined ? { validTo: decision.validTo } : {}),
        ...(decision.supersededBy !== undefined ? { supersededBy: decision.supersededBy || null } : {}),
      },
    });
  }
  const updated = await db.knowledgeDocument.findUniqueOrThrow({ where: { docId: decision.targetId } });
  await db.auditEvent.create({
    data: {
      actorRole: "legal_reviewer",
      action: "legal_review_decision_applied",
      targetType: "KnowledgeDocument",
      targetId: updated.id,
      success: true,
      metadata: auditMetadata(decision, {
        reviewStatus: existing.reviewStatus,
        checkedBy: existing.checkedBy,
        lastCheckedAt: existing.lastCheckedAt,
        validTo: existing.validTo,
        supersededBy: existing.supersededBy,
      }, {
        reviewStatus: updated.reviewStatus,
        checkedBy: updated.checkedBy,
        lastCheckedAt: updated.lastCheckedAt,
        validTo: updated.validTo,
        supersededBy: updated.supersededBy,
      }),
    },
  });

  return { targetType: "KnowledgeDocument", targetId: decision.targetId, before: existing.reviewStatus, after: updated.reviewStatus };
}

async function applyRuleDecision(decision: ParsedDecision): Promise<ApplyResult> {
  const version = decision.version || 1;
  const existing = await db.complianceRuleVersion.findFirst({
    where: {
      version,
      rule: { code: decision.targetId },
    },
    include: { rule: true },
  });
  if (!existing) fail(`Line ${decision.line}: ComplianceRuleVersion not found for code=${decision.targetId} version=${version}`);

  const data = {
    reviewStatus: decision.status,
    reviewedBy: decision.checkedBy,
    reviewedAt: decision.checkedAt,
    ...(decision.effectiveTo !== undefined ? { effectiveTo: decision.effectiveTo } : {}),
  };

  if (!APPLY) {
    return { targetType: "ComplianceRuleVersion", targetId: `${decision.targetId}@v${version}`, before: existing.reviewStatus, after: data.reviewStatus };
  }

  const updated = await db.complianceRuleVersion.update({
    where: { id: existing.id },
    data,
  });
  await db.auditEvent.create({
    data: {
      actorRole: "legal_reviewer",
      action: "legal_review_decision_applied",
      targetType: "ComplianceRuleVersion",
      targetId: updated.id,
      success: true,
      metadata: auditMetadata(decision, {
        code: existing.rule.code,
        version: existing.version,
        reviewStatus: existing.reviewStatus,
        reviewedBy: existing.reviewedBy,
        reviewedAt: existing.reviewedAt,
        effectiveTo: existing.effectiveTo,
      }, {
        code: existing.rule.code,
        version: updated.version,
        reviewStatus: updated.reviewStatus,
        reviewedBy: updated.reviewedBy,
        reviewedAt: updated.reviewedAt,
        effectiveTo: updated.effectiveTo,
      }),
    },
  });

  return { targetType: "ComplianceRuleVersion", targetId: `${decision.targetId}@v${version}`, before: existing.reviewStatus, after: updated.reviewStatus };
}

async function applyVisaDocumentRequirementDecision(decision: ParsedDecision): Promise<ApplyResult> {
  const existing = await db.visaDocumentRequirement.findUnique({ where: { code: decision.targetId } });
  if (!existing) fail(`Line ${decision.line}: VisaDocumentRequirement not found for code=${decision.targetId}`);

  const data = {
    reviewStatus: decision.status,
    checkedBy: decision.checkedBy,
    lastCheckedAt: decision.checkedAt,
    ...(decision.validityDays !== undefined ? { validityDays: decision.validityDays } : {}),
  };

  if (!APPLY) {
    return { targetType: "VisaDocumentRequirement", targetId: decision.targetId, before: existing.reviewStatus, after: data.reviewStatus };
  }

  const updated = await db.visaDocumentRequirement.update({
    where: { code: decision.targetId },
    data,
  });
  await db.auditEvent.create({
    data: {
      actorRole: "legal_reviewer",
      action: "legal_review_decision_applied",
      targetType: "VisaDocumentRequirement",
      targetId: updated.id,
      success: true,
      metadata: auditMetadata(decision, {
        code: existing.code,
        reviewStatus: existing.reviewStatus,
        checkedBy: existing.checkedBy,
        lastCheckedAt: existing.lastCheckedAt,
        validityDays: existing.validityDays,
      }, {
        code: updated.code,
        reviewStatus: updated.reviewStatus,
        checkedBy: updated.checkedBy,
        lastCheckedAt: updated.lastCheckedAt,
        validityDays: updated.validityDays,
      }),
    },
  });

  return { targetType: "VisaDocumentRequirement", targetId: decision.targetId, before: existing.reviewStatus, after: updated.reviewStatus };
}

async function writeApplyLog(file: string, rows: unknown[]) {
  const logPath = join(dirname(file), `review-decisions.${APPLY ? "applied" : "dry-run"}.${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`);
  await writeFile(logPath, rows.map((row) => JSON.stringify(row)).join("\n") + "\n");
  return logPath;
}

async function assertApplyPreflight(parsed: ParsedDecision[], skipped: number) {
  if (!APPLY) return;

  if (hasFlag("--require-decisions") && skipped > 0) {
    fail(`Decision file still has ${skipped} blank row(s).`);
  }

  const requireCandidateCoverage = hasFlag("--require-candidate-coverage");
  const requiredApprovedCandidateChunks = numberArg("--require-approved-candidate-chunks");
  if (!requireCandidateCoverage && requiredApprovedCandidateChunks === undefined) return;

  const candidateRows = parsed.filter((decision) =>
    decision.targetType === "knowledge_document" && decision.targetId.includes("__candidate__")
  );
  const approvedCandidateRows = candidateRows.filter((decision) => decision.status === LegalReviewStatus.APPROVED);
  const pendingCandidates = await db.knowledgeDocument.findMany({
    where: {
      docId: { contains: "__candidate__" },
      reviewStatus: LegalReviewStatus.PENDING,
    },
    select: {
      docId: true,
    },
  });
  const statsByDocId = await candidateChunkStats(pendingCandidates.map((candidate) => candidate.docId));

  if (requireCandidateCoverage) {
    const represented = new Set(candidateRows.map((decision) => decision.targetId));
    const missing = pendingCandidates.filter((candidate) => !represented.has(candidate.docId));
    if (missing.length > 0) {
      fail(`Candidate decision file is missing ${missing.length} pending candidate(s).`);
    }
  }

  if (requiredApprovedCandidateChunks !== undefined) {
    const approved = new Set(approvedCandidateRows.map((decision) => decision.targetId));
    const approvedStats = pendingCandidates
      .filter((candidate) => approved.has(candidate.docId))
      .map((candidate) => ({
        docId: candidate.docId,
        ...(statsByDocId.get(candidate.docId) || { chunks: 0, embeddedChunks: 0 }),
      }));
    const unembedded = approvedStats.filter((stats) => stats.chunks === 0 || stats.embeddedChunks < stats.chunks);
    if (unembedded.length > 0) {
      fail(
        `Approved candidate decisions include ${unembedded.length} candidate(s) without complete pgvector embeddings: ` +
        unembedded.slice(0, 10).map((stats) => `${stats.docId}(${stats.embeddedChunks}/${stats.chunks})`).join(", ")
      );
    }

    const approvedEmbeddedChunks = approvedStats.reduce((sum, stats) => sum + stats.embeddedChunks, 0);
    if (approvedEmbeddedChunks < requiredApprovedCandidateChunks) {
      fail(`Approved candidate decisions cover ${approvedEmbeddedChunks} embedded chunk(s), below required ${requiredApprovedCandidateChunks}.`);
    }
  }
}

async function main() {
  const file = argValue("--file");
  if (!file) {
    fail(
      "Usage: bun run legal-review:apply -- --file legal-review/latest/review-decisions.template.jsonl [--apply] [--require-decisions] [--require-candidate-coverage] [--require-approved-candidate-chunks 500]"
    );
  }

  const { parsed, skipped } = await parseJsonl(file);
  await assertApplyPreflight(parsed, skipped);
  const results: ApplyResult[] = [];
  for (const decision of parsed) {
    if (decision.targetType === "knowledge_document") {
      results.push(await applyKnowledgeDecision(decision));
    } else if (decision.targetType === "compliance_rule_version") {
      results.push(await applyRuleDecision(decision));
    } else {
      results.push(await applyVisaDocumentRequirementDecision(decision));
    }
  }

  const logPath = await writeApplyLog(file, results);
  console.log(`[legal-review:apply] ${APPLY ? "applied" : "dry-run"} decisions=${results.length} skipped=${skipped} log=${logPath}`);
  for (const result of results.slice(0, 20)) {
    console.log(`- ${result.targetType} ${result.targetId}: ${result.before} -> ${result.after}`);
  }
  if (results.length > 20) console.log(`... ${results.length - 20} more`);
  await db.$disconnect();
}

main().catch(async (error) => {
  console.error(`[legal-review:apply] ${error instanceof Error ? error.message : String(error)}`);
  await db.$disconnect().catch(() => undefined);
  process.exit(1);
});
