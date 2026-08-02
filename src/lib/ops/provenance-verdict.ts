import { RAG_QUERY_EMBEDDING_DIMENSIONS, RAG_QUERY_EMBEDDING_MODEL } from "@/lib/chat/query-embedding";

// P0-7. A RAG answer is produced by three different systems, and the health
// check compared all three against one identity.
//
// n8n orchestrates the request. KARXY's own direct hybrid does the retrieval.
// An LLM writes the answer. Their versions move independently, so collapsing
// them into a single {workflowId, workflowVersionId, modelVersion,
// promptVersion} blob and comparing it against the n8n workflow identity is a
// category error: a perfectly correct direct-hybrid answer records the
// RETRIEVER's identity and is then reported as orchestration drift.
//
// It was worse than a false positive. The expected values were hardcoded and
// had gone stale on three of four fields —
//
//   expected  kaxi-rag-runtime@2026-07-14.railway-mcp-v2
//   live      kaxi-rag-runtime@2026-07-14.railway-mcp-v3
//   expected  retrieval/hybrid-rrf-v3@2026-07-14
//   live      retrieval/hybrid-rrf-v3+rerank-v11@2026-07-14
//   expected  kaxi-grounded-extractive@2026-07-13.p0-v1
//   live      kaxi-rag-capability@2026-07-14.v4
//
// — so the comparison could never match, fired on every run, and was
// eventually downgraded to a warning to stop it holding health at `degraded`.
// A signal that always fires is a signal nobody reads.
//
// The rule this module encodes: assert what you can derive, report what you
// cannot. Retrieval identity comes from the same constants the retriever uses,
// so it cannot drift without the code changing and a mismatch is a real
// finding. Orchestration and generation versions belong to systems we do not
// compile, so they are recorded and compared only when an expectation was
// actually supplied — never against a literal someone typed months ago.

export type ProvenanceComponent = "orchestration" | "retrieval" | "generation";

export type ComponentVerdict =
  | { status: "match" }
  | { status: "not_applicable"; reason: string }
  | { status: "unverifiable"; reason: string }
  | { status: "drift"; reason: string; expected: string; actual: string };

export interface RetrievalIdentity {
  provider: string;
  embeddingModel: string;
  embeddingDimensions: number;
}

/**
 * What a KARXY-retrieved answer must have used.
 *
 * Derived from the constants the retriever itself imports, so this cannot go
 * stale the way a hand-written version string does — changing the embedding
 * model changes this expectation in the same commit.
 */
export function expectedRetrievalIdentity(): RetrievalIdentity {
  return {
    provider: "karxy-supabase",
    embeddingModel: RAG_QUERY_EMBEDDING_MODEL,
    embeddingDimensions: RAG_QUERY_EMBEDDING_DIMENSIONS,
  };
}

/** Runtime paths that perform their own retrieval. */
const RETRIEVING_PATHS = new Set(["kaxi-direct-hybrid", "kaxi-direct-lexical"]);
/** Runtime paths that answer without retrieving, and legitimately so. */
const NON_RETRIEVING_PATHS = new Set(["kaxi-question-mediator"]);

export interface RunProvenanceInput {
  /** Distinct runtime paths the run actually exercised. */
  observedPaths: string[];
  /** What the retrieval layer reported, when it ran. */
  retrieval: Partial<RetrievalIdentity> | null;
  /** The orchestration identity a run recorded, if any. */
  orchestration: { workflowId?: string; workflowVersionId?: string } | null;
  /**
   * The orchestration identity an operator explicitly configured. Absent means
   * "nobody declared one", which is reported as unverifiable rather than
   * checked against a stale literal.
   */
  expectedOrchestration?: { workflowId?: string; workflowVersionId?: string } | null;
}

export interface RunProvenanceVerdict {
  orchestration: ComponentVerdict;
  retrieval: ComponentVerdict;
  /** True only when a component actually drifted — not when one is unverifiable. */
  drifted: boolean;
  /** Components that could not be checked, so the gap stays visible. */
  unverifiable: ProvenanceComponent[];
  observedPaths: string[];
  /** A run that exercised several paths is normal, and must be recorded as such. */
  mixedPaths: boolean;
}

/**
 * Judges each component against the expectation that applies to IT.
 *
 * A drifted retrieval identity is a real quality finding: the answers under
 * test were retrieved differently from what the gate assumes. An orchestration
 * version we were never told to expect is not a finding at all, and saying so
 * is the difference between a signal and noise.
 */
