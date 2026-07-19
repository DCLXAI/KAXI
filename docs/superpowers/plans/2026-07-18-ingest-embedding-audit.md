# Ingest Embedding Cosine Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A daily sampled audit that re-embeds n8n-supplied ingestion vectors with the core embedder, compares cosine similarity, self-heals mismatches with the core's verified vector, and raises a critical ops alert — closing the "compromised n8n stores a shape-valid vector of the wrong text" residual from the sub-project B review.

**Architecture:** A new ops module `src/lib/ops/embedding-audit.ts` holds DB-free decision logic (vector parsing, cosine, config clamps, verdict) plus a thin I/O runner that samples `rag_serving_chunks` rows with `metadata->>ingest_embedding_source = 'n8n-openai'`, recomputes the single-locale projection from the canonical chunk, re-embeds via `createRagQueryEmbedding`, and either stamps a pass or overwrites the row with the core vector + `recordOpsEvent(severity: "critical")`. Exposed at `/api/ops/embedding-audit` following the exact `/api/ops/sla` pattern (GET = Vercel cron via `authorizeCronRequest`, POST = admin manual), scheduled in `vercel.json`.

**Tech Stack:** TypeScript (Next.js App Router), `@supabase/supabase-js` service client, bun test scripts.

## Global Constraints

