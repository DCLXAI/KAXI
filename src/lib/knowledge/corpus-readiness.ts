import { db } from "@/lib/db";
import { knowledgeFreshnessCutoff } from "@/lib/knowledge/freshness";
import {
  OFFICIAL_KNOWLEDGE_SOURCE_URL_SQL_REGEX,
  isOfficialKnowledgeSource,
} from "@/lib/knowledge/official-source";

export interface RagCorpusReadinessOptions {
  minApprovedChunks?: number;
  minApprovedEmbeddedChunks?: number;
  minApprovedOfficialChunks?: number;
  minApprovedOfficialEmbeddedChunks?: number;
  now?: Date;
}

export interface RagCorpusReadiness {
  ok: boolean;
  checkedAt: string;
  minApprovedChunks: number;
  minApprovedEmbeddedChunks: number;
  minApprovedOfficialChunks: number;
  minApprovedOfficialEmbeddedChunks: number;
  approvedDocuments: number;
  approvedChunks: number;
  approvedEmbeddedChunks: number;
  approvedOfficialDocuments: number;
  approvedOfficialChunks: number;
  approvedOfficialEmbeddedChunks: number;
  pendingCandidates: number;
  pendingCandidateChunks: number;
  pendingOfficialCandidates: number;
  pendingOfficialCandidateChunks: number;
  totalDocuments: number;
  totalChunks: number;
  reasons: string[];
}

export interface CandidateApprovalReadinessOptions {
  minCandidateChunks?: number;
  minCandidateEmbeddedChunks?: number;
  minProjectedApprovedChunks?: number;
  minProjectedApprovedEmbeddedChunks?: number;
  now?: Date;
}

export interface CandidateApprovalReadiness {
  ok: boolean;
  checkedAt: string;
  minCandidateChunks: number;
  minCandidateEmbeddedChunks: number;
  minProjectedApprovedChunks: number;
  minProjectedApprovedEmbeddedChunks: number;
  pendingCandidates: number;
  pendingCandidateChunks: number;
  pendingCandidateEmbeddedChunks: number;
  pendingOfficialCandidates: number;
  pendingOfficialCandidateChunks: number;
  pendingOfficialCandidateEmbeddedChunks: number;
  currentApprovedDocuments: number;
  currentApprovedChunks: number;
  currentApprovedEmbeddedChunks: number;
  currentApprovedOfficialDocuments: number;
  currentApprovedOfficialChunks: number;
  currentApprovedOfficialEmbeddedChunks: number;
  projectedSupersededApprovedDocuments: number;
  projectedRetainedApprovedChunks: number;
  projectedRetainedApprovedEmbeddedChunks: number;
  projectedRetainedApprovedOfficialChunks: number;
  projectedRetainedApprovedOfficialEmbeddedChunks: number;
  projectedApprovedChunks: number;
  projectedApprovedEmbeddedChunks: number;
  projectedApprovedOfficialChunks: number;
  projectedApprovedOfficialEmbeddedChunks: number;
  allPendingCandidateChunksEmbedded: boolean;
  allPendingOfficialCandidateChunksEmbedded: boolean;
  reasons: string[];
}

type KnowledgeRowForProjection = {
  docId: string;
  sourceUrl: string;
  sourceType: string;
  supersedes: unknown;
  chunkCount: number;
  embeddedChunks: number;
};

type ChunkStatsRow = {
  doc_id: string;
  chunks: bigint;
  embedded_chunks: bigint;
};

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function chunkStats(rows: KnowledgeRowForProjection[]) {
  return rows.reduce(
    (acc, row) => {
      acc.chunks += row.chunkCount;
      acc.embeddedChunks += row.embeddedChunks;
      return acc;
    },
    { chunks: 0, embeddedChunks: 0 }
  );
}

function isSupersededByCandidates(row: KnowledgeRowForProjection, candidateSupersedes: Set<string>): boolean {
  if (candidateSupersedes.has(row.docId)) return true;
  return stringArray(row.supersedes).some((docId) => candidateSupersedes.has(docId));
}