export function classifyRunProvenance(input: RunProvenanceInput): RunProvenanceVerdict {
  const observedPaths = [...new Set(input.observedPaths.filter(Boolean))].sort();
  const retrieved = observedPaths.some((path) => RETRIEVING_PATHS.has(path));
  const onlyNonRetrieving = observedPaths.length > 0
    && observedPaths.every((path) => NON_RETRIEVING_PATHS.has(path));

  let retrieval: ComponentVerdict;
  if (onlyNonRetrieving) {
    // A clarification answer never searched. Counting that as "pgvector was not
    // used" is how a correct response became a failing case.
    retrieval = { status: "not_applicable", reason: "the run only exercised paths that answer without retrieving" };
  } else if (!input.retrieval || !retrieved) {
    retrieval = { status: "unverifiable", reason: "no retrieval identity was recorded for this run" };
  } else {
    const expected = expectedRetrievalIdentity();
    const actual = input.retrieval;
    const mismatches: string[] = [];
    if (actual.embeddingModel && actual.embeddingModel !== expected.embeddingModel) {
      mismatches.push(`embeddingModel ${actual.embeddingModel} != ${expected.embeddingModel}`);
    }
    if (actual.embeddingDimensions && actual.embeddingDimensions !== expected.embeddingDimensions) {
      mismatches.push(`embeddingDimensions ${actual.embeddingDimensions} != ${expected.embeddingDimensions}`);
    }
    if (actual.provider && actual.provider !== expected.provider) {
      mismatches.push(`provider ${actual.provider} != ${expected.provider}`);
    }
    retrieval = mismatches.length === 0
      ? { status: "match" }
      : {
          status: "drift",
          reason: mismatches.join("; "),
          expected: `${expected.provider}/${expected.embeddingModel}@${expected.embeddingDimensions}`,
          actual: `${actual.provider ?? "?"}/${actual.embeddingModel ?? "?"}@${actual.embeddingDimensions ?? "?"}`,
        };
  }

  let orchestration: ComponentVerdict;
  const expectedOrch = input.expectedOrchestration;
  const declared = Boolean(expectedOrch?.workflowId || expectedOrch?.workflowVersionId);
  if (!declared) {
    // Deliberately NOT compared against a built-in literal. That is what went
    // stale and turned this check into noise.
    orchestration = {
      status: "unverifiable",
      reason: "no expected orchestration identity is configured; set N8N_RAG_WORKFLOW_ID / N8N_RAG_WORKFLOW_VERSION_ID to assert one",
    };
  } else if (!input.orchestration?.workflowId && !input.orchestration?.workflowVersionId) {
    orchestration = { status: "unverifiable", reason: "the run recorded no orchestration identity" };
  } else {
    const mismatches: string[] = [];
    if (expectedOrch?.workflowId && input.orchestration.workflowId
        && expectedOrch.workflowId !== input.orchestration.workflowId) {
      mismatches.push(`workflowId ${input.orchestration.workflowId} != ${expectedOrch.workflowId}`);
    }
    if (expectedOrch?.workflowVersionId && input.orchestration.workflowVersionId
        && expectedOrch.workflowVersionId !== input.orchestration.workflowVersionId) {
      mismatches.push(`workflowVersionId ${input.orchestration.workflowVersionId} != ${expectedOrch.workflowVersionId}`);
    }
    orchestration = mismatches.length === 0
      ? { status: "match" }
      : {
          status: "drift",
          reason: mismatches.join("; "),
          expected: `${expectedOrch?.workflowId ?? "?"}@${expectedOrch?.workflowVersionId ?? "?"}`,
          actual: `${input.orchestration.workflowId ?? "?"}@${input.orchestration.workflowVersionId ?? "?"}`,
        };
  }

  const unverifiable: ProvenanceComponent[] = [];
  if (orchestration.status === "unverifiable") unverifiable.push("orchestration");
  if (retrieval.status === "unverifiable") unverifiable.push("retrieval");

  return {
    orchestration,
    retrieval,
    drifted: orchestration.status === "drift" || retrieval.status === "drift",
    unverifiable,
    observedPaths,
    mixedPaths: observedPaths.length > 1,
  };
}

/** One line an operator can act on, without opening the JSON. */
export function describeRunProvenance(verdict: RunProvenanceVerdict): string {
  const parts: string[] = [];
  for (const [component, result] of [
    ["retrieval", verdict.retrieval],
    ["orchestration", verdict.orchestration],
  ] as const) {
    if (result.status === "drift") parts.push(`${component} drifted (${result.reason})`);
    else if (result.status === "unverifiable") parts.push(`${component} unverifiable (${result.reason})`);
    else if (result.status === "not_applicable") parts.push(`${component} not applicable (${result.reason})`);
  }
  if (verdict.mixedPaths) {
    parts.push(`the run exercised ${verdict.observedPaths.length} runtime paths: ${verdict.observedPaths.join(", ")}`);
  }
  return parts.length === 0
    ? `Provenance matches on every checked component (${verdict.observedPaths.join(", ") || "no paths recorded"}).`
    : parts.join("; ");
}