- Branch: `feat/ingest-embedding-audit` off `main`. Commit per task. Trailer on every commit: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- NEVER stage `Capsomnia/` or `.superpowers/`. Stage only the files each task names (`git add <file> …`, never `-A`/`.`).
- NEVER run `prisma migrate`/`db:migrate` or anything against a remote DB. This feature needs NO migration (audit stamps live in the existing `metadata` jsonb).
- Never print or commit secrets.
- Audit thresholds: sample size default **5** (env `KAXI_EMBEDDING_AUDIT_SAMPLE`, clamp [1, 20]); cosine floor default **0.98** (env `KAXI_EMBEDDING_AUDIT_MIN_COSINE`, clamp [0.5, 0.9999]).
- Healing writes the CORE-computed vector only (never keeps the suspect vector), sets `ingest_embedding_source: "core"`, and must NOT touch `ingest_embedding_rejected_reason` (that field means ingestion-time rejection; healing records its own `embedding_audit_heal_reason`).
- Content drift (recomputed projection hash ≠ row's `embedding_content_hash`) is a SKIP, not a heal — it means the canonical chunk changed and the row is a normal re-sync target, not an attack signal.
- The provider being down must produce at most ONE `warning` ops event per run and abort remaining rows (no alert storms, no hammering).
- Cron schedule: `0 19 * * *` (after the existing 18:00-18:45 UTC crons).

---

### Task 1: DB-free audit decision logic

**Files:**
- Create: `src/lib/ops/embedding-audit.ts`
- Test: `scripts/test-embedding-audit.ts` (new)
- Modify: `package.json` (add `test:embedding-audit` script; append `&& bun run test:embedding-audit` to the END of the `ci:domain` chain)

**Interfaces:**
- Consumes: `RAG_QUERY_EMBEDDING_DIMENSIONS`, `isOpenAiQueryEmbedding`, `type QueryEmbeddingResult` from `@/lib/chat/query-embedding`.
- Produces (Task 2 relies on these exact names):
  - `parseStoredVector(value: unknown): number[] | null`
  - `cosineSimilarity(a: number[], b: number[]): number | null`
  - `parseAuditConfig(env?: NodeJS.ProcessEnv): { sample: number; minCosine: number }`
  - `type AuditDecision = { action: "skip_embed_unavailable"; cosine: null } | { action: "pass"; cosine: number } | { action: "heal"; cosine: number | null; reason: "low_cosine" | "stored_vector_invalid" }`
  - `decideAuditAction(input: { storedEmbedding: unknown; reembedded: QueryEmbeddingResult; minCosine: number }): AuditDecision`

- [ ] **Step 1: Write the failing test**

Create `scripts/test-embedding-audit.ts`:

```ts
import assert from "node:assert/strict";
const {
  parseStoredVector,
  cosineSimilarity,
  parseAuditConfig,
  decideAuditAction,
} = await import("../src/lib/ops/embedding-audit");
const { RAG_QUERY_EMBEDDING_DIMENSIONS } = await import("../src/lib/chat/query-embedding");
import type { QueryEmbeddingResult } from "../src/lib/chat/query-embedding";

function unitVector(hotIndex: number): number[] {
  const vector = new Array(RAG_QUERY_EMBEDDING_DIMENSIONS).fill(0);
  vector[hotIndex] = 1;
  return vector;
}

function readyEmbedding(vector: number[] | null): QueryEmbeddingResult {
  return {
    vector,
    status: vector ? "ready" : "failed",
    provider: "openai-compatible",
    model: "text-embedding-3-small",
    dimensions: vector ? RAG_QUERY_EMBEDDING_DIMENSIONS : null,
    failureReason: vector ? null : "embedding_provider_unavailable",
    latencyMs: 0,
  };
}

// parseStoredVector: array passthrough, pgvector text parse, junk rejection
assert.deepEqual(parseStoredVector([1, 2, 3]), [1, 2, 3]);
assert.deepEqual(parseStoredVector("[0.5,-0.25,1]"), [0.5, -0.25, 1]);
assert.equal(parseStoredVector("[0.5,abc,1]"), null);
assert.equal(parseStoredVector("not-a-vector"), null);
assert.equal(parseStoredVector(null), null);
assert.equal(parseStoredVector(undefined), null);
assert.equal(parseStoredVector({ vector: [1] }), null);
assert.equal(parseStoredVector([1, Number.NaN]), null);
console.log("PASS embedding audit: stored-vector parsing");

// cosineSimilarity: identity 1, orthogonal 0, guards
const a = unitVector(0);
const b = unitVector(1);
assert.ok(Math.abs((cosineSimilarity(a, a) ?? 0) - 1) < 1e-9);
assert.ok(Math.abs(cosineSimilarity(a, b) ?? 1) < 1e-9);
assert.equal(cosineSimilarity(a, [1, 0]), null);
assert.equal(cosineSimilarity(new Array(RAG_QUERY_EMBEDDING_DIMENSIONS).fill(0), a), null);
console.log("PASS embedding audit: cosine similarity");

// parseAuditConfig: defaults and clamps
assert.deepEqual(parseAuditConfig({} as NodeJS.ProcessEnv), { sample: 5, minCosine: 0.98 });
assert.deepEqual(
  parseAuditConfig({ KAXI_EMBEDDING_AUDIT_SAMPLE: "50", KAXI_EMBEDDING_AUDIT_MIN_COSINE: "2" } as NodeJS.ProcessEnv),
  { sample: 20, minCosine: 0.9999 },
);
assert.deepEqual(
  parseAuditConfig({ KAXI_EMBEDDING_AUDIT_SAMPLE: "0", KAXI_EMBEDDING_AUDIT_MIN_COSINE: "0.1" } as NodeJS.ProcessEnv),
  { sample: 1, minCosine: 0.5 },
);
assert.deepEqual(
  parseAuditConfig({ KAXI_EMBEDDING_AUDIT_SAMPLE: "junk", KAXI_EMBEDDING_AUDIT_MIN_COSINE: "junk" } as NodeJS.ProcessEnv),
  { sample: 5, minCosine: 0.98 },
);
console.log("PASS embedding audit: config clamps");

// decideAuditAction
const matching = decideAuditAction({ storedEmbedding: a, reembedded: readyEmbedding(a), minCosine: 0.98 });
assert.equal(matching.action, "pass");
if (matching.action === "pass") assert.ok(matching.cosine > 0.99);

const divergent = decideAuditAction({ storedEmbedding: b, reembedded: readyEmbedding(a), minCosine: 0.98 });
assert.deepEqual(divergent, { action: "heal", cosine: 0, reason: "low_cosine" });

const malformedStored = decideAuditAction({ storedEmbedding: "junk", reembedded: readyEmbedding(a), minCosine: 0.98 });
assert.deepEqual(malformedStored, { action: "heal", cosine: null, reason: "stored_vector_invalid" });

const zeroNormStored = decideAuditAction({
  storedEmbedding: new Array(RAG_QUERY_EMBEDDING_DIMENSIONS).fill(0),
  reembedded: readyEmbedding(a),
  minCosine: 0.98,
});
assert.deepEqual(zeroNormStored, { action: "heal", cosine: null, reason: "stored_vector_invalid" });

const wrongDimStored = decideAuditAction({ storedEmbedding: [1, 0], reembedded: readyEmbedding(a), minCosine: 0.98 });
assert.deepEqual(wrongDimStored, { action: "heal", cosine: null, reason: "stored_vector_invalid" });

const providerDown = decideAuditAction({ storedEmbedding: a, reembedded: readyEmbedding(null), minCosine: 0.98 });
assert.deepEqual(providerDown, { action: "skip_embed_unavailable", cosine: null });
console.log("PASS embedding audit: decision verdicts");
```

- [ ] **Step 2: Add the test script to package.json and run to verify failure**

In `package.json`, next to `"test:embedding-cache-key"`, add:

```json
    "test:embedding-audit": "bun run scripts/test-embedding-audit.ts",
```

and append ` && bun run test:embedding-audit` to the very end of the `ci:domain` value.

Run: `bun run test:embedding-audit`
Expected: FAIL — cannot resolve `../src/lib/ops/embedding-audit`.

- [ ] **Step 3: Implement the module**

Create `src/lib/ops/embedding-audit.ts`:

```ts
import {
  isOpenAiQueryEmbedding,
  RAG_QUERY_EMBEDDING_DIMENSIONS,
  type QueryEmbeddingResult,
} from "@/lib/chat/query-embedding";

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
    const parsed = Number(parts[index]);
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run test:embedding-audit && bun run lint && bun run ci:types`
Expected: 4 `PASS embedding audit: …` lines, lint clean, types clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ops/embedding-audit.ts scripts/test-embedding-audit.ts package.json
git commit -m "feat(ops): embedding-audit decision logic (cosine, parse, clamps)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Audit runner, ops route, and cron schedule

**Files:**
- Modify: `src/lib/ops/embedding-audit.ts` (append the runner)
- Create: `src/app/api/ops/embedding-audit/route.ts`
- Modify: `vercel.json` (add cron entry)

**Interfaces:**
- Consumes: Task 1's `parseAuditConfig`, `decideAuditAction`; `buildRagServingEmbeddingProjection` + `RAG_QUERY_EMBEDDING_MODEL` semantics via imports below; `createRagQueryEmbedding` from `@/lib/chat/query-embedding`; `recordOpsEvent` from `@/lib/ops/events`; `authorizeCronRequest` from `@/lib/security/cron-auth`; `requireAdmin` from `@/lib/api/security`.
- Produces: `runIngestEmbeddingAudit(trigger: string): Promise<IngestEmbeddingAuditResult>` where `IngestEmbeddingAuditResult = { ok: boolean; trigger: string; checkedAt: string; sampled: number; passed: number; healed: number; skipped: number; rows: Array<{ servingRowId: number; chunkId: string | null; action: string; cosine: number | null }> }`.

- [ ] **Step 1: Append the runner to `src/lib/ops/embedding-audit.ts`**

Add these imports at the top (merge with the existing import from `@/lib/chat/query-embedding`):

```ts
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
```

Append at the end of the file:

```ts
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
          .select("id,content,contentHash,documentId")
          .eq("id", row.canonical_chunk_id)
          .maybeSingle()
      : { data: null, error: null };
    if (chunkResult.error) throw chunkResult.error;
    const chunk = chunkResult.data as { id: string; content: string; contentHash: string; documentId: string } | null;
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
    ok: true,
    trigger,
    checkedAt,
    sampled: sampledRows.length,
    passed,
    healed,
    skipped,
    rows,
  };
}
```

- [ ] **Step 2: Create the route**

Create `src/app/api/ops/embedding-audit/route.ts` (exact clone of the `/api/ops/sla` pattern):

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/security";
import { runIngestEmbeddingAudit } from "@/lib/ops/embedding-audit";
import { authorizeCronRequest } from "@/lib/security/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const unauthorized = authorizeCronRequest(req);
  if (unauthorized) return unauthorized;
  const result = await runIngestEmbeddingAudit("daily-cron");
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req, { roles: ["owner", "admin"] });
  if (unauthorized) return unauthorized;
  const result = await runIngestEmbeddingAudit("admin-manual");
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
```

- [ ] **Step 3: Schedule the cron**

In `vercel.json`, append to the `crons` array (after the `/api/ops/sla` entry):

```json
        {
            "path": "/api/ops/embedding-audit",
            "schedule": "0 19 * * *"
        }