export async function getCandidateApprovalReadiness(
  options: CandidateApprovalReadinessOptions = {}
): Promise<CandidateApprovalReadiness> {
  const now = options.now || new Date();
  const freshnessCutoff = knowledgeFreshnessCutoff(now);
  const minCandidateChunks = options.minCandidateChunks ?? 500;
  const minCandidateEmbeddedChunks = options.minCandidateEmbeddedChunks ?? minCandidateChunks;
  const minProjectedApprovedChunks = options.minProjectedApprovedChunks ?? 500;
  const minProjectedApprovedEmbeddedChunks = options.minProjectedApprovedEmbeddedChunks ?? minProjectedApprovedChunks;

  const [pendingCandidateDocs, currentApprovedDocs, pendingCandidateChunkStats, currentApprovedChunkStats] = await Promise.all([
    db.knowledgeDocument.findMany({
      where: {
        reviewStatus: "PENDING",
        docId: { contains: "__candidate__" },
      },
      select: {
        docId: true,
        sourceUrl: true,
        sourceType: true,
        supersedes: true,
      },
    }),
    db.knowledgeDocument.findMany({
      where: {
        reviewStatus: "APPROVED",
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gte: now } }],
        lastCheckedAt: { gte: freshnessCutoff },
        supersededBy: null,
      },
      select: {
        docId: true,
        sourceUrl: true,
        sourceType: true,
        supersedes: true,
      },
    }),
    db.$queryRaw<ChunkStatsRow[]>`
      SELECT
        d."docId" AS doc_id,
        count(c.id)::bigint AS chunks,
        count(c.id) FILTER (WHERE c.embedding IS NOT NULL)::bigint AS embedded_chunks
      FROM "KnowledgeDocument" d
      LEFT JOIN "KnowledgeChunk" c ON c."documentId" = d.id
      WHERE d."reviewStatus" = 'PENDING'
        AND d."docId" LIKE '%__candidate__%'
      GROUP BY d."docId"
    `,
    db.$queryRaw<ChunkStatsRow[]>`
      SELECT
        d."docId" AS doc_id,
        count(c.id)::bigint AS chunks,
        count(c.id) FILTER (WHERE c.embedding IS NOT NULL)::bigint AS embedded_chunks
      FROM "KnowledgeDocument" d
      LEFT JOIN "KnowledgeChunk" c ON c."documentId" = d.id
      WHERE d."reviewStatus" = 'APPROVED'
        AND d."validFrom" <= ${now}
        AND (d."validTo" IS NULL OR d."validTo" >= ${now})
        AND d."lastCheckedAt" >= ${freshnessCutoff}
        AND d."supersededBy" IS NULL
      GROUP BY d."docId"
    `,
  ]);

  const pendingStatsByDocId = new Map(pendingCandidateChunkStats.map((row) => [
    row.doc_id,
    { chunkCount: Number(row.chunks || 0), embeddedChunks: Number(row.embedded_chunks || 0) },
  ]));
  const approvedStatsByDocId = new Map(currentApprovedChunkStats.map((row) => [
    row.doc_id,
    { chunkCount: Number(row.chunks || 0), embeddedChunks: Number(row.embedded_chunks || 0) },
  ]));
  const pendingCandidates = pendingCandidateDocs.map((doc) => ({
    ...doc,
    ...(pendingStatsByDocId.get(doc.docId) || { chunkCount: 0, embeddedChunks: 0 }),
  }));
  const currentApproved = currentApprovedDocs.map((doc) => ({
    ...doc,
    ...(approvedStatsByDocId.get(doc.docId) || { chunkCount: 0, embeddedChunks: 0 }),
  }));

  const candidateSupersedes = new Set(pendingCandidates.flatMap((candidate) => stringArray(candidate.supersedes)));
  const approvedToRetain = currentApproved.filter((row) => !isSupersededByCandidates(row, candidateSupersedes));
  const officialPendingCandidates = pendingCandidates.filter(isOfficialKnowledgeSource);
  const officialCurrentApproved = currentApproved.filter(isOfficialKnowledgeSource);
  const officialApprovedToRetain = approvedToRetain.filter(isOfficialKnowledgeSource);
  const currentStats = chunkStats(currentApproved);
  const currentOfficialStats = chunkStats(officialCurrentApproved);
  const retainedStats = chunkStats(approvedToRetain);
  const retainedOfficialStats = chunkStats(officialApprovedToRetain);
  const candidateStats = chunkStats(pendingCandidates);
  const officialCandidateStats = chunkStats(officialPendingCandidates);
  const projectedApprovedChunks = retainedStats.chunks + candidateStats.chunks;
  const projectedApprovedEmbeddedChunks = retainedStats.embeddedChunks + candidateStats.embeddedChunks;
  const projectedApprovedOfficialChunks = retainedOfficialStats.chunks + officialCandidateStats.chunks;
  const projectedApprovedOfficialEmbeddedChunks = retainedOfficialStats.embeddedChunks + officialCandidateStats.embeddedChunks;

  const reasons: string[] = [];
  if (pendingCandidates.length === 0) reasons.push("no_pending_candidates");
  if (officialPendingCandidates.length < pendingCandidates.length) reasons.push("pending_candidate_non_official_sources_present");
  if (candidateStats.chunks < minCandidateChunks) reasons.push(`pending_candidate_chunks_below_${minCandidateChunks}`);
  if (candidateStats.embeddedChunks < minCandidateEmbeddedChunks) {
    reasons.push(`pending_candidate_embedded_chunks_below_${minCandidateEmbeddedChunks}`);
  }
  if (candidateStats.embeddedChunks < candidateStats.chunks) reasons.push("pending_candidate_chunks_not_fully_embedded");
  if (officialCandidateStats.chunks < minCandidateChunks) reasons.push(`pending_official_candidate_chunks_below_${minCandidateChunks}`);
  if (officialCandidateStats.embeddedChunks < minCandidateEmbeddedChunks) {
    reasons.push(`pending_official_candidate_embedded_chunks_below_${minCandidateEmbeddedChunks}`);
  }
  if (officialCandidateStats.embeddedChunks < officialCandidateStats.chunks) {
    reasons.push("pending_official_candidate_chunks_not_fully_embedded");
  }
  if (projectedApprovedChunks < minProjectedApprovedChunks) {
    reasons.push(`projected_approved_chunks_below_${minProjectedApprovedChunks}`);
  }
  if (projectedApprovedEmbeddedChunks < minProjectedApprovedEmbeddedChunks) {
    reasons.push(`projected_approved_embedded_chunks_below_${minProjectedApprovedEmbeddedChunks}`);
  }
  if (projectedApprovedOfficialChunks < minProjectedApprovedChunks) {
    reasons.push(`projected_approved_official_chunks_below_${minProjectedApprovedChunks}`);
  }
  if (projectedApprovedOfficialEmbeddedChunks < minProjectedApprovedEmbeddedChunks) {
    reasons.push(`projected_approved_official_embedded_chunks_below_${minProjectedApprovedEmbeddedChunks}`);
  }

  return {
    ok: reasons.length === 0,
    checkedAt: now.toISOString(),
    minCandidateChunks,
    minCandidateEmbeddedChunks,
    minProjectedApprovedChunks,
    minProjectedApprovedEmbeddedChunks,
    pendingCandidates: pendingCandidates.length,
    pendingCandidateChunks: candidateStats.chunks,
    pendingCandidateEmbeddedChunks: candidateStats.embeddedChunks,
    pendingOfficialCandidates: officialPendingCandidates.length,
    pendingOfficialCandidateChunks: officialCandidateStats.chunks,
    pendingOfficialCandidateEmbeddedChunks: officialCandidateStats.embeddedChunks,
    currentApprovedDocuments: currentApproved.length,
    currentApprovedChunks: currentStats.chunks,
    currentApprovedEmbeddedChunks: currentStats.embeddedChunks,
    currentApprovedOfficialDocuments: officialCurrentApproved.length,
    currentApprovedOfficialChunks: currentOfficialStats.chunks,
    currentApprovedOfficialEmbeddedChunks: currentOfficialStats.embeddedChunks,
    projectedSupersededApprovedDocuments: currentApproved.length - approvedToRetain.length,
    projectedRetainedApprovedChunks: retainedStats.chunks,
    projectedRetainedApprovedEmbeddedChunks: retainedStats.embeddedChunks,
    projectedRetainedApprovedOfficialChunks: retainedOfficialStats.chunks,
    projectedRetainedApprovedOfficialEmbeddedChunks: retainedOfficialStats.embeddedChunks,
    projectedApprovedChunks,
    projectedApprovedEmbeddedChunks,
    projectedApprovedOfficialChunks,
    projectedApprovedOfficialEmbeddedChunks,
    allPendingCandidateChunksEmbedded: candidateStats.chunks > 0 && candidateStats.embeddedChunks === candidateStats.chunks,
    allPendingOfficialCandidateChunksEmbedded:
      officialCandidateStats.chunks > 0 && officialCandidateStats.embeddedChunks === officialCandidateStats.chunks,
    reasons,
  };
}

