import { createClient } from "@supabase/supabase-js";
import {
  createRagQueryEmbedding,
  isOpenAiQueryEmbedding,
  RAG_QUERY_EMBEDDING_DIMENSIONS,
  RAG_QUERY_EMBEDDING_MODEL,
  type QueryEmbeddingResult,
} from "@/lib/chat/query-embedding";
import { buildRagServingEmbeddingProjection } from "@/lib/knowledge/serving-projection";
import { recordOpsEvent } from "@/lib/ops/events";

// Detection-and-repair for the accepted residual of the n8n embedding
// delegation (spec 2026-07-17-n8n-embedding-ownership-design.md): the
// ingestion contract binds the TEXT n8n embedded (content-hash gate) but
// cannot bind the VECTOR to that text without re-embedding. This audit is
// that re-embedding, sampled: a stored n8n vector far from the core's own
// embedding of the same projection text is either provider drift or a
// poisoned vector — both are repaired by overwriting with the core vector.

export function parseStoredVector(value: unknown): number[] | null {
  if (Array.isArray(value)) {
    return value.every((item) => typeof item === "number" && Number.isFinite(item))
      ? value as number[]
      : null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return null;
  const parts = trimmed.slice(1, -1).split(",");
  const vector: number[] = new Array(parts.length);
  for (let index = 0; index < parts.length; index++) {
    const token = parts[index].trim();
    if (!token) return null;
    const parsed = Number(token);
    if (!Number.isFinite(parsed)) return null;
    vector[index] = parsed;
  }
  return vector;
}

export function cosineSimilarity(a: number[], b: number[]): number | null {
  if (a.length !== b.length || a.length === 0) return null;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index++) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }
  if (normA === 0 || normB === 0) return null;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function parseAuditConfig(env: NodeJS.ProcessEnv = process.env): {
  sample: number;
  minCosine: number;
} {
  const sampleParsed = Number.parseInt(env.KAXI_EMBEDDING_AUDIT_SAMPLE || "", 10);
  const sample = Number.isFinite(sampleParsed)
    ? Math.min(Math.max(sampleParsed, 1), 20)
    : 5;
  const cosineParsed = Number.parseFloat(env.KAXI_EMBEDDING_AUDIT_MIN_COSINE || "");
  const minCosine = Number.isFinite(cosineParsed)
    ? Math.min(Math.max(cosineParsed, 0.5), 0.9999)
    : 0.98;
  return { sample, minCosine };
}

export type AuditDecision =
  | { action: "skip_embed_unavailable"; cosine: null }
  | { action: "pass"; cosine: number }
  | { action: "heal"; cosine: number | null; reason: "low_cosine" | "stored_vector_invalid" };

export function decideAuditAction(input: {
  storedEmbedding: unknown;
  reembedded: QueryEmbeddingResult;
  minCosine: number;
}): AuditDecision {
  if (!isOpenAiQueryEmbedding(input.reembedded)) {
    return { action: "skip_embed_unavailable", cosine: null };
  }
  const stored = parseStoredVector(input.storedEmbedding);
  if (!stored || stored.length !== RAG_QUERY_EMBEDDING_DIMENSIONS) {
    return { action: "heal", cosine: null, reason: "stored_vector_invalid" };
  }
  const cosine = cosineSimilarity(stored, input.reembedded.vector as number[]);
  if (cosine === null) {
    return { action: "heal", cosine: null, reason: "stored_vector_invalid" };
  }
  if (cosine < input.minCosine) {
    return { action: "heal", cosine, reason: "low_cosine" };
  }
  return { action: "pass", cosine };
}

type AuditCandidateRow = {
  id: number;
  canonical_chunk_id: string | null;
  metadata: Record<string, unknown> | null;
  indexed_at: string | null;
};

export type IngestEmbeddingAuditResult = {
  ok: boolean;
  trigger: string;
  checkedAt: string;
  sampled: number;
  passed: number;
  healed: number;
  skipped: number;
  rows: Array<{ servingRowId: number; chunkId: string | null; action: string; cosine: number | null }>;
};

function configured(value: string | undefined) {
  const result = value?.trim() || "";
  return !result || /^(replace-with-|change_me)/i.test(result) ? "" : result;
}