```

(Keep the file's existing indentation style.)

- [ ] **Step 4: Gates**

Run: `bun run ci:types && bun run lint && bun run test:embedding-audit`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ops/embedding-audit.ts src/app/api/ops/embedding-audit/route.ts vercel.json
git commit -m "feat(ops): daily sampled re-embed cosine audit with self-heal

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Spec addendum + full gates

**Files:**
- Modify: `docs/superpowers/specs/2026-07-17-n8n-embedding-ownership-design.md` (append a section before `## Out of scope`)

**Interfaces:** none (documentation + verification).

- [ ] **Step 1: Record the compensating control in the spec**

Insert this section immediately BEFORE the `## Out of scope` heading:

```markdown
## Compensating control — ingest embedding cosine audit (2026-07-18)

The content-hash gate binds the TEXT n8n embedded, but no gate can bind the
VECTOR to that text without re-embedding. The accepted residual (final B
review, Important): a compromised n8n could store a shape-valid vector of
attacker-chosen text, steering retrieval. Control: `/api/ops/embedding-audit`
(Vercel cron `0 19 * * *`, admin POST for manual runs) samples
`ingest_embedding_source: "n8n-openai"` serving rows (default 5/day,
`KAXI_EMBEDDING_AUDIT_SAMPLE`), re-embeds the recomputed projection text with
the core embedder, and compares cosine similarity (floor 0.98,
`KAXI_EMBEDDING_AUDIT_MIN_COSINE`). Below the floor → the row is HEALED in
place with the core-verified vector (`ingest_embedding_source: "core"`,
audit stamps in metadata) and a `critical` ops event
(`ingest_embedding_audit.mismatch`) rides the existing Slack/email alert
path. Content drift versus the canonical chunk is a skip (normal re-sync
territory), and a down provider aborts the run with a single `warning`
event.
```

- [ ] **Step 2: Full relevant gates**

Run: `bun run ci:types && bun run lint && bun run test:embedding-audit && bun run test:provided-embedding && bun run test:ops-event-row`
Expected: all PASS (`test:ops-event-row` guards the ops-event row shape this feature emits; it is DB-free).

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-07-17-n8n-embedding-ownership-design.md
git commit -m "docs(n8n): record the ingest embedding audit compensating control

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Rollout (operator-gated, AFTER merge)

No repo files; operational.

- [ ] **Step 1:** Open PR, wait for CI green, merge; deploy via `gh workflow run "Vercel Production Deploy"`; standard post-deploy checks (`/api/health` commit match, `/api/readiness` ready, unauthenticated `/api/documents` 401).
- [ ] **Step 2:** Live probe: authenticated admin `POST /api/ops/embedding-audit` (or run the GET with the cron secret) and confirm the JSON reports `sampled ≥ 1`, the B-probe row passing (`action: "pass"`, cosine ≈ 1), `healed: 0`, and audit stamps appearing in that row's metadata.
