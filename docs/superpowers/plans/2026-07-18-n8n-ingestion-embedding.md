# n8n Ingestion-Path Embedding (Sub-project B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** n8n computes the OpenAI embedding for knowledge-chunk ingestion; the KAXI core validates and stores it through the existing governance path, falling back to core embedding on any doubt.

**Architecture:** Spec: `docs/superpowers/specs/2026-07-17-n8n-embedding-ownership-design.md` (Sub-project B). KAXI's `syncRagServingProjection` already sends one governed chunk per signed POST to the n8n `rag-knowledge-ingest` webhook; n8n verifies the signature and calls back `/api/internal/n8n/rag-ingestion`. We add: (1) KAXI includes the projection text (`embedding_content`) in the signed payload, (2) a new n8n `Compute Chunk Embedding` httpRequest node embeds that text with the same openAiApi credential Task A used, (3) the core accepts the vector top-level (`chunkEmbedding`, outside the receipt-bound payload, mirroring A's `queryEmbedding`) and uses it in `writeDirectRecoveryProjection` ONLY when it passes A's shape validation AND the payload's `embedding_content_hash` equals the locally recomputed projection hash. Anything else → core embeds exactly as today. Governance (eligibility checks, serving-row write, quarantine refresh) is untouched.

**Spec adaptation (recorded):** Spec B.1 sketched `formTrigger → text splitter`. The live system already chunks canonically in KAXI (`KnowledgeChunk`) and sends per-chunk payloads; n8n must NOT re-split (that would fork governed chunking). n8n embeds the per-chunk projection content KAXI sends. Spec B.2's "chunk-count bound" is likewise moot: the wire contract is exactly one chunk (one vector) per call, enforced by the existing payload field validation. Spec B.3 (cache poisoning) is satisfied structurally: the ingestion path calls `createRagQueryEmbedding` directly with no cache layer, and a provided vector skips that provider call entirely — no cache write can occur. No code needed; do not add a cache.

**Tech Stack:** TypeScript (Next.js App Router), bun test scripts, `@n8n/workflow-sdk` builder (`.mjs` → compiled JSON).

## Global Constraints

