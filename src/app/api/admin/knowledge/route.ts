import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getAdminContext, requireAdmin } from "@/lib/api/security";
import { recordRequestAudit } from "@/lib/audit";
import { staticKnowledgeItems, toAdminKnowledgeItem } from "@/lib/admin/serializers";
import type { AdminKnowledgeItem } from "@/lib/admin/types";
import { getCandidateApprovalReadiness, getRagCorpusReadiness } from "@/lib/knowledge/corpus-readiness";
import {
  analyzeKnowledgeDocumentDiff,
  approveKnowledgeDocument,
  calculateKnowledgeImpact,
  discardKnowledgeDocument,
  recheckKnowledgeDocument,
} from "@/lib/knowledge/repository";

export const runtime = "nodejs";

type KnowledgeAction =
  | "approve"
  | "discard"
  | "recheck"
  | "diff"
  | "bulkApproveCandidates"
  | "bulkDiscardCandidates";

function isKnowledgeAction(value: unknown): value is KnowledgeAction {
  return (
    value === "approve" ||
    value === "discard" ||
    value === "recheck" ||
    value === "diff" ||
    value === "bulkApproveCandidates" ||
    value === "bulkDiscardCandidates"
  );
}

type CandidateChunkStatsRow = {
  doc_id: string;
  chunks: bigint;
  embedded_chunks: bigint;
};

interface CandidateChunkStats {
  docId: string;
  chunks: number;
  embeddedChunks: number;
}

async function withImpact(item: AdminKnowledgeItem): Promise<AdminKnowledgeItem> {
  return {
    ...item,
    impact: await calculateKnowledgeImpact({
      docId: item.docId,
      title: item.title,
      sourceUrl: item.sourceUrl,
      topic: item.topic,
      supersedes: item.supersedes,
    }),
  };
}

async function knowledgeReadinessSummary() {
  const [candidateApproval, corpus] = await Promise.all([
    getCandidateApprovalReadiness(),
    getRagCorpusReadiness(),
  ]);

  return {
    candidateApproval: {
      ok: candidateApproval.ok,
      checkedAt: candidateApproval.checkedAt,
      pendingCandidates: candidateApproval.pendingCandidates,
      pendingCandidateChunks: candidateApproval.pendingCandidateChunks,
      pendingCandidateEmbeddedChunks: candidateApproval.pendingCandidateEmbeddedChunks,
      pendingOfficialCandidates: candidateApproval.pendingOfficialCandidates,
      pendingOfficialCandidateChunks: candidateApproval.pendingOfficialCandidateChunks,
      pendingOfficialCandidateEmbeddedChunks: candidateApproval.pendingOfficialCandidateEmbeddedChunks,
      allPendingCandidateChunksEmbedded: candidateApproval.allPendingCandidateChunksEmbedded,
      allPendingOfficialCandidateChunksEmbedded: candidateApproval.allPendingOfficialCandidateChunksEmbedded,
      projectedApprovedChunks: candidateApproval.projectedApprovedChunks,
      projectedApprovedEmbeddedChunks: candidateApproval.projectedApprovedEmbeddedChunks,
      projectedApprovedOfficialChunks: candidateApproval.projectedApprovedOfficialChunks,
      projectedApprovedOfficialEmbeddedChunks: candidateApproval.projectedApprovedOfficialEmbeddedChunks,
      projectedSupersededApprovedDocuments: candidateApproval.projectedSupersededApprovedDocuments,
      minCandidateChunks: candidateApproval.minCandidateChunks,
      minProjectedApprovedChunks: candidateApproval.minProjectedApprovedChunks,
      reasons: candidateApproval.reasons,
    },
    corpus: {
      ok: corpus.ok,
      checkedAt: corpus.checkedAt,
      approvedDocuments: corpus.approvedDocuments,
      approvedChunks: corpus.approvedChunks,
      approvedEmbeddedChunks: corpus.approvedEmbeddedChunks,
      approvedOfficialDocuments: corpus.approvedOfficialDocuments,
      approvedOfficialChunks: corpus.approvedOfficialChunks,
      approvedOfficialEmbeddedChunks: corpus.approvedOfficialEmbeddedChunks,
      pendingCandidates: corpus.pendingCandidates,
      pendingCandidateChunks: corpus.pendingCandidateChunks,
      pendingOfficialCandidates: corpus.pendingOfficialCandidates,
      pendingOfficialCandidateChunks: corpus.pendingOfficialCandidateChunks,
      minApprovedChunks: corpus.minApprovedChunks,
      minApprovedEmbeddedChunks: corpus.minApprovedEmbeddedChunks,
      minApprovedOfficialChunks: corpus.minApprovedOfficialChunks,
      minApprovedOfficialEmbeddedChunks: corpus.minApprovedOfficialEmbeddedChunks,
      reasons: corpus.reasons,
    },
  };
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function optionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function isCandidateDocId(docId: string): boolean {
  return docId.includes("__candidate__");
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
    "admin-api-key",
  ].includes(normalized);
}

