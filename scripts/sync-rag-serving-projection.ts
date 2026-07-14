import {
  getRagServingProjectionStatus,
  syncRagServingProjection,
} from "../src/lib/knowledge/serving-projection";

const ACTIVE_CONTRACT = "2026-07-14.v3";

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function positiveInt(value: string | undefined, fallback: number, max: number): number {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

function capabilityUrl() {
  const configured = process.env.N8N_RAG_CAPABILITY_URL?.trim();
  if (configured) return configured;

  const ingestion = process.env.N8N_RAG_INGESTION_WEBHOOK_URL?.trim();
  if (!ingestion) throw new Error("N8N_RAG_INGESTION_WEBHOOK_URL is required");
  const url = new URL(ingestion);
  const nextPath = url.pathname.replace(/\/rag-knowledge-ingest\/?$/, "/rag-serving-capabilities");
  if (nextPath === url.pathname) {
    throw new Error("N8N_RAG_CAPABILITY_URL is required for a custom ingestion path");
  }
  url.pathname = nextPath;
  url.search = "";
  return url.toString();
}

async function assertActiveN8nContract() {
  const confirmed = argValue("--confirm-contract");
  if (confirmed !== ACTIVE_CONTRACT) {
    throw new Error(`Pass --confirm-contract ${ACTIVE_CONTRACT} after publishing the governed n8n workflow`);
  }

  const response = await fetch(capabilityUrl(), {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`n8n serving capability probe failed with HTTP ${response.status}`);
  }
  const payload = await response.json() as Record<string, unknown>;
  if (
    payload.contractVersion !== ACTIVE_CONTRACT ||
    payload.ingestionTarget !== "rag_serving_chunks" ||
    payload.embeddingModel !== "text-embedding-3-small" ||
    payload.dimensions !== 1536 ||
    payload.retrievalMode !== "hybrid-rrf-v3-with-seeded-vector-and-lexical-fallback" ||
    payload.lexicalCandidateCount !== 20 ||
    payload.vectorCandidateCount !== 20 ||
    payload.finalMatchCount !== 6 ||
    payload.queryEmbeddingOptional !== true ||
    payload.storedVectorFallback !== "lexical-centroid" ||
    payload.signedIngestionRequired !== true
  ) {
    throw new Error("The active n8n workflow does not expose the governed RAG serving contract");
  }
  return payload;
}

async function main() {
  const initial = await getRagServingProjectionStatus();
  console.log(JSON.stringify({ phase: "preflight", status: initial }, null, 2));

  if (!process.argv.includes("--execute")) {
    console.log(
      `Dry run only. After publishing n8n, pass --execute --confirm-contract ${ACTIVE_CONTRACT} to sync.`,
    );
    return;
  }

  const capability = await assertActiveN8nContract();
  console.log(JSON.stringify({ phase: "n8n-contract", capability }, null, 2));

  const batchSize = positiveInt(argValue("--batch-size"), 10, 50);
  const maxBatches = positiveInt(argValue("--max-batches"), 30, 100);
  let previousVectorReady = initial.vectorReadyChunks;

  for (let batch = 1; batch <= maxBatches; batch += 1) {
    const current = await getRagServingProjectionStatus();
    if (current.vectorReadyChunks >= current.eligibleChunks) break;

    const result = await syncRagServingProjection({ limit: batchSize });
    console.log(JSON.stringify({ phase: "sync", batch, result }, null, 2));

    if (result.failed.length > 0) {
      throw new Error(`RAG serving sync failed for ${result.failed.length} chunk(s)`);
    }
    if (result.status.vectorReadyChunks <= previousVectorReady) {
      throw new Error("RAG serving vector sync made no progress; stopping before retrying the same chunks");
    }
    previousVectorReady = result.status.vectorReadyChunks;
  }

  const final = await getRagServingProjectionStatus();
  console.log(JSON.stringify({ phase: "complete", status: final }, null, 2));
  if (final.vectorReadyChunks < final.eligibleChunks) {
    throw new Error(
      `RAG serving vector projection remains incomplete (${final.vectorReadyChunks}/${final.eligibleChunks}); rerun to continue`,
    );
  }
}

main().catch((error) => {
  console.error(`[rag-serving:sync] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