- Branch: `feat/n8n-ingestion-embedding` off `main`. Commit per task. Trailer on every commit: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- NEVER stage `Capsomnia/` or `.superpowers/`. Stage only the files each task names.
- NEVER run `prisma migrate`/`db:migrate` or anything touching a remote DB. No DB changes exist in this plan.
- Never print or commit secrets. The n8n node uses the existing `openAiApi` credential by reference only.
- n8n input is DATA, never trusted computation: a supplied vector is used only after shape validation + content-hash binding; every rejection falls back to core embedding with the reason recorded.
- The embedding model/dimensions are pinned: `text-embedding-3-small`, 1536, input sliced to 4,000 chars (must match `createRagQueryEmbedding`'s `question.slice(0, 4_000)` exactly).
- `infra/n8n/kaxi-rag-typebot-orchestrator.mjs` is the source of truth; regenerate `infra/n8n/kaxi-rag-typebot-orchestrator.json` with `bun run n8n:build:orchestrator` after editing it. Never edit the JSON by hand. Never touch `kaxi-rag-typebot-architecture.json` (obsolete v1).

---

### Task 1: `resolveProvidedChunkEmbedding` — validation + content-hash binding (pure, DB-free)

**Files:**
- Modify: `src/lib/n8n/provided-query-embedding.ts` (append after `resolveProvidedEmbedding`)
- Test: `scripts/test-provided-query-embedding.ts` (append at end)

**Interfaces:**
- Consumes: `parseProvidedQueryEmbedding` (same file), `QueryEmbeddingResult` from `@/lib/chat/query-embedding`.
- Produces: `resolveProvidedChunkEmbedding(input: { value: unknown; providedContentHash: string; expectedContentHash: string }): { embedding: QueryEmbeddingResult | null; embeddingSource: "n8n-openai" | "core"; rejectedReason: string | null }` — Task 2 calls this from `writeDirectRecoveryProjection`.

- [ ] **Step 1: Write the failing tests**

Append to `scripts/test-provided-query-embedding.ts` (reuse the existing `unit` vector and `isOpenAiQueryEmbedding` imports already in the file):

```ts
const { resolveProvidedChunkEmbedding } = await import("../src/lib/n8n/provided-query-embedding");

const chunkHash = "a".repeat(64);
const chunkOk = resolveProvidedChunkEmbedding({
  value: unit,
  providedContentHash: chunkHash,
  expectedContentHash: chunkHash,
});
assert.equal(chunkOk.embeddingSource, "n8n-openai");
assert.equal(chunkOk.rejectedReason, null);
assert.ok(chunkOk.embedding && isOpenAiQueryEmbedding(chunkOk.embedding));

const chunkHashMismatch = resolveProvidedChunkEmbedding({
  value: unit,
  providedContentHash: "b".repeat(64),
  expectedContentHash: chunkHash,
});
assert.equal(chunkHashMismatch.embeddingSource, "core");
assert.equal(chunkHashMismatch.rejectedReason, "content_hash_mismatch");
assert.equal(chunkHashMismatch.embedding, null);

const chunkHashMissing = resolveProvidedChunkEmbedding({
  value: unit,
  providedContentHash: "",
  expectedContentHash: chunkHash,
});
assert.equal(chunkHashMissing.embeddingSource, "core");
assert.equal(chunkHashMissing.rejectedReason, "content_hash_mismatch");

const chunkAbsent = resolveProvidedChunkEmbedding({
  value: undefined,
  providedContentHash: chunkHash,
  expectedContentHash: chunkHash,
});
assert.equal(chunkAbsent.embeddingSource, "core");
assert.equal(chunkAbsent.rejectedReason, null);
assert.equal(chunkAbsent.embedding, null);

const chunkBadShape = resolveProvidedChunkEmbedding({
  value: unit.slice(0, 10),
  providedContentHash: chunkHash,
  expectedContentHash: chunkHash,
});
assert.equal(chunkBadShape.embeddingSource, "core");
assert.equal(chunkBadShape.rejectedReason, "invalid_dimension");
assert.equal(chunkBadShape.embedding, null);

console.log("PASS provided chunk embedding: hash binding, shape guards, core fallback");
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun run test:provided-embedding`
Expected: FAIL — `resolveProvidedChunkEmbedding is not a function` (after the two existing PASS lines print).

- [ ] **Step 3: Implement**

Append to `src/lib/n8n/provided-query-embedding.ts`:

```ts
// An n8n-supplied INGESTION vector must additionally be bound to the exact
// projection content the core would embed: the sender's embedding_content_hash
// (carried inside the signed payload) must equal the hash the core recomputes
// from the canonical chunk. Shape-valid but unbound vectors are rejected —
// otherwise a stale or divergent canonical chunk could be stored with a vector
// of different text.
export function resolveProvidedChunkEmbedding(input: {
  value: unknown;
  providedContentHash: string;
  expectedContentHash: string;
}): {
  embedding: QueryEmbeddingResult | null;
  embeddingSource: "n8n-openai" | "core";
  rejectedReason: string | null;
} {
  const parsed = parseProvidedQueryEmbedding(input.value);
  if (!parsed.ok) {
    return {
      embedding: null,
      embeddingSource: "core",
      rejectedReason: parsed.reason === "not_provided" ? null : parsed.reason,
    };
  }
  if (!input.providedContentHash || input.providedContentHash !== input.expectedContentHash) {
    return { embedding: null, embeddingSource: "core", rejectedReason: "content_hash_mismatch" };
  }
  return { embedding: parsed.embedding, embeddingSource: "n8n-openai", rejectedReason: null };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `bun run test:provided-embedding`
Expected: PASS, ending with `PASS provided chunk embedding: hash binding, shape guards, core fallback`

- [ ] **Step 5: Commit**

```bash
git add src/lib/n8n/provided-query-embedding.ts scripts/test-provided-query-embedding.ts
git commit -m "feat(n8n): chunk-embedding resolver with content-hash binding

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Wire the provided vector through governed ingestion (core contract)

**Files:**
- Modify: `src/lib/knowledge/serving-projection.ts` (writeDirectRecoveryProjection ~:208-263, ingestRagServingPayload ~:269-352, syncRagServingProjection signed send ~:543-545)
- Modify: `src/app/api/internal/n8n/rag-ingestion/route.ts:44`

**Interfaces:**
- Consumes: `resolveProvidedChunkEmbedding` from Task 1.
- Produces: `ingestRagServingPayload(payload: Record<string, unknown>, options: { providedEmbedding?: unknown } = {})` whose return object gains `embeddingSource: "n8n-openai" | "core"` and `embeddingRejectedReason: string | null`. The route passes `options.providedEmbedding = body.chunkEmbedding` (top-level, OUTSIDE the receipt-bound `payload` — same pattern as A's `queryEmbedding` in the rag-runtime route, because the receipt binds the payloadHash KAXI originally signed). Task 3's n8n node relies on `payload.embedding_content` being present in the signed wire payload.

- [ ] **Step 1: `writeDirectRecoveryProjection` accepts a provided vector**

In `src/lib/knowledge/serving-projection.ts`:

Add the import (extend the existing `@/lib/n8n/signature` import area):

```ts
import { resolveProvidedChunkEmbedding } from "@/lib/n8n/provided-query-embedding";
```

Extend the input type and embedding selection. Replace:

```ts
async function writeDirectRecoveryProjection(input: {
  supabase: SupabaseClient;
  document: CanonicalDocument;
  chunk: CanonicalChunk;
  payload: Record<string, unknown>;
  writer?: "kaxi-direct-recovery" | "kaxi-n8n-orchestrated";
}) {
  const projection = buildRagServingEmbeddingProjection({
    content: input.chunk.content,
    documentLanguage: input.document.language,
  });
  const embedding = await createRagQueryEmbedding(projection.content);
  const vectorReady = isOpenAiQueryEmbedding(embedding);
  if (!vectorReady) {
    throw new Error(`OPENAI_SERVING_EMBEDDING_UNAVAILABLE: ${embedding.failureReason || embedding.status}`);
  }
```

with:

```ts
async function writeDirectRecoveryProjection(input: {
  supabase: SupabaseClient;
  document: CanonicalDocument;
  chunk: CanonicalChunk;
  payload: Record<string, unknown>;
  writer?: "kaxi-direct-recovery" | "kaxi-n8n-orchestrated";
  providedEmbedding?: unknown;
  providedContentHash?: string;
}) {
  const projection = buildRagServingEmbeddingProjection({
    content: input.chunk.content,
    documentLanguage: input.document.language,
  });
  const provided = resolveProvidedChunkEmbedding({
    value: input.providedEmbedding,
    providedContentHash: input.providedContentHash || "",
    expectedContentHash: projection.contentHash,
  });
  const embedding = provided.embedding ?? await createRagQueryEmbedding(projection.content);
  const vectorReady = isOpenAiQueryEmbedding(embedding);
  if (!vectorReady) {
    throw new Error(`OPENAI_SERVING_EMBEDDING_UNAVAILABLE: ${embedding.failureReason || embedding.status}`);
  }
```

In the `metadata` object literal directly below, add two fields after `embedding_failure_reason: null,`:

```ts
    embedding_source: provided.embeddingSource,
    embedding_rejected_reason: provided.rejectedReason,
```

Change the function's return (last line, `return "ready" as const;`) to:

```ts
  return {
    embeddingStatus: "ready" as const,
    embeddingSource: provided.embeddingSource,
    embeddingRejectedReason: provided.rejectedReason,
  };
```

- [ ] **Step 2: Update both callers**

Caller 1 — `ingestRagServingPayload`. Change the signature and the recovery call:

```ts
export async function ingestRagServingPayload(
  payload: Record<string, unknown>,
  options: { providedEmbedding?: unknown } = {},
) {
```

Replace the `await writeDirectRecoveryProjection({ ... })` call with:

```ts
  const projected = await writeDirectRecoveryProjection({
    supabase,
    document,
    chunk,
    payload: governedPayload,
    writer: "kaxi-n8n-orchestrated",
    providedEmbedding: options.providedEmbedding,
    providedContentHash: payloadText(payload.embedding_content_hash, 128),
  });
```

and add to the returned object (after `embeddingContentStrategy`):

```ts
    embeddingSource: projected.embeddingSource,
    embeddingRejectedReason: projected.embeddingRejectedReason,
```

Caller 2 — `syncRagServingProjection`'s `processChunk` direct-recovery block. Replace:

```ts
      const embeddingStatus = await writeDirectRecoveryProjection({
        supabase: data.supabase,
        document,
        chunk,
        payload,
      });
      return {
        chunkId: chunk.id,
        ok: true,
        status: responseStatus,
        writer: "kaxi-direct-recovery",
        embeddingStatus,
      };
```

with:

```ts
      const recovered = await writeDirectRecoveryProjection({
        supabase: data.supabase,
        document,
        chunk,
        payload,
      });
      return {
        chunkId: chunk.id,
        ok: true,
        status: responseStatus,
        writer: "kaxi-direct-recovery",
        embeddingStatus: recovered.embeddingStatus,
      };
```

- [ ] **Step 3: Send the projection text to n8n**

Still in `syncRagServingProjection`, replace:

```ts
        const signed = signN8nPayload("rag-ingestion", payload);
```

with:

```ts
        // n8n cannot compute the single-locale projection (core logic we must
        // not fork), so the exact text to embed travels inside the signed
        // payload; embedding_content_hash (already in `payload`) binds it.
        const signed = signN8nPayload("rag-ingestion", { ...payload, embedding_content: projection.content });
```

(`payload` itself stays unchanged — it is reused for direct-recovery metadata and must not carry the full projection text.)

- [ ] **Step 4: Route passes the top-level vector**

In `src/app/api/internal/n8n/rag-ingestion/route.ts`, replace:

```ts
    return NextResponse.json(await ingestRagServingPayload(payload));
```

with:

```ts
    // chunkEmbedding is top-level, OUTSIDE the receipt-bound payload: the
    // verification receipt binds the payloadHash KAXI originally signed, and
    // n8n attaches its computed vector alongside (same pattern as the
    // rag-runtime queryEmbedding). It is validated in the governed writer.
    return NextResponse.json(
      await ingestRagServingPayload(payload, { providedEmbedding: body.chunkEmbedding }),
    );
```

- [ ] **Step 5: Gates**

Run: `bun run ci:types && bun run lint && bun run test:provided-embedding && bun run test:rag-serving`
Expected: all PASS (`test:rag-serving` needs the local test DB via `prepareTestDb` — it is a regression check that governance/quarantine behavior is unchanged).

- [ ] **Step 6: Commit**

```bash
git add src/lib/knowledge/serving-projection.ts src/app/api/internal/n8n/rag-ingestion/route.ts
git commit -m "feat(n8n): governed ingestion accepts a hash-bound n8n chunk embedding

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: n8n orchestrator — Compute Chunk Embedding node

**Files:**
- Modify: `infra/n8n/kaxi-rag-typebot-orchestrator.mjs` (ingestion branch, ~:194-236 and the wiring at ~:405-408)
- Regenerate: `infra/n8n/kaxi-rag-typebot-orchestrator.json` (via `bun run n8n:build:orchestrator` — never by hand)
- Test: `scripts/test-n8n-rag-orchestration.ts` (append pins after the existing `Compute Query Embedding` regression block, ~:167)

**Interfaces:**
- Consumes: `payload.embedding_content` in the ingestion webhook body (Task 2 Step 3) and the top-level `chunkEmbedding` contract (Task 2 Step 4).
- Produces: compiled workflow JSON containing node `"Compute Chunk Embedding"` wired `Ingestion Signature Valid(true) → Compute Chunk Embedding → Run KAXI RAG Ingestion Core`.

- [ ] **Step 1: Write the failing test pins**

Append to `scripts/test-n8n-rag-orchestration.ts`, directly after the `Compute Query Embedding` regression-pin block (the assert ending "`…has no body/payload`"):

```ts
// Regression pin: Compute Chunk Embedding must read the ORIGINAL ingestion
// webhook body via a cross-node reference (at its own position $json is the
// IF node's passthrough of Verify Ingestion Signature's response), and it must
// embed the core-computed projection text, never the raw chunk content.
const computeChunkEmbedding = compiledOrchestrator.nodes.find(
  (node) => node.name === "Compute Chunk Embedding",
);
assert(computeChunkEmbedding, "compiled orchestrator is missing the Compute Chunk Embedding node");
const computeChunkEmbeddingBody = String(computeChunkEmbedding.parameters?.jsonBody || "");
assert(
  computeChunkEmbeddingBody.includes("$('RAG Knowledge Ingestion Webhook')"),
  "Compute Chunk Embedding must source its input from the original ingestion webhook payload",
);
assert(
  computeChunkEmbeddingBody.includes("embedding_content")
    && !computeChunkEmbeddingBody.includes("body?.content"),
  "Compute Chunk Embedding must embed the projection text (embedding_content), not the raw chunk content",
);
const ingestionCoreNode = compiledOrchestrator.nodes.find(
  (node) => node.name === "Run KAXI RAG Ingestion Core",
);
assert(
  String(ingestionCoreNode?.parameters?.jsonBody || "").includes("chunkEmbedding"),
  "ingestion core request must forward the computed chunk embedding top-level",
);
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun run test:n8n-orchestration`
Expected: FAIL with `compiled orchestrator is missing the Compute Chunk Embedding node`

- [ ] **Step 3: Add the node to the builder source**

In `infra/n8n/kaxi-rag-typebot-orchestrator.mjs`, insert between the `ingestionAllowed` and `runIngestionCore` declarations:

```js
const computeChunkEmbedding = node({
  type: "n8n-nodes-base.httpRequest",
  version: 4.2,
  config: {
    name: "Compute Chunk Embedding",
    position: [880, 600],
    onError: "continueRegularOutput",
    parameters: {
      method: "POST",
      url: "https://api.openai.com/v1/embeddings",
      authentication: "predefinedCredentialType",
      nodeCredentialType: "openAiApi",
      sendBody: true,
      specifyBody: "json",
      jsonBody: expr("{{ JSON.stringify({ model: 'text-embedding-3-small', input: String($('RAG Knowledge Ingestion Webhook').item.json.body?.embedding_content || '').slice(0, 4000), dimensions: 1536, encoding_format: 'float' }) }}"),
      options: { timeout: 10000 },
    },
  },
  output: [{ data: [{ embedding: [0.001, 0.002] }] }],
});
```

Then in `runIngestionCore`: change `position: [880, 600]` to `position: [1120, 600]`, and change its `jsonBody` to:

```js
      jsonBody: expr("{{ { verificationToken: $('Verify Ingestion Signature').item.json.verificationToken ?? '', payload: $('RAG Knowledge Ingestion Webhook').item.json.body ?? {}, chunkEmbedding: Array.isArray($json.data) && Array.isArray($json.data[0]?.embedding) ? $json.data[0].embedding : undefined } }}"),
```

In `respondIngestion`: change `position: [1160, 600]` to `position: [1400, 600]`.

In the workflow wiring at the bottom, replace:

```js
    .onTrue(runIngestionCore.to(respondIngestion))
```

with:

```js
    .onTrue(computeChunkEmbedding.to(runIngestionCore.to(respondIngestion)))
```

Failure behavior (why this is safe): `onError: "continueRegularOutput"` means an OpenAI failure/timeout or missing `embedding_content` still flows to the core node, whose `$json.data` guard then yields `chunkEmbedding: undefined` → the core embeds itself. The `.slice(0, 4000)` must stay — it mirrors `createRagQueryEmbedding`'s identical slice so both sides embed byte-identical text.

- [ ] **Step 4: Rebuild the compiled JSON and verify**

Run: `bun run n8n:build:orchestrator && bun run test:n8n-orchestration && bun run test:n8n-signature`
Expected: build prints `PASS built infra/n8n/kaxi-rag-typebot-orchestrator.json (… nodes, KAXI RAG Typebot Orchestrator)`; both tests PASS (the new pins now pass; all pre-existing pins — including `!railwayWorkflow.includes("embeddingsOpenAi")` — still hold because the node is a plain httpRequest).

- [ ] **Step 5: Commit**

```bash
git add infra/n8n/kaxi-rag-typebot-orchestrator.mjs infra/n8n/kaxi-rag-typebot-orchestrator.json scripts/test-n8n-rag-orchestration.ts
git commit -m "feat(n8n): Compute Chunk Embedding node in the ingestion branch

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Spec status + final gates

**Files:**
- Modify: `docs/superpowers/specs/2026-07-17-n8n-embedding-ownership-design.md:4` (Status line)

**Interfaces:** none (documentation + verification only).

- [ ] **Step 1: Record implementation status**

Change line 4 of the spec from:

```markdown
Status: Draft for operator review
```

to:

```markdown
Status: A implemented & live (n8n-primary, 2026-07-17). B implemented (plan 2026-07-18-n8n-ingestion-embedding); rollout pending workflow PUT.
```

- [ ] **Step 2: Full relevant gates**

Run: `bun run ci:types && bun run lint && bun run test:provided-embedding && bun run test:rag-serving && bun run test:n8n-orchestration && bun run test:n8n-signature && bun run test:embedding-cache-key`
Expected: all PASS (`test:embedding-cache-key` is the regression witness that no cache behavior changed).

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-07-17-n8n-embedding-ownership-design.md
git commit -m "docs(n8n): record sub-project B implementation status

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Rollout (operator-gated, AFTER merge + KAXI production deploy)

No repo files; operational. Order matters — the KAXI contract must be live before the workflow PUT (a new-workflow n8n sending `chunkEmbedding`/`embedding_content` to an old core is harmless — the core ignores unknown fields — but the reverse order gets no benefit and muddies verification).

- [ ] **Step 1:** Merge the PR into `main`; deploy via `gh workflow run "Vercel Production Deploy"`; wait for success (`gh run list --workflow "Vercel Production Deploy" --limit 1`); then the standard post-deploy checks (`/api/health`, `/api/readiness` 200; unauthenticated `/api/documents` 401).
- [ ] **Step 2:** Update the live n8n workflow `bHHyeC1DCUSvi7Px` with the newly compiled `infra/n8n/kaxi-rag-typebot-orchestrator.json` via the established API `PUT` procedure from the v3/A rollouts (API key read from the `.local` env file — never printed; no UI import). Verify the returned node list includes `Compute Chunk Embedding` and the version stamp.
- [ ] **Step 3:** Live probe: run one governed sync (`bun run scripts/sync-rag-serving-projection.ts` with a small limit against a real pending/force target) and confirm in the response/serving row metadata: `writer: "n8n"`, `embedding_source: "n8n-openai"`, `embedding_rejected_reason: null`. Then confirm the fallback leg still works by observing (or forcing via a no-op) that rows written through direct recovery carry `embedding_source: "core"`.