function reviewerIdentity(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const reviewer = value.trim();
  return reviewer && !isPlaceholderReviewer(reviewer) ? reviewer : null;
}

function checkedAtDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date;
}

function candidateApprovalReview(body: {
  checkedBy?: unknown;
  checkedAt?: unknown;
  reviewedBy?: unknown;
  reviewedAt?: unknown;
}): { ok: true; checkedBy: string; checkedAt: Date } | { ok: false; error: string } {
  const checkedBy = reviewerIdentity(body.checkedBy) || reviewerIdentity(body.reviewedBy);
  if (!checkedBy) {
    return { ok: false, error: "checkedBy/reviewedBy must identify the real legal reviewer for candidate approval." };
  }
  const checkedAt = checkedAtDate(body.checkedAt) || checkedAtDate(body.reviewedAt);
  if (!checkedAt) {
    return { ok: false, error: "checkedAt/reviewedAt is required for candidate approval." };
  }
  if (checkedAt.getTime() > Date.now()) {
    return { ok: false, error: "checkedAt/reviewedAt cannot be in the future." };
  }
  return { ok: true, checkedBy, checkedAt };
}

async function pendingCandidateRows() {
  return db.knowledgeDocument.findMany({
    where: {
      reviewStatus: "PENDING",
      docId: { contains: "__candidate__" },
    },
    include: { _count: { select: { chunks: true } } },
    orderBy: [{ topic: "asc" }, { docId: "asc" }],
  });
}

async function candidateChunkStats(docIds: string[]): Promise<Map<string, CandidateChunkStats>> {
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
      docId: row.doc_id,
      chunks: Number(row.chunks || 0),
      embeddedChunks: Number(row.embedded_chunks || 0),
    },
  ]));
}

async function pendingCandidateDocIds(requestedDocIds: string[]): Promise<string[]> {
  if (requestedDocIds.length === 0) return [];

  const documents = await db.knowledgeDocument.findMany({
    where: {
      reviewStatus: "PENDING",
      docId: { in: requestedDocIds },
    },
    select: { docId: true },
    orderBy: { lastCheckedAt: "desc" },
  });
  return documents.map((document) => document.docId);
}

