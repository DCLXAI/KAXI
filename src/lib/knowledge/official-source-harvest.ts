import { db } from "@/lib/db";
import {
  getOfficialKnowledgeSourceWatchlist,
  runOfficialKnowledgeSourceMonitor,
  type OfficialKnowledgeSource,
} from "@/lib/knowledge/source-monitor";
import {
  emptyOfficialSourceExtractionStats,
  type OfficialSourceExtractionMethod,
} from "@/lib/knowledge/harvest-metadata";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface OfficialSourceHarvestOptions {
  actor?: string;
  persistCandidates?: boolean;
  sourceIds?: string[];
  maxSources?: number;
  maxChars?: number;
  chunkMaxChars?: number;
  timeoutMs?: number;
  minCandidateChunks?: number;
  sources?: OfficialKnowledgeSource[];
  fetchImpl?: FetchLike;
  now?: Date;
}

export interface OfficialSourceHarvestSummary {
  checkedAt: string;
  persistCandidates: boolean;
  totalSources: number;
  changedSources: number;
  failedSources: number;
  candidatesCreated: number;
  extractionStats: Record<OfficialSourceExtractionMethod, number>;
  totalExtractedChars: number;
  extractionErrors: Array<{ docId: string; sourceUrl: string; method?: OfficialSourceExtractionMethod; error: string }>;
  totalCandidateChunks: number;
  changedCandidateChunks: number;
  persistedPendingChunks: number;
  minCandidateChunks: number;
  meetsChunkTarget: boolean;
  failedDocIds: string[];
  failedSourceErrors: Array<{ docId: string; sourceUrl: string; error: string }>;
}

export function selectOfficialKnowledgeSources(options: {
  sourceIds?: string[];
  maxSources?: number;
  sources?: OfficialKnowledgeSource[];
} = {}): OfficialKnowledgeSource[] {
  const all = options.sources || getOfficialKnowledgeSourceWatchlist();
  const requested = new Set((options.sourceIds || []).map((item) => item.trim()).filter(Boolean));
  const filtered = requested.size > 0 ? all.filter((source) => requested.has(source.docId)) : all;
  return options.maxSources && options.maxSources > 0 ? filtered.slice(0, options.maxSources) : filtered;
}

async function countPendingCandidateChunks(): Promise<number> {
  return db.knowledgeChunk.count({
    where: {
      document: {
        reviewStatus: "PENDING",
        docId: { contains: "__candidate__" },
      },
    },
  });
}

export async function harvestOfficialKnowledgeCorpus(
  options: OfficialSourceHarvestOptions = {}
): Promise<OfficialSourceHarvestSummary> {
  const minCandidateChunks = options.minCandidateChunks ?? 500;
  const sources = selectOfficialKnowledgeSources(options);
  const monitor = await runOfficialKnowledgeSourceMonitor({
    actor: options.actor || "official-source-harvest",
    persistCandidates: options.persistCandidates ?? true,
    sources,
    fetchImpl: options.fetchImpl,
    timeoutMs: options.timeoutMs,
    maxChars: options.maxChars,
    chunkMaxChars: options.chunkMaxChars ?? 1200,
    now: options.now,
  });
  const totalCandidateChunks = monitor.results.reduce((sum, result) => sum + (result.candidateChunkCount || 0), 0);
  const changedCandidateChunks = monitor.results
    .filter((result) => result.status === "changed")
    .reduce((sum, result) => sum + (result.candidateChunkCount || 0), 0);
  const persistedPendingChunks = options.persistCandidates === false ? 0 : await countPendingCandidateChunks();
  const extractionStats = emptyOfficialSourceExtractionStats();
  let totalExtractedChars = 0;
  const extractionErrors: OfficialSourceHarvestSummary["extractionErrors"] = [];
  for (const result of monitor.results) {
    if (result.extractionMethod) extractionStats[result.extractionMethod] += 1;
    totalExtractedChars += result.extractedCharCount || 0;
    if (result.extractionError) {
      extractionErrors.push({
        docId: result.docId,
        sourceUrl: result.sourceUrl,
        method: result.extractionMethod,
        error: result.extractionError,
      });
    }
  }

  return {
    checkedAt: monitor.checkedAt,
    persistCandidates: monitor.persistCandidates,
    totalSources: monitor.total,
    changedSources: monitor.changed,
    failedSources: monitor.failed,
    candidatesCreated: monitor.candidatesCreated,
    extractionStats,
    totalExtractedChars,
    extractionErrors,
    totalCandidateChunks,
    changedCandidateChunks,
    persistedPendingChunks,
    minCandidateChunks,
    meetsChunkTarget: totalCandidateChunks >= minCandidateChunks || persistedPendingChunks >= minCandidateChunks,
    failedDocIds: monitor.results
      .filter((result) => result.status === "failed")
      .map((result) => result.docId),
    failedSourceErrors: monitor.results
      .filter((result) => result.status === "failed")
      .map((result) => ({
        docId: result.docId,
        sourceUrl: result.sourceUrl,
        error: result.error || "unknown_error",
      })),
  };
}
