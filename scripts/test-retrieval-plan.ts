import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { prepareTestDb } from "./prepare-test-db";

prepareTestDb("versioned retrieval plan");
process.env.NODE_ENV = "test";
process.env.DATA_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.PII_HASH_SECRET = "retrieval-plan-hash-secret-with-sufficient-length";

const { db } = await import("../src/lib/db");
const { platformServiceTenantContext } = await import("../src/application/tenancy/tenant-context");
const { persistAtomicChatTurn } = await import("../src/infrastructure/chat/prisma-chat-unit-of-work");
const {
  RETRIEVAL_PLAN,
  RETRIEVAL_PLAN_VERSION,
  buildRetrievalPlanSnapshot,
  replayRetrievalSelection,
} = await import("../src/application/rag/retrieval-plan");

const sources = [
  { docId: "doc-a", checkedAt: "2026-08-12T00:00:00.000Z", category: "visa", language: "ko" },
  { docId: "doc-b", checkedAt: "2026-08-11T00:00:00.000Z", category: "visa", language: "ko" },
];
const searchMeta = {
  type: "hybrid-rrf-v3",
  category: "visa",
  locale: "ko",
  scoreVersion: "rrf-k60-provider-v3",
  confidencePolicy: "locale-category-margin-v2",
  embeddingSource: "provider-query",
  rawRetrievedCount: 40,
  retrievedCount: 2,
  topScore: 0.91,
  noContext: false,
};
const first = buildRetrievalPlanSnapshot(searchMeta, sources);
const second = buildRetrievalPlanSnapshot(searchMeta, [...sources].reverse());
assert.equal(first.corpusSnapshotId, second.corpusSnapshotId, "corpus snapshots must ignore input row order");
assert.equal(first.planVersion, RETRIEVAL_PLAN_VERSION);
assert.equal(first.candidateCount, 40);
assert.deepEqual(RETRIEVAL_PLAN.stages, [
  "governance-filter",
  "question-mediation",
  "lexical-candidates",
  "vector-candidates",
  "reciprocal-rank-fusion",
  "deterministic-rerank",
  "confidence-no-context",
  "citation-validation",
]);
assert.deepEqual(
  replayRetrievalSelection(first.replaySpec, [
    { id: "doc-b", rerankScore: 0.7, originalRank: 2 },
    { id: "ignored", rerankScore: 1 },
    { id: "doc-a", rerankScore: 0.9, originalRank: 1 },
  ]),
  ["doc-a", "doc-b"],
  "a frozen candidate set must replay to the same stable selected ordering",
);

const tenantContext = platformServiceTenantContext("retrieval-plan-test");
const requestId = crypto.randomUUID();
await persistAtomicChatTurn({
  requestId,
  idempotencyKey: `retrieval-plan-${requestId}`,
  sessionKey: `retrieval-plan-session-${requestId}`,
  tenantContext,
  locale: "ko",
  source: "typebot",
  question: "D-4 체류 연장 서류는 무엇인가요?",
  answer: "공식 근거에 따른 답변",
  provenance: {
    workflowId: "retrieval-plan-test",
    workflowVersionId: "retrieval-plan-test@v1",
    modelVersion: "fixture",
    promptVersion: "fixture@v1",
  },
  sources,
  searchMeta,
});
const stored = await db.retrievalRun.findUniqueOrThrow({ where: { requestId } });
assert.equal(stored.planVersion, RETRIEVAL_PLAN_VERSION);
assert.equal(stored.scoreVersion, "rrf-k60-provider-v3");
assert.equal(stored.thresholdSet, "locale-category-margin-v2");
assert.equal(stored.embeddingSource, "provider-query");
assert.equal(stored.candidateCount, 40);
assert.equal(stored.corpusSnapshotId, first.corpusSnapshotId);
assert.equal((stored.replaySpec as { planVersion?: string }).planVersion, RETRIEVAL_PLAN_VERSION);

await assert.rejects(
  db.$queryRaw`SELECT * FROM public.match_rag_documents_hybrid_v4(NULL, 1, '{}'::jsonb)`,
  /valid tenant_id is required/,
  "versioned retrieval RPCs must fail closed without an explicit tenant",
);

const lifecycle = JSON.parse(readFileSync("docs/retrieval-rpc-lifecycle.json", "utf8")) as {
  activePlan: string;
  rpcs: Array<{ name: string; status: string; removalDate?: string }>;
};
assert.equal(lifecycle.activePlan, RETRIEVAL_PLAN_VERSION);
assert(lifecycle.rpcs.some((rpc) => rpc.name === "match_rag_documents_hybrid_v4" && rpc.status === "active"));
assert(lifecycle.rpcs
  .filter((rpc) => rpc.status.startsWith("deprecated"))
  .every((rpc) => Boolean(rpc.removalDate) && Date.parse(rpc.removalDate!) > Date.now()));

console.log("PASS retrieval plan: explicit stages, version telemetry, deterministic replay and tenant-safe RPC lifecycle");
await db.$disconnect();
