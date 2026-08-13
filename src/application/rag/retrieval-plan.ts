import { createHash } from "crypto";
import { RETRIEVAL_CONFIDENCE_POLICY_VERSION } from "@/lib/chat/retrieval-confidence";

export const RETRIEVAL_PLAN_VERSION = "kaxi-retrieval-plan-v1";
export const RETRIEVAL_SCORE_VERSION = "rrf-k60+deterministic-locale-intent-v11";

export const RETRIEVAL_PLAN = Object.freeze({
  version: RETRIEVAL_PLAN_VERSION,
  scoreVersion: RETRIEVAL_SCORE_VERSION,
  thresholdSet: RETRIEVAL_CONFIDENCE_POLICY_VERSION,
  stages: Object.freeze([
    "governance-filter",
    "question-mediation",
    "lexical-candidates",
    "vector-candidates",
    "reciprocal-rank-fusion",
    "deterministic-rerank",
    "confidence-no-context",
    "citation-validation",
  ] as const),
});

type JsonRecord = Record<string, unknown>;

export type RetrievalReplayCandidate = Readonly<{
  id: string;
  rerankScore?: number | null;
  hybridScore?: number | null;
  lexicalScore?: number | null;
  vectorScore?: number | null;
  originalRank?: number | null;
}>;

export type RetrievalReplaySpec = Readonly<{
  version: 1;
  planVersion: string;
  scoreVersion: string;
  thresholdSet: string;
  corpusSnapshotId: string;
  selectedIds: string[];
  ranking: "score-desc-id-asc-v1";
  candidateCount: number;
}>;

export type RetrievalPlanSnapshot = Readonly<{
  planVersion: string;
  scoreVersion: string;
  thresholdSet: string;
  embeddingSource: string;
  candidateCount: number;
  corpusSnapshotId: string;
  replaySpec: RetrievalReplaySpec;
}>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function finite(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nonNegativeInteger(value: unknown): number | null {
  const parsed = finite(value);
  return parsed === null ? null : Math.max(0, Math.trunc(parsed));
}

function sourceIdentity(value: unknown, index: number): string {
  const source = record(value);
  return text(source.docId)
    || text(source.id)
    || text(source.sourceUrl)
    || `selected-${index + 1}`;
}

function stableSourceProjection(value: unknown, index: number) {
  const source = record(value);
  return {
    id: sourceIdentity(source, index),
    checkedAt: text(source.checkedAt),
    contentHash: text(source.contentHash),
    category: text(source.category),
    language: text(source.language),
  };
}

function corpusSnapshotId(searchMeta: JsonRecord, sources: unknown[]): string {
  const supplied = text(searchMeta.corpusSnapshotId);
  if (supplied) return supplied;
  const projection = sources.map(stableSourceProjection).sort((left, right) => left.id.localeCompare(right.id));
  return `sha256:${createHash("sha256").update(JSON.stringify(projection)).digest("hex")}`;
}

function candidateCount(searchMeta: JsonRecord): number {
  return nonNegativeInteger(searchMeta.candidateCount)
    ?? nonNegativeInteger(searchMeta.rawRetrievedCount)
    ?? nonNegativeInteger(searchMeta.validatedCandidateCount)
    ?? nonNegativeInteger(searchMeta.retrievedCount)
    ?? 0;
}

export function buildRetrievalPlanSnapshot(searchMetaValue: unknown, sourcesValue: unknown): RetrievalPlanSnapshot {
  const searchMeta = record(searchMetaValue);
  const sources = Array.isArray(sourcesValue) ? sourcesValue : [];
  const scoreVersion = text(searchMeta.scoreVersion) || RETRIEVAL_PLAN.scoreVersion;
  const thresholdSet = text(searchMeta.thresholdSet)
    || text(searchMeta.confidencePolicy)
    || RETRIEVAL_PLAN.thresholdSet;
  const snapshotId = corpusSnapshotId(searchMeta, sources);
  const count = candidateCount(searchMeta);
  const selectedIds = sources.map(sourceIdentity);
  return {
    planVersion: RETRIEVAL_PLAN.version,
    scoreVersion,
    thresholdSet,
    embeddingSource: text(searchMeta.embeddingSource)
      || text(searchMeta.vectorStrategy)
      || text(searchMeta.embeddingProvider)
      || "none",
    candidateCount: count,
    corpusSnapshotId: snapshotId,
    replaySpec: {
      version: 1,
      planVersion: RETRIEVAL_PLAN.version,
      scoreVersion,
      thresholdSet,
      corpusSnapshotId: snapshotId,
      selectedIds,
      ranking: "score-desc-id-asc-v1",
      candidateCount: count,
    },
  };
}

export function withRetrievalPlanMetadata(searchMetaValue: unknown, sourcesValue: unknown): JsonRecord {
  const searchMeta = record(searchMetaValue);
  const snapshot = buildRetrievalPlanSnapshot(searchMeta, sourcesValue);
  return {
    ...searchMeta,
    planVersion: snapshot.planVersion,
    scoreVersion: snapshot.scoreVersion,
    thresholdSet: snapshot.thresholdSet,
    embeddingSource: snapshot.embeddingSource,
    candidateCount: snapshot.candidateCount,
    corpusSnapshotId: snapshot.corpusSnapshotId,
    retrievalStages: [...RETRIEVAL_PLAN.stages],
    replaySpec: snapshot.replaySpec,
  };
}

function score(candidate: RetrievalReplayCandidate): number {
  return candidate.rerankScore
    ?? candidate.hybridScore
    ?? candidate.lexicalScore
    ?? candidate.vectorScore
    ?? Number.NEGATIVE_INFINITY;
}

/** Replays the persisted deterministic final ordering over a frozen candidate set. */
export function replayRetrievalSelection(
  spec: RetrievalReplaySpec,
  candidates: readonly RetrievalReplayCandidate[],
): string[] {
  if (spec.version !== 1 || spec.planVersion !== RETRIEVAL_PLAN.version) {
    throw new Error("RETRIEVAL_REPLAY_VERSION_UNSUPPORTED");
  }
  const selected = new Set(spec.selectedIds);
  return [...candidates]
    .filter((candidate) => selected.has(candidate.id))
    .sort((left, right) =>
      score(right) - score(left)
      || (left.originalRank ?? Number.MAX_SAFE_INTEGER) - (right.originalRank ?? Number.MAX_SAFE_INTEGER)
      || left.id.localeCompare(right.id))
    .map((candidate) => candidate.id);
}