function serviceClient() {
  const url = configured(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = configured(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_NOT_CONFIGURED");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function auditStamp(metadata: Record<string, unknown> | null, cosine: number | null) {
  return {
    ...(metadata || {}),
    embedding_audited_at: new Date().toISOString(),
    embedding_audit_cosine: cosine === null ? null : Math.round(cosine * 1e6) / 1e6,
  };
}

export async function runIngestEmbeddingAudit(trigger: string): Promise<IngestEmbeddingAuditResult> {
  const { sample, minCosine } = parseAuditConfig();
  const supabase = serviceClient();
  const checkedAt = new Date().toISOString();
  const rows: IngestEmbeddingAuditResult["rows"] = [];
  let passed = 0;
  let healed = 0;
  let skipped = 0;

  // The n8n-sourced slice of the corpus is small; list it without the heavy
  // embedding column, order client-side (unaudited first, then stalest audit,
  // newest ingest first), and fetch each sampled row's vector individually.
  const candidates = await supabase
    .from("rag_serving_chunks")
    .select("id,canonical_chunk_id,metadata,indexed_at")
    .eq("status", "ready")
    .eq("embedding_model", RAG_QUERY_EMBEDDING_MODEL)
    .eq("metadata->>ingest_embedding_source", "n8n-openai")
    .order("indexed_at", { ascending: false })
    .limit(500);
  if (candidates.error) throw candidates.error;
  const sampledRows = ((candidates.data || []) as AuditCandidateRow[])
    .sort((left, right) => {
      const leftAudited = String(left.metadata?.embedding_audited_at || "");
      const rightAudited = String(right.metadata?.embedding_audited_at || "");
      if (Boolean(leftAudited) !== Boolean(rightAudited)) return leftAudited ? 1 : -1;
      if (leftAudited !== rightAudited) return leftAudited.localeCompare(rightAudited);
      return String(right.indexed_at || "").localeCompare(String(left.indexed_at || ""));
    })
    .slice(0, sample);

  let providerUnavailable = false;
  for (const row of sampledRows) {
    if (providerUnavailable) break;
    const record = (action: string, cosine: number | null) =>
      rows.push({ servingRowId: row.id, chunkId: row.canonical_chunk_id, action, cosine });

    const chunkResult = row.canonical_chunk_id
      ? await supabase
          .from("KnowledgeChunk")
          .select("id,content,documentId")
          .eq("id", row.canonical_chunk_id)
          .maybeSingle()
      : { data: null, error: null };
    if (chunkResult.error) throw chunkResult.error;
    const chunk = chunkResult.data as { id: string; content: string; documentId: string } | null;
    if (!chunk) {
      skipped += 1;
      record("skip_canonical_missing", null);
      continue;
    }
    const documentResult = await supabase
      .from("KnowledgeDocument")
      .select("language")
      .eq("id", chunk.documentId)
      .maybeSingle();
    if (documentResult.error) throw documentResult.error;
    const language = (documentResult.data as { language: string } | null)?.language;
    if (!language) {
      skipped += 1;
      record("skip_canonical_missing", null);
      continue;
    }

    let projection: ReturnType<typeof buildRagServingEmbeddingProjection>;
    try {
      projection = buildRagServingEmbeddingProjection({ content: chunk.content, documentLanguage: language });
    } catch {
      skipped += 1;
      record("skip_projection_unavailable", null);
      continue;
    }
    if (projection.contentHash !== String(row.metadata?.embedding_content_hash || "")) {
      // The canonical chunk changed since ingestion: a normal re-sync target,
      // not an attack signal — the sync path re-projects it.
      skipped += 1;
      record("skip_content_drift", null);
      continue;
    }

    const vectorResult = await supabase
      .from("rag_serving_chunks")
      .select("embedding")
      .eq("id", row.id)
      .maybeSingle();
    if (vectorResult.error) throw vectorResult.error;

    const reembedded = await createRagQueryEmbedding(projection.content);
    const decision = decideAuditAction({
      storedEmbedding: (vectorResult.data as { embedding?: unknown } | null)?.embedding,
      reembedded,
      minCosine,
    });
    record(decision.action, decision.cosine);

    if (decision.action === "skip_embed_unavailable") {
      skipped += 1;
      providerUnavailable = true;
      // No executionId is passed, so the ops_events dedup index never applies:
      // every audit event inserts and alerts. Intentional — healed rows leave
      // the population, so a repeat alert means genuine re-poisoning.
      await recordOpsEvent({
        source: "kaxi-embedding-audit",
        severity: "warning",
        eventType: "ingest_embedding_audit.provider_unavailable",
        message: `Embedding audit aborted (${trigger}): provider unavailable (${reembedded.failureReason || reembedded.status})`,
        payload: { trigger, servingRowId: row.id, failureReason: reembedded.failureReason },
      });
      continue;
    }

    if (decision.action === "pass") {
      passed += 1;
      const update = await supabase
        .from("rag_serving_chunks")
        .update({ metadata: auditStamp(row.metadata, decision.cosine) })
        .eq("id", row.id);
      if (update.error) throw update.error;
      continue;
    }

    // heal: overwrite with the core-verified vector and alert.
    healed += 1;
    const priorSource = String(row.metadata?.ingest_embedding_source || "");
    const healUpdate = await supabase
      .from("rag_serving_chunks")
      .update({
        embedding: `[${(reembedded.vector as number[]).join(",")}]`,
        metadata: {
          ...auditStamp(row.metadata, decision.cosine),
          ingest_embedding_source: "core",
          embedding_audit_healed_at: new Date().toISOString(),
          embedding_audit_heal_reason: decision.reason,
          embedding_audit_prior_source: priorSource,
        },
      })
      .eq("id", row.id);
    if (healUpdate.error) throw healUpdate.error;
    await recordOpsEvent({
      source: "kaxi-embedding-audit",
      severity: "critical",
      eventType: "ingest_embedding_audit.mismatch",
      message: `Ingest embedding audit healed serving row ${row.id} (cosine ${decision.cosine === null ? "n/a" : decision.cosine.toFixed(4)} < ${minCosine})`,
      payload: {
        trigger,
        servingRowId: row.id,
        canonicalChunkId: row.canonical_chunk_id,
        cosine: decision.cosine,
        minCosine,
        reason: decision.reason,
        priorSource,
      },
    });
  }

  return {
    ok: !providerUnavailable,
    trigger,
    checkedAt,
    sampled: sampledRows.length,
    passed,
    healed,
    skipped,
    rows,
  };
}