export async function getRagCorpusReadiness(
  options: RagCorpusReadinessOptions = {}
): Promise<RagCorpusReadiness> {
  const now = options.now || new Date();
  const freshnessCutoff = knowledgeFreshnessCutoff(now);
  const minApprovedChunks = options.minApprovedChunks ?? 500;
  const minApprovedEmbeddedChunks = options.minApprovedEmbeddedChunks ?? minApprovedChunks;
  const minApprovedOfficialChunks = options.minApprovedOfficialChunks ?? minApprovedChunks;
  const minApprovedOfficialEmbeddedChunks =
    options.minApprovedOfficialEmbeddedChunks ??
    (options.minApprovedOfficialChunks === undefined ? minApprovedEmbeddedChunks : minApprovedOfficialChunks);
  const [stats] = await db.$queryRaw<
    Array<{
      total_documents: bigint;
      approved_documents: bigint;
      approved_official_documents: bigint;
      pending_candidates: bigint;
      pending_official_candidates: bigint;
      total_chunks: bigint;
      approved_chunks: bigint;
      approved_embedded_chunks: bigint;
      approved_official_chunks: bigint;
      approved_official_embedded_chunks: bigint;
      pending_candidate_chunks: bigint;
      pending_official_candidate_chunks: bigint;
    }>
  >`
    SELECT
      count(DISTINCT d.id)::bigint AS total_documents,
      count(DISTINCT d.id) FILTER (
        WHERE d."reviewStatus" = 'APPROVED'
          AND d."validFrom" <= ${now}
          AND (d."validTo" IS NULL OR d."validTo" >= ${now})
          AND d."lastCheckedAt" >= ${freshnessCutoff}
          AND d."supersededBy" IS NULL
      )::bigint AS approved_documents,
      count(DISTINCT d.id) FILTER (
        WHERE d."reviewStatus" = 'APPROVED'
          AND d."validFrom" <= ${now}
          AND (d."validTo" IS NULL OR d."validTo" >= ${now})
          AND d."lastCheckedAt" >= ${freshnessCutoff}
          AND d."supersededBy" IS NULL
          AND left(d."sourceType", 9) = 'official_'
          AND d."sourceUrl" ~* ${OFFICIAL_KNOWLEDGE_SOURCE_URL_SQL_REGEX}
      )::bigint AS approved_official_documents,
      count(DISTINCT d.id) FILTER (
        WHERE d."reviewStatus" = 'PENDING'
          AND d."docId" LIKE '%__candidate__%'
      )::bigint AS pending_candidates,
      count(DISTINCT d.id) FILTER (
        WHERE d."reviewStatus" = 'PENDING'
          AND d."docId" LIKE '%__candidate__%'
          AND left(d."sourceType", 9) = 'official_'
          AND d."sourceUrl" ~* ${OFFICIAL_KNOWLEDGE_SOURCE_URL_SQL_REGEX}
      )::bigint AS pending_official_candidates,
      count(c.id)::bigint AS total_chunks,
      count(c.id) FILTER (
        WHERE d."reviewStatus" = 'APPROVED'
          AND d."validFrom" <= ${now}
          AND (d."validTo" IS NULL OR d."validTo" >= ${now})
          AND d."lastCheckedAt" >= ${freshnessCutoff}
          AND d."supersededBy" IS NULL
      )::bigint AS approved_chunks,
      count(c.id) FILTER (
        WHERE d."reviewStatus" = 'APPROVED'
          AND d."validFrom" <= ${now}
          AND (d."validTo" IS NULL OR d."validTo" >= ${now})
          AND d."lastCheckedAt" >= ${freshnessCutoff}
          AND d."supersededBy" IS NULL
          AND c.embedding IS NOT NULL
      )::bigint AS approved_embedded_chunks,
      count(c.id) FILTER (
        WHERE d."reviewStatus" = 'APPROVED'
          AND d."validFrom" <= ${now}
          AND (d."validTo" IS NULL OR d."validTo" >= ${now})
          AND d."lastCheckedAt" >= ${freshnessCutoff}
          AND d."supersededBy" IS NULL
          AND left(d."sourceType", 9) = 'official_'
          AND d."sourceUrl" ~* ${OFFICIAL_KNOWLEDGE_SOURCE_URL_SQL_REGEX}
      )::bigint AS approved_official_chunks,
      count(c.id) FILTER (
        WHERE d."reviewStatus" = 'APPROVED'
          AND d."validFrom" <= ${now}
          AND (d."validTo" IS NULL OR d."validTo" >= ${now})
          AND d."lastCheckedAt" >= ${freshnessCutoff}
          AND d."supersededBy" IS NULL
          AND left(d."sourceType", 9) = 'official_'
          AND d."sourceUrl" ~* ${OFFICIAL_KNOWLEDGE_SOURCE_URL_SQL_REGEX}
          AND c.embedding IS NOT NULL
      )::bigint AS approved_official_embedded_chunks,
      count(c.id) FILTER (
        WHERE d."reviewStatus" = 'PENDING'
          AND d."docId" LIKE '%__candidate__%'
      )::bigint AS pending_candidate_chunks
      ,
      count(c.id) FILTER (
        WHERE d."reviewStatus" = 'PENDING'
          AND d."docId" LIKE '%__candidate__%'
          AND left(d."sourceType", 9) = 'official_'
          AND d."sourceUrl" ~* ${OFFICIAL_KNOWLEDGE_SOURCE_URL_SQL_REGEX}
      )::bigint AS pending_official_candidate_chunks
    FROM "KnowledgeDocument" d
    LEFT JOIN "KnowledgeChunk" c ON c."documentId" = d.id
  `;

  const approvedChunks = Number(stats?.approved_chunks || 0);
  const approvedEmbeddedChunks = Number(stats?.approved_embedded_chunks || 0);
  const approvedOfficialChunks = Number(stats?.approved_official_chunks || 0);
  const approvedOfficialEmbeddedChunks = Number(stats?.approved_official_embedded_chunks || 0);
  const reasons: string[] = [];
  if (approvedChunks < minApprovedChunks) {
    reasons.push(`approved_chunks_below_${minApprovedChunks}`);
  }
  if (approvedEmbeddedChunks < minApprovedEmbeddedChunks) {
    reasons.push(`approved_embedded_chunks_below_${minApprovedEmbeddedChunks}`);
  }
  if (approvedOfficialChunks < minApprovedOfficialChunks) {
    reasons.push(`approved_official_chunks_below_${minApprovedOfficialChunks}`);
  }
  if (approvedOfficialEmbeddedChunks < minApprovedOfficialEmbeddedChunks) {
    reasons.push(`approved_official_embedded_chunks_below_${minApprovedOfficialEmbeddedChunks}`);
  }

  return {
    ok: reasons.length === 0,
    checkedAt: now.toISOString(),
    minApprovedChunks,
    minApprovedEmbeddedChunks,
    minApprovedOfficialChunks,
    minApprovedOfficialEmbeddedChunks,
    approvedDocuments: Number(stats?.approved_documents || 0),
    approvedChunks,
    approvedEmbeddedChunks,
    approvedOfficialDocuments: Number(stats?.approved_official_documents || 0),
    approvedOfficialChunks,
    approvedOfficialEmbeddedChunks,
    pendingCandidates: Number(stats?.pending_candidates || 0),
    pendingCandidateChunks: Number(stats?.pending_candidate_chunks || 0),
    pendingOfficialCandidates: Number(stats?.pending_official_candidates || 0),
    pendingOfficialCandidateChunks: Number(stats?.pending_official_candidate_chunks || 0),
    totalDocuments: Number(stats?.total_documents || 0),
    totalChunks: Number(stats?.total_chunks || 0),
    reasons,
  };
}
