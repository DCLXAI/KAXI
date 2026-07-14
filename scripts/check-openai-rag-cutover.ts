import { createClient } from "@supabase/supabase-js";
import {
  createRagQueryEmbedding,
  isOpenAiQueryEmbedding,
  RAG_QUERY_EMBEDDING_DIMENSIONS,
  RAG_QUERY_EMBEDDING_MODEL,
} from "../src/lib/chat/query-embedding";
import { getRagServingProjectionStatus } from "../src/lib/knowledge/serving-projection";

function configured(value: string | undefined) {
  const normalized = value?.trim() || "";
  return !normalized || /^(replace-with-|change_me)/i.test(normalized) ? "" : normalized;
}

function metadataRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function booleanValue(value: unknown) {
  return value === true || value === "true";
}

async function main() {
  const status = await getRagServingProjectionStatus();
  const failures: string[] = [];
  if (!status.cutoverReady) failures.push("OpenAI serving projection is incomplete");

  const embedding = await createRagQueryEmbedding("D-4 어학연수 비자 연장 준비 서류");
  if (!isOpenAiQueryEmbedding(embedding)) {
    failures.push(`OpenAI query embedding failed: ${embedding.failureReason || embedding.status}`);
  }

  let retrieval: Record<string, unknown> = {};
  if (isOpenAiQueryEmbedding(embedding)) {
    const url = configured(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const key = configured(process.env.SUPABASE_SERVICE_ROLE_KEY);
    if (!url || !key) {
      failures.push("Supabase service role is not configured");
    } else {
      const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const result = await client.rpc("match_rag_documents_hybrid_v3", {
        query_embedding: `[${(embedding.vector as number[]).map((value) => Number(value).toFixed(8)).join(",")}]`,
        match_count: 6,
        filter: {
          tenant_id: "default",
          category: "visa",
          category_mode: "strict",
          locale: "ko",
          query_text: "D-4 어학연수 비자 연장 준비 서류 체류기간 연장",
          allow_seeded_vector: false,
        },
      });
      if (result.error) {
        failures.push(`Hybrid provider RPC failed: ${result.error.message}`);
      } else {
        const rows = Array.isArray(result.data) ? result.data : [];
        const first = metadataRecord(rows[0]);
        const metadata = metadataRecord(first.metadata);
        retrieval = {
          resultCount: rows.length,
          retrievalMode: metadata.retrieval_mode || null,
          embeddingSource: metadata.embedding_source || null,
          vectorSearchAvailable: booleanValue(metadata.vector_search_available),
          lexicalCandidateCount: Number(metadata.lexical_candidate_count || 0),
          vectorCandidateCount: Number(metadata.vector_candidate_count || 0),
        };
        if (rows.length === 0) failures.push("Hybrid provider RPC returned no governed context");
        if (metadata.retrieval_mode !== "hybrid-provider") failures.push("Retrieval did not use hybrid-provider mode");
        if (metadata.embedding_source !== "provider-query") failures.push("Retrieval did not use the OpenAI query vector");
        if (!booleanValue(metadata.vector_search_available)) failures.push("pgvector search was not executed");
        if (Number(metadata.vector_candidate_count || 0) < 1) failures.push("No vector candidates were produced");
      }
    }
  }

  console.log(JSON.stringify({
    ok: failures.length === 0,
    checkedAt: new Date().toISOString(),
    model: RAG_QUERY_EMBEDDING_MODEL,
    dimensions: RAG_QUERY_EMBEDDING_DIMENSIONS,
    embedding: {
      status: embedding.status,
      provider: embedding.provider,
      failureReason: embedding.failureReason,
      latencyMs: embedding.latencyMs,
    },
    projection: status,
    retrieval,
    failures,
  }, null, 2));

  if (failures.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`[rag:openai:preflight] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
