import { readFile } from "fs/promises";
import { LegalReviewStatus, Prisma } from "@prisma/client";
import { db } from "../src/lib/db";

type TargetType = "knowledge_document" | "compliance_rule_version" | "visa_document_requirement";
type DecisionStatus = LegalReviewStatus | "BLANK";

interface ReviewDecisionRow {
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
  validTo?: string | null;
  valid_to?: string | null;
  effectiveTo?: string | null;
  effective_to?: string | null;
  validityDays?: number | null;
  validity_days?: number | null;
}

interface ParsedRow {
  line: number;
  targetType: TargetType;
  targetId: string;
  key: string;
  version?: number;
  status: DecisionStatus;
  checkedBy: string;
  checkedAt?: Date;
  validTo?: Date | null;
  effectiveTo?: Date | null;
  validityDays?: number | null;
}

interface ValidationSummary {
  ok: boolean;
  file: string;
  rows: number;
  decisions: Record<"approved" | "pending" | "rejected" | "blank", number>;
  targets: Record<"knowledgeDocuments" | "complianceRuleVersions" | "visaDocumentRequirements", number>;
  candidates: {
    pendingInDb: number;
    represented: number;
    approved: number;
    approvedChunks: number;
    approvedEmbeddedChunks: number;
    missing: string[];
  };
  warnings: string[];
  errors: string[];
}

type CandidateChunkStatsRow = {
  doc_id: string;
  chunks: bigint;
  embedded_chunks: bigint;
};