async function validateBulkCandidateApproval(input: {
  requestedDocIds: string[];
  minApprovedCandidateChunks: number;
  minProjectedApprovedChunks: number;
}): Promise<{
  ok: true;
  targetDocIds: string[];
  chunkCount: number;
  projection: Awaited<ReturnType<typeof getCandidateApprovalReadiness>>;
} | { ok: false; status: number; error: string; details?: unknown }> {
  if (input.requestedDocIds.length === 0) {
    return {
      ok: true,
      targetDocIds: [],
      chunkCount: 0,
      projection: await getCandidateApprovalReadiness({
        minCandidateChunks: input.minApprovedCandidateChunks,
        minCandidateEmbeddedChunks: input.minApprovedCandidateChunks,
        minProjectedApprovedChunks: input.minProjectedApprovedChunks,
        minProjectedApprovedEmbeddedChunks: input.minProjectedApprovedChunks,
      }),
    };
  }

  const allPendingCandidates = await pendingCandidateRows();
  const pendingByDocId = new Map(allPendingCandidates.map((document) => [document.docId, document]));
  const statsByDocId = await candidateChunkStats(allPendingCandidates.map((document) => document.docId));
  const requested = Array.from(new Set(input.requestedDocIds));
  const unknown = requested.filter((docId) => !pendingByDocId.has(docId));
  if (unknown.length > 0) {
    return {
      ok: false,
      status: 400,
      error: "Bulk candidate approval can target only current PENDING candidate documents.",
      details: { unknown: unknown.slice(0, 20) },
    };
  }

  const missing = allPendingCandidates.map((document) => document.docId).filter((docId) => !requested.includes(docId));
  if (missing.length > 0) {
    return {
      ok: false,
      status: 409,
      error: "Bulk candidate approval must include every current PENDING candidate.",
      details: { missingCount: missing.length, missing: missing.slice(0, 20) },
    };
  }

  const unembedded = requested
    .map((docId) => statsByDocId.get(docId) || { docId, chunks: 0, embeddedChunks: 0 })
    .filter((stats) => stats.chunks === 0 || stats.embeddedChunks < stats.chunks);
  if (unembedded.length > 0) {
    return {
      ok: false,
      status: 409,
      error: "Bulk candidate approval requires every candidate chunk to have an actual pgvector embedding.",
      details: {
        unembeddedCount: unembedded.length,
        unembedded: unembedded.slice(0, 20),
      },
    };
  }

  const chunkCount = requested.reduce((sum, docId) => sum + (statsByDocId.get(docId)?.chunks || 0), 0);
  if (chunkCount < input.minApprovedCandidateChunks) {
    return {
      ok: false,
      status: 409,
      error: `Approved candidate chunks would be ${chunkCount}, below required ${input.minApprovedCandidateChunks}.`,
      details: { chunkCount, minApprovedCandidateChunks: input.minApprovedCandidateChunks },
    };
  }

  const projection = await getCandidateApprovalReadiness({
    minCandidateChunks: input.minApprovedCandidateChunks,
    minCandidateEmbeddedChunks: input.minApprovedCandidateChunks,
    minProjectedApprovedChunks: input.minProjectedApprovedChunks,
    minProjectedApprovedEmbeddedChunks: input.minProjectedApprovedChunks,
  });
  if (!projection.ok) {
    return {
      ok: false,
      status: 409,
      error: "Bulk candidate approval projection does not satisfy the approved production RAG baseline.",
      details: {
        pendingCandidates: projection.pendingCandidates,
        pendingCandidateChunks: projection.pendingCandidateChunks,
        pendingCandidateEmbeddedChunks: projection.pendingCandidateEmbeddedChunks,
        projectedApprovedChunks: projection.projectedApprovedChunks,
        projectedApprovedEmbeddedChunks: projection.projectedApprovedEmbeddedChunks,
        minProjectedApprovedChunks: projection.minProjectedApprovedChunks,
        reasons: projection.reasons,
      },
    };
  }

  return { ok: true, targetDocIds: requested, chunkCount, projection };
}