async function candidateChunkStats(docId: string): Promise<{ chunks: number; embeddedChunks: number }> {
  const [row] = await db.$queryRaw<CandidateChunkStatsRow[]>(Prisma.sql`
    SELECT
      d."docId" AS doc_id,
      count(c.id)::bigint AS chunks,
      count(c.id) FILTER (WHERE c.embedding IS NOT NULL)::bigint AS embedded_chunks
    FROM "KnowledgeDocument" d
    LEFT JOIN "KnowledgeChunk" c ON c."documentId" = d.id
    WHERE d."docId" = ${docId}
    GROUP BY d."docId"
  `);
  return {
    chunks: Number(row?.chunks || 0),
    embeddedChunks: Number(row?.embedded_chunks || 0),
  };
}

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function numberArg(name: string): number | undefined {
  const raw = argValue(name);
  if (raw === undefined) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a non-negative number.`);
  }
  return value;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function parseDateField(value: string | null | undefined, label: string, line: number, errors: string[]): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value.trim() === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    errors.push(`Line ${line}: ${label} is not a valid date (${value}).`);
    return undefined;
  }
  return date;
}

function normalizeDecision(value: string | undefined, line: number, errors: string[]): DecisionStatus {
  const normalized = (value || "").trim().toUpperCase();
  if (!normalized || normalized === "TODO" || normalized === "__FILL__") return "BLANK";
  if (normalized === "APPROVED") return LegalReviewStatus.APPROVED;
  if (normalized === "PENDING" || normalized === "NEEDS_REVIEW") return LegalReviewStatus.PENDING;
  if (normalized === "REJECTED" || normalized === "DEPRECATED") return LegalReviewStatus.REJECTED;
  errors.push(`Line ${line}: unsupported decision "${value}". Use APPROVED, PENDING, REJECTED, or blank.`);
  return "BLANK";
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

function parseJsonLine(rawLine: string, line: number, errors: string[]): ReviewDecisionRow | null {
  const trimmed = rawLine.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  try {
    return JSON.parse(trimmed) as ReviewDecisionRow;
  } catch (error) {
    errors.push(`Line ${line}: invalid JSON (${error instanceof Error ? error.message : String(error)}).`);
    return null;
  }
}

function parseRow(raw: ReviewDecisionRow, line: number, now: Date, errors: string[], warnings: string[]): ParsedRow | null {
  const targetType = raw.targetType || raw.target_type;
  const targetId = (raw.targetId || raw.target_id || "").trim();
  if (targetType !== "knowledge_document" && targetType !== "compliance_rule_version" && targetType !== "visa_document_requirement") {
    errors.push(`Line ${line}: targetType must be knowledge_document, compliance_rule_version, or visa_document_requirement.`);
    return null;
  }
  if (!targetId) {
    errors.push(`Line ${line}: targetId is required.`);
    return null;
  }

  const status = normalizeDecision(raw.decision, line, errors);
  const checkedBy = (raw.checkedBy?.trim() || raw.checked_by?.trim() || process.env.LEGAL_REVIEW_CHECKED_BY?.trim() || "");
  const checkedAt = parseDateField(raw.checkedAt || raw.checked_at, "checkedAt", line, errors);
  const validTo = parseDateField(raw.validTo ?? raw.valid_to, "validTo", line, errors);
  const effectiveTo = parseDateField(raw.effectiveTo ?? raw.effective_to, "effectiveTo", line, errors);
  const validityDays = raw.validityDays ?? raw.validity_days;

  if (status !== "BLANK") {
    if (isPlaceholderReviewer(checkedBy)) {
      errors.push(`Line ${line}: checkedBy must identify the real legal reviewer, not a placeholder.`);
    }
    if (!checkedAt) {
      errors.push(`Line ${line}: checkedAt is required when decision is ${status}.`);
    } else if (checkedAt.getTime() > now.getTime()) {
      errors.push(`Line ${line}: checkedAt cannot be in the future (${checkedAt.toISOString()}).`);
    }
  } else if (checkedBy && isPlaceholderReviewer(checkedBy)) {
    warnings.push(`Line ${line}: blank decision still contains a placeholder checkedBy value.`);
  }

  if (validityDays !== undefined && validityDays !== null && (!Number.isFinite(validityDays) || validityDays < 0)) {
    errors.push(`Line ${line}: validityDays must be a non-negative number when present.`);
  }

  return {
    line,
    targetType,
    targetId,
    key: `${targetType}:${targetId}:${targetType === "compliance_rule_version" ? raw.version || 1 : ""}`,
    version: raw.version,
    status,
    checkedBy,
    checkedAt: checkedAt || undefined,
    validTo,
    effectiveTo,
    validityDays,
  };
}

async function parseJsonl(file: string, now: Date, errors: string[], warnings: string[]): Promise<ParsedRow[]> {
  const text = await readFile(file, "utf8");
  const rows: ParsedRow[] = [];
  for (const [index, rawLine] of text.split(/\r?\n/).entries()) {
    const raw = parseJsonLine(rawLine, index + 1, errors);
    if (!raw) continue;
    const parsed = parseRow(raw, index + 1, now, errors, warnings);
    if (parsed) rows.push(parsed);
  }
  return rows;
}

function recordDecision(summary: ValidationSummary, status: DecisionStatus) {
  if (status === LegalReviewStatus.APPROVED) summary.decisions.approved++;
  else if (status === LegalReviewStatus.PENDING) summary.decisions.pending++;
  else if (status === LegalReviewStatus.REJECTED) summary.decisions.rejected++;
  else summary.decisions.blank++;
}

function recordTarget(summary: ValidationSummary, targetType: TargetType) {
  if (targetType === "knowledge_document") summary.targets.knowledgeDocuments++;
  else if (targetType === "compliance_rule_version") summary.targets.complianceRuleVersions++;
  else summary.targets.visaDocumentRequirements++;
}

async function validateTargets(rows: ParsedRow[], summary: ValidationSummary) {
  const seen = new Set<string>();
  const candidateRows = new Map<string, { row: ParsedRow; chunkCount: number; embeddedChunkCount: number }>();

  for (const row of rows) {
    if (seen.has(row.key)) {
      summary.errors.push(`Line ${row.line}: duplicate review target ${row.key}.`);
      continue;
    }
    seen.add(row.key);
    recordDecision(summary, row.status);
    recordTarget(summary, row.targetType);

    if (row.targetType === "knowledge_document") {
      const doc = await db.knowledgeDocument.findUnique({
        where: { docId: row.targetId },
        include: { _count: { select: { chunks: true } } },
      });
      if (!doc) {
        summary.errors.push(`Line ${row.line}: KnowledgeDocument not found for docId=${row.targetId}.`);
        continue;
      }
      if (row.targetId.includes("__candidate__")) {
        const stats = await candidateChunkStats(row.targetId);
        if (doc.reviewStatus !== LegalReviewStatus.PENDING) {
          summary.errors.push(`Line ${row.line}: harvested candidate ${row.targetId} is ${doc.reviewStatus}; approval files must target PENDING candidates before apply.`);
        }
        candidateRows.set(row.targetId, { row, chunkCount: stats.chunks, embeddedChunkCount: stats.embeddedChunks });
        if (row.status === LegalReviewStatus.APPROVED) {
          summary.candidates.approved++;
          summary.candidates.approvedChunks += stats.chunks;
          summary.candidates.approvedEmbeddedChunks += stats.embeddedChunks;
          if (stats.chunks === 0 || stats.embeddedChunks < stats.chunks) {
            summary.errors.push(
              `Line ${row.line}: approved candidate ${row.targetId} is not fully embedded (${stats.embeddedChunks}/${stats.chunks}).`
            );
          }
        }
      }
    } else if (row.targetType === "compliance_rule_version") {
      const version = row.version || 1;
      const ruleVersion = await db.complianceRuleVersion.findFirst({
        where: { version, rule: { code: row.targetId } },
        select: { id: true },
      });
      if (!ruleVersion) {
        summary.errors.push(`Line ${row.line}: ComplianceRuleVersion not found for code=${row.targetId} version=${version}.`);
      }
    } else {
      const requirement = await db.visaDocumentRequirement.findUnique({
        where: { code: row.targetId },
        select: { id: true },
      });
      if (!requirement) {
        summary.errors.push(`Line ${row.line}: VisaDocumentRequirement not found for code=${row.targetId}.`);
      }
    }
  }

  const pendingCandidates = await db.knowledgeDocument.findMany({
    where: {
      docId: { contains: "__candidate__" },
      reviewStatus: LegalReviewStatus.PENDING,
    },
    select: { docId: true },
    orderBy: { docId: "asc" },
  });
  summary.candidates.pendingInDb = pendingCandidates.length;
  summary.candidates.represented = candidateRows.size;
  summary.candidates.missing = pendingCandidates
    .map((candidate) => candidate.docId)
    .filter((docId) => !candidateRows.has(docId));
}

async function main() {
  const file = argValue("--file");
  if (!file) {
    throw new Error("Usage: bun run legal-review:validate -- --file legal-review/latest/review-decisions.template.jsonl [--require-decisions] [--require-candidate-coverage] [--require-approved-candidate-chunks 500]");
  }

  const nowRaw = argValue("--now");
  const now = nowRaw ? new Date(nowRaw) : new Date();
  if (Number.isNaN(now.getTime())) throw new Error(`--now is not a valid date (${nowRaw}).`);

  const summary: ValidationSummary = {
    ok: false,
    file,
    rows: 0,
    decisions: { approved: 0, pending: 0, rejected: 0, blank: 0 },
    targets: { knowledgeDocuments: 0, complianceRuleVersions: 0, visaDocumentRequirements: 0 },
    candidates: { pendingInDb: 0, represented: 0, approved: 0, approvedChunks: 0, approvedEmbeddedChunks: 0, missing: [] },
    warnings: [],
    errors: [],
  };

  const rows = await parseJsonl(file, now, summary.errors, summary.warnings);
  summary.rows = rows.length;
  await validateTargets(rows, summary);

  if (hasFlag("--require-decisions") && summary.decisions.blank > 0) {
    summary.errors.push(`Decision file still has ${summary.decisions.blank} blank row(s).`);
  }

  if (hasFlag("--require-candidate-coverage") && summary.candidates.missing.length > 0) {
    summary.errors.push(`Candidate decision file is missing ${summary.candidates.missing.length} pending candidate(s).`);
  }

  const requiredApprovedCandidateChunks = numberArg("--require-approved-candidate-chunks");
  if (
    requiredApprovedCandidateChunks !== undefined &&
    summary.candidates.approvedEmbeddedChunks < requiredApprovedCandidateChunks
  ) {
    summary.errors.push(
      `Approved candidate decisions cover ${summary.candidates.approvedEmbeddedChunks} embedded chunk(s), below required ${requiredApprovedCandidateChunks}.`
    );
  }

  summary.ok = summary.errors.length === 0;
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(`[legal-review:validate] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect().catch(() => undefined);
  });