async function validateSingleCandidateApproval(input: {
  docId: string;
  minApprovedChunks: number;
}): Promise<{ ok: true } | { ok: false; status: number; error: string; details?: unknown }> {
  const candidate = await db.knowledgeDocument.findUnique({
    where: { docId: input.docId },
    select: { docId: true, reviewStatus: true },
  });

  if (!candidate || candidate.reviewStatus !== "PENDING") {
    return {
      ok: false,
      status: 400,
      error: "Candidate approval can target only a current PENDING candidate document.",
      details: { docId: input.docId, reviewStatus: candidate?.reviewStatus || null },
    };
  }

  const stats = (await candidateChunkStats([input.docId])).get(input.docId) || {
    docId: input.docId,
    chunks: 0,
    embeddedChunks: 0,
  };
  if (stats.chunks === 0 || stats.embeddedChunks < stats.chunks) {
    return {
      ok: false,
      status: 409,
      error: "Candidate approval requires every candidate chunk to have an actual pgvector embedding.",
      details: stats,
    };
  }

  const corpus = await getRagCorpusReadiness({
    minApprovedChunks: input.minApprovedChunks,
    minApprovedEmbeddedChunks: input.minApprovedChunks,
  });
  if (!corpus.ok) {
    return {
      ok: false,
      status: 409,
      error: "Production RAG corpus is still below the approved 500+ chunk baseline; use bulkApproveCandidates for the initial reviewed corpus promotion.",
      details: {
        approvedChunks: corpus.approvedChunks,
        approvedEmbeddedChunks: corpus.approvedEmbeddedChunks,
        minApprovedChunks: corpus.minApprovedChunks,
        reasons: corpus.reasons,
      },
    };
  }

  return { ok: true };
}

export async function GET(req: NextRequest) {
  try {
    const unauthorized = await requireAdmin(req, { roles: ["owner", "admin", "viewer"] });
    if (unauthorized) return unauthorized;

    const documents = await db.knowledgeDocument.findMany({
      include: { chunks: true },
      orderBy: [{ reviewStatus: "asc" }, { lastCheckedAt: "desc" }],
    });

    if (documents.length === 0) {
      const staticDocuments = await Promise.all(staticKnowledgeItems().map(withImpact));
      return NextResponse.json({ documents: staticDocuments, source: "static", readiness: await knowledgeReadinessSummary() });
    }

    const serialized = await Promise.all(documents.map((document) => withImpact(toAdminKnowledgeItem(document))));
    return NextResponse.json({ documents: serialized, source: "db", readiness: await knowledgeReadinessSummary() });
  } catch (err) {
    console.error("[GET /api/admin/knowledge]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const unauthorized = await requireAdmin(req, { roles: ["owner", "admin"] });
    if (unauthorized) return unauthorized;
    const context = await getAdminContext(req);
    const body = (await req.json().catch(() => ({}))) as {
      docId?: string;
      action?: string;
      title?: string;
      content?: string;
      sourceUrl?: string;
      sourceType?: string;
      language?: string;
      jurisdiction?: string;
      topic?: string;
      supersedes?: unknown;
      supersededBy?: string | null;
      docIds?: string[];
      checkedBy?: string;
      checkedAt?: string;
      reviewedBy?: string;
      reviewedAt?: string;
      minApprovedCandidateChunks?: number | string;
      minProjectedApprovedChunks?: number | string;
    };

    if (!isKnowledgeAction(body.action)) {
      return NextResponse.json({ error: "valid action is required" }, { status: 400 });
    }

    const actor = context?.actor || "admin";

    if (body.action === "bulkApproveCandidates" || body.action === "bulkDiscardCandidates") {
      const action = body.action === "bulkApproveCandidates" ? "approve" : "discard";
      const requestedDocIds = stringList(body.docIds);
      const minApprovedCandidateChunks = optionalNumber(body.minApprovedCandidateChunks) ?? 500;
      const minProjectedApprovedChunks = optionalNumber(body.minProjectedApprovedChunks) ?? 500;
      const review = action === "approve" ? candidateApprovalReview(body) : null;
      if (review && !review.ok && requestedDocIds.length > 0) {
        return NextResponse.json({ error: review.error }, { status: 400 });
      }
      const bulkValidation = action === "approve"
        ? await validateBulkCandidateApproval({ requestedDocIds, minApprovedCandidateChunks, minProjectedApprovedChunks })
        : null;
      if (bulkValidation && !bulkValidation.ok) {
        return NextResponse.json(
          { error: bulkValidation.error, details: bulkValidation.details },
          { status: bulkValidation.status }
        );
      }
      const targetDocIds = action === "approve"
        ? bulkValidation?.targetDocIds || []
        : await pendingCandidateDocIds(requestedDocIds);
      const results: Array<{
        docId: string;
        ok: boolean;
        reviewStatus?: string;
        error?: string;
      }> = [];
      const documents: AdminKnowledgeItem[] = [];

      for (const docId of targetDocIds) {
        try {
          const result = action === "approve"
            ? await approveKnowledgeDocument({
                docId,
                actor: review && review.ok ? review.checkedBy : actor,
                now: review && review.ok ? review.checkedAt : undefined,
              })
            : {
                document: await discardKnowledgeDocument({ docId, actor }),
                diff: await analyzeKnowledgeDocumentDiff({ docId, actor }),
              };
          results.push({
            docId,
            ok: true,
            reviewStatus: result.document.reviewStatus,
          });
          documents.push(
            await withImpact({
              ...toAdminKnowledgeItem(result.document),
              diff: result.diff,
            })
          );
        } catch (err) {
          results.push({
            docId,
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      const processed = results.filter((result) => result.ok).length;
      const failed = results.length - processed;
      const postApprovalCorpus = action === "approve" && failed === 0 && targetDocIds.length > 0
        ? await getRagCorpusReadiness({
            minApprovedChunks: minProjectedApprovedChunks,
            minApprovedEmbeddedChunks: minProjectedApprovedChunks,
          })
        : null;
      await recordRequestAudit(req, {
        actor,
        actorRole: context?.role || "admin",
        action: body.action === "bulkApproveCandidates" ? "knowledge.bulk_approve_candidates" : "knowledge.bulk_discard_candidates",
        targetType: "knowledgeDocument",
        metadata: {
          requested: targetDocIds.length,
          processed,
          failed,
          docIdCount: targetDocIds.length,
          docIdsSample: targetDocIds.slice(0, 20),
          checkedBy: review && review.ok ? review.checkedBy : null,
          checkedAt: review && review.ok ? review.checkedAt.toISOString() : null,
          approvedCandidateChunks: bulkValidation && bulkValidation.ok ? bulkValidation.chunkCount : null,
          minApprovedCandidateChunks: action === "approve" ? minApprovedCandidateChunks : null,
          minProjectedApprovedChunks: action === "approve" ? minProjectedApprovedChunks : null,
          projection: bulkValidation && bulkValidation.ok
            ? {
                pendingCandidates: bulkValidation.projection.pendingCandidates,
                pendingCandidateChunks: bulkValidation.projection.pendingCandidateChunks,
                pendingCandidateEmbeddedChunks: bulkValidation.projection.pendingCandidateEmbeddedChunks,
                projectedApprovedChunks: bulkValidation.projection.projectedApprovedChunks,
                projectedApprovedEmbeddedChunks: bulkValidation.projection.projectedApprovedEmbeddedChunks,
                projectedApprovedOfficialChunks: bulkValidation.projection.projectedApprovedOfficialChunks,
                projectedApprovedOfficialEmbeddedChunks: bulkValidation.projection.projectedApprovedOfficialEmbeddedChunks,
                projectedSupersededApprovedDocuments: bulkValidation.projection.projectedSupersededApprovedDocuments,
                reasons: bulkValidation.projection.reasons,
              }
            : null,
          postApprovalCorpus: postApprovalCorpus
            ? {
                ok: postApprovalCorpus.ok,
                approvedDocuments: postApprovalCorpus.approvedDocuments,
                approvedChunks: postApprovalCorpus.approvedChunks,
                approvedEmbeddedChunks: postApprovalCorpus.approvedEmbeddedChunks,
                approvedOfficialDocuments: postApprovalCorpus.approvedOfficialDocuments,
                approvedOfficialChunks: postApprovalCorpus.approvedOfficialChunks,
                approvedOfficialEmbeddedChunks: postApprovalCorpus.approvedOfficialEmbeddedChunks,
                minApprovedChunks: postApprovalCorpus.minApprovedChunks,
                minApprovedOfficialChunks: postApprovalCorpus.minApprovedOfficialChunks,
                reasons: postApprovalCorpus.reasons,
              }
            : null,
        },
        success: failed === 0 && (!postApprovalCorpus || postApprovalCorpus.ok),
      });

      return NextResponse.json({
        ok: failed === 0 && (!postApprovalCorpus || postApprovalCorpus.ok),
        action: body.action,
        requested: targetDocIds.length,
        processed,
        failed,
        results,
        documents,
        readiness: {
          projection: bulkValidation && bulkValidation.ok ? bulkValidation.projection : null,
          corpus: postApprovalCorpus,
        },
      }, { status: failed > 0 ? 207 : postApprovalCorpus && !postApprovalCorpus.ok ? 409 : 200 });
    }

    if (!body.docId) {
      return NextResponse.json({ error: "docId is required" }, { status: 400 });
    }

    const mutationInput = {
      docId: body.docId,
      actor,
      title: body.title,
      content: body.content,
      sourceUrl: body.sourceUrl,
      sourceType: body.sourceType,
      language: body.language,
      jurisdiction: body.jurisdiction,
      topic: body.topic,
      supersedes: body.supersedes,
      supersededBy: body.supersededBy,
    };

    const approvingCandidate = body.action === "approve" && isCandidateDocId(body.docId);
    const candidateReview = approvingCandidate ? candidateApprovalReview(body) : null;
    if (candidateReview && !candidateReview.ok) {
      return NextResponse.json({ error: candidateReview.error }, { status: 400 });
    }
    if (approvingCandidate) {
      const validation = await validateSingleCandidateApproval({
        docId: body.docId,
        minApprovedChunks: 500,
      });
      if (!validation.ok) {
        return NextResponse.json(
          { error: validation.error, details: validation.details },
          { status: validation.status }
        );
      }
    }

    if (body.action === "diff") {
      const diff = await analyzeKnowledgeDocumentDiff(mutationInput);
      await recordRequestAudit(req, {
        actor,
        actorRole: context?.role || "admin",
        action: "knowledge.diff",
        targetType: "knowledgeDocument",
        targetId: body.docId,
        metadata: {
          changed: diff.changed,
          addedChunks: diff.addedChunks,
          removedChunks: diff.removedChunks,
          impact: {
            ruleCount: diff.impact.ruleCount,
            userCount: diff.impact.userCount,
          },
        },
      });
      return NextResponse.json({ ok: true, diff });
    }

    const result =
      body.action === "approve"
        ? await approveKnowledgeDocument({
            ...mutationInput,
            actor: candidateReview && candidateReview.ok ? candidateReview.checkedBy : mutationInput.actor,
            now: candidateReview && candidateReview.ok ? candidateReview.checkedAt : undefined,
          })
        : body.action === "recheck"
          ? await recheckKnowledgeDocument(mutationInput)
          : { document: await discardKnowledgeDocument(mutationInput), diff: await analyzeKnowledgeDocumentDiff(mutationInput) };

    if (!result.document) {
      return NextResponse.json(
        {
          error: "문서가 아직 DB에 없습니다. 변경 사항을 검토한 뒤 승인하면 production RAG에 반영됩니다.",
          diff: result.diff,
        },
        { status: 409 }
      );
    }

    await recordRequestAudit(req, {
      actor,
      actorRole: context?.role || "admin",
      action: `knowledge.${body.action}`,
      targetType: "knowledgeDocument",
      targetId: result.document.docId,
      metadata: {
        reviewStatus: result.document.reviewStatus,
        validTo: result.document.validTo?.toISOString() || null,
        changed: result.diff.changed,
        impact: {
          ruleCount: result.diff.impact.ruleCount,
          userCount: result.diff.impact.userCount,
        },
      },
    });

    const document = await withImpact({
      ...toAdminKnowledgeItem(result.document),
      diff: result.diff,
    });

    return NextResponse.json({ ok: true, document, diff: result.diff });
  } catch (err) {
    console.error("[PATCH /api/admin/knowledge]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
