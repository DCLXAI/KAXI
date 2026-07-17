# n8n Query-Path Embedding (Sub-project A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the n8n orchestrator compute the OpenAI query embedding and hand the vector to the KAXI core, which validates it and uses it for hybrid retrieval — with byte-identical behavior when no vector is supplied.

**Architecture:** A pure parser (`parseProvidedQueryEmbedding`) turns an untrusted `number[]` into a `QueryEmbeddingResult` that satisfies the existing `isOpenAiQueryEmbedding` guard, or rejects it with a named reason. `/api/internal/n8n/rag-runtime` reads the vector from a TOP-LEVEL body field (`queryEmbedding`, outside `payload` — the verification receipt binds `payloadHash`, so the payload n8n forwards must stay byte-identical to what KAXI signed) and injects it through `runDirectRagFallback`'s existing `dependencies.createEmbedding` seam. The n8n workflow gains one HTTP node that calls OpenAI `/v1/embeddings` with an n8n-held credential and forwards the vector; on any embedding failure the workflow proceeds without it.

**Tech Stack:** Next.js route handlers, `QueryEmbeddingResult` contract (`src/lib/chat/query-embedding.ts:10-21`), hybrid RPC `match_rag_documents_hybrid_v3(query_embedding vector(1536), …)`, n8n workflow source `infra/n8n/kaxi-rag-typebot-orchestrator.mjs` compiled via `bun run n8n:build:orchestrator`.

**Spec:** `docs/superpowers/specs/2026-07-17-n8n-embedding-ownership-design.md` (sub-project A)

## Global Constraints

- Branch: `feat/n8n-query-embedding` (from up-to-date `main`; never commit to `main`).
- The supplied vector is DATA, never trusted computation: exactly 1536 finite numbers, L2 norm within [0.5, 2.0]; any failure → core embeds as today + rejection reason recorded.
- Absent `queryEmbedding` → behavior byte-identical to today (n8n and KAXI deploy independently).
- `queryEmbedding` lives at the request-body TOP LEVEL, never inside `payload` (receipt `payloadHash` binding).
- The fabricated `QueryEmbeddingResult` must pass `isOpenAiQueryEmbedding` (`query-embedding.ts:97-103`: status `"ready"`, provider `"openai-compatible"`, model `text-embedding-3-small`, dimensions 1536) and fail `isCanonicalQueryEmbedding`.
- New telemetry keys on the rag-runtime response `searchMeta`: `embeddingSource: "n8n-openai" | "core"`, `providedEmbeddingRejected: string | null`.
- n8n workflow: embedding-node failure must NOT block the turn (`onError: "continueRegularOutput"`); the `Run KAXI RAG Core` call proceeds without the vector.
- Do NOT stage/commit `Capsomnia/` or `.superpowers/`; never run db:migrate/prisma; commit trailer verbatim: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- Production rollout (workflow PUT, `KAXI_RAG_RUNTIME_PRIMARY=n8n` flip) is OUT of this plan — see the Runbook section; the n8n credential rotation is its prerequisite.

---

### Task 1: `parseProvidedQueryEmbedding` (pure module + test)

**Files:**
- Create: `src/lib/n8n/provided-query-embedding.ts`
- Create: `scripts/test-provided-query-embedding.ts`
- Modify: `package.json` (script `"test:provided-embedding": "bun run scripts/test-provided-query-embedding.ts"`; append `&& bun run test:provided-embedding` to `ci:domain`)

**Interfaces:**
- Produces: `parseProvidedQueryEmbedding(value: unknown): ProvidedEmbeddingParse` where
  `ProvidedEmbeddingParse = { ok: true; embedding: QueryEmbeddingResult } | { ok: false; reason: "not_provided" | "invalid_shape" | "invalid_dimension" | "non_finite" | "abnormal_norm" }`.
- Consumes: `RAG_QUERY_EMBEDDING_DIMENSIONS`, `RAG_QUERY_EMBEDDING_MODEL`, `QueryEmbeddingResult` from `@/lib/chat/query-embedding`.

- [ ] **Step 1: Write the failing test** — `scripts/test-provided-query-embedding.ts`:

```ts
import assert from "node:assert/strict";
const { parseProvidedQueryEmbedding } = await import("../src/lib/n8n/provided-query-embedding");
const { isOpenAiQueryEmbedding, isCanonicalQueryEmbedding, RAG_QUERY_EMBEDDING_DIMENSIONS } = await import("../src/lib/chat/query-embedding");

const unit = new Array(RAG_QUERY_EMBEDDING_DIMENSIONS).fill(0);
unit[0] = 1; // L2 norm = 1, OpenAI-style normalized vector

const ok = parseProvidedQueryEmbedding(unit);
assert.equal(ok.ok, true);
if (ok.ok) {
  assert.equal(isOpenAiQueryEmbedding(ok.embedding), true);
  assert.equal(isCanonicalQueryEmbedding(ok.embedding), false);
  assert.equal(ok.embedding.vector?.length, 1536);
  assert.equal(ok.embedding.provider, "openai-compatible");
  assert.equal(ok.embedding.status, "ready");
}

assert.deepEqual(parseProvidedQueryEmbedding(undefined), { ok: false, reason: "not_provided" });
assert.deepEqual(parseProvidedQueryEmbedding(null), { ok: false, reason: "not_provided" });
assert.deepEqual(parseProvidedQueryEmbedding("[1,2,3]"), { ok: false, reason: "invalid_shape" });
assert.deepEqual(parseProvidedQueryEmbedding(unit.slice(0, 384)), { ok: false, reason: "invalid_dimension" });

const withNaN = [...unit]; withNaN[7] = Number.NaN;
assert.deepEqual(parseProvidedQueryEmbedding(withNaN), { ok: false, reason: "non_finite" });
const withString = [...unit]; (withString as unknown[])[3] = "0.5";
assert.deepEqual(parseProvidedQueryEmbedding(withString), { ok: false, reason: "non_finite" });

assert.deepEqual(parseProvidedQueryEmbedding(new Array(1536).fill(0)), { ok: false, reason: "abnormal_norm" });
assert.deepEqual(parseProvidedQueryEmbedding(new Array(1536).fill(1)), { ok: false, reason: "abnormal_norm" });

console.log("PASS provided query embedding: shape, guards, predicate compatibility");
```

- [ ] **Step 2: Run — must fail** — `bun run scripts/test-provided-query-embedding.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement** — `src/lib/n8n/provided-query-embedding.ts`:

```ts
import {
  RAG_QUERY_EMBEDDING_DIMENSIONS,
  RAG_QUERY_EMBEDDING_MODEL,
  type QueryEmbeddingResult,
} from "@/lib/chat/query-embedding";

export type ProvidedEmbeddingParse =
  | { ok: true; embedding: QueryEmbeddingResult }
  | {
    ok: false;
    reason: "not_provided" | "invalid_shape" | "invalid_dimension" | "non_finite" | "abnormal_norm";
  };

// An n8n-supplied query vector is untrusted DATA. It is accepted only when it
// is exactly the shape the core's own OpenAI embedder would have produced
// (isOpenAiQueryEmbedding-compatible); anything else falls back to the core
// embedding with the rejection reason recorded. Norm bounds: OpenAI
// text-embedding-3-small returns unit-normalized vectors; [0.5, 2.0] allows
// float drift while rejecting zero/garbage vectors.
export function parseProvidedQueryEmbedding(value: unknown): ProvidedEmbeddingParse {
  if (value === undefined || value === null) return { ok: false, reason: "not_provided" };
  if (!Array.isArray(value)) return { ok: false, reason: "invalid_shape" };
  if (value.length !== RAG_QUERY_EMBEDDING_DIMENSIONS) return { ok: false, reason: "invalid_dimension" };
  const vector: number[] = new Array(value.length);
  let sumSquares = 0;
  for (let index = 0; index < value.length; index++) {
    const item = value[index];
    if (typeof item !== "number" || !Number.isFinite(item)) return { ok: false, reason: "non_finite" };
    vector[index] = item;
    sumSquares += item * item;
  }
  const norm = Math.sqrt(sumSquares);
  if (norm < 0.5 || norm > 2.0) return { ok: false, reason: "abnormal_norm" };
  return {
    ok: true,
    embedding: {
      vector,
      status: "ready",
      provider: "openai-compatible",
      model: RAG_QUERY_EMBEDDING_MODEL,
      dimensions: RAG_QUERY_EMBEDDING_DIMENSIONS,
      failureReason: null,
      latencyMs: 0,
    },
  };
}
```

- [ ] **Step 4: Run — PASS**, then wire `package.json` (script + `ci:domain` append) and run `bun run ci:types && bun run lint`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/n8n/provided-query-embedding.ts scripts/test-provided-query-embedding.ts package.json
git commit -m "feat: parse and validate n8n-supplied query embeddings

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: rag-runtime contract extension

**Files:**
- Modify: `src/app/api/internal/n8n/rag-runtime/route.ts` (body read :56, `runDirectRagFallback` call :90-104, response searchMeta :108-126)
- Modify: `scripts/test-provided-query-embedding.ts` (add the dependency-resolution cases)
- Create: nothing new — the helper lives beside the parser

**Interfaces:**
- Consumes: `parseProvidedQueryEmbedding` (Task 1); `runDirectRagFallback(input, dependencies)` (`direct-lexical-fallback.ts:1372-1375`), `dependencies.createEmbedding?: (question: string) => Promise<QueryEmbeddingResult>` (`:79`).
- Produces: exported `resolveProvidedEmbedding(value: unknown): { dependencies: { createEmbedding?: () => Promise<QueryEmbeddingResult> } ; embeddingSource: "n8n-openai" | "core"; rejectedReason: string | null }` added to `src/lib/n8n/provided-query-embedding.ts`.

- [ ] **Step 1: Write the failing test** — append to `scripts/test-provided-query-embedding.ts`:

```ts
const { resolveProvidedEmbedding } = await import("../src/lib/n8n/provided-query-embedding");

const resolvedOk = resolveProvidedEmbedding(unit);
assert.equal(resolvedOk.embeddingSource, "n8n-openai");
assert.equal(resolvedOk.rejectedReason, null);
assert.ok(resolvedOk.dependencies.createEmbedding);
const injected = await resolvedOk.dependencies.createEmbedding!();
assert.equal(isOpenAiQueryEmbedding(injected), true);

const resolvedAbsent = resolveProvidedEmbedding(undefined);
assert.equal(resolvedAbsent.embeddingSource, "core");
assert.equal(resolvedAbsent.rejectedReason, null);
assert.equal(resolvedAbsent.dependencies.createEmbedding, undefined);

const resolvedBad = resolveProvidedEmbedding(unit.slice(0, 10));
assert.equal(resolvedBad.embeddingSource, "core");
assert.equal(resolvedBad.rejectedReason, "invalid_dimension");
assert.equal(resolvedBad.dependencies.createEmbedding, undefined);

console.log("PASS provided embedding resolution: inject on valid, core fallback otherwise");
```

- [ ] **Step 2: Run — must fail** (`resolveProvidedEmbedding` not exported).

- [ ] **Step 3: Implement** — append to `src/lib/n8n/provided-query-embedding.ts`:

```ts
export function resolveProvidedEmbedding(value: unknown): {
  dependencies: { createEmbedding?: () => Promise<QueryEmbeddingResult> };
  embeddingSource: "n8n-openai" | "core";
  rejectedReason: string | null;
} {
  const parsed = parseProvidedQueryEmbedding(value);
  if (parsed.ok) {
    return {
      dependencies: { createEmbedding: async () => parsed.embedding },
      embeddingSource: "n8n-openai",
      rejectedReason: null,
    };
  }
  return {
    dependencies: {},
    embeddingSource: "core",
    rejectedReason: parsed.reason === "not_provided" ? null : parsed.reason,
  };
}
```

Then wire the route (`rag-runtime/route.ts`):
(3a) import: `import { resolveProvidedEmbedding } from "@/lib/n8n/provided-query-embedding";`
(3b) after the payload checks (below line 89), add:

```ts
    // Top-level on purpose: the verification receipt binds payloadHash, so the
    // signed payload n8n forwards must stay byte-identical; the vector rides
    // outside it and is treated as untrusted data (validated below).
    const providedEmbedding = resolveProvidedEmbedding(body?.queryEmbedding);
```

(3c) the `runDirectRagFallback` call gains the dependency argument:

```ts
    const direct = await runDirectRagFallback({
      /* existing input object UNCHANGED */
    }, providedEmbedding.dependencies);
```

(3d) the response `searchMeta` merge (:111-121) gains two keys after `retrievalProvenance`:

```ts
        embeddingSource: providedEmbedding.embeddingSource,
        providedEmbeddingRejected: providedEmbedding.rejectedReason,
```

- [ ] **Step 4: Run tests** — `bun run test:provided-embedding` → PASS; regressions `bun run test:rag-fallback && bun run test:grounded-answer && bun run ci:types && bun run lint` → all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/n8n/provided-query-embedding.ts src/app/api/internal/n8n/rag-runtime/route.ts scripts/test-provided-query-embedding.ts
git commit -m "feat: accept validated n8n-supplied query embeddings in the RAG core

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: n8n workflow — embedding node + compile

**Files:**
- Modify: `infra/n8n/kaxi-rag-typebot-orchestrator.mjs` (Typebot Runtime branch, nodes at lines ~8-119)
- Regenerate: `infra/n8n/kaxi-rag-typebot-orchestrator.json` via `bun run n8n:build:orchestrator`

**Interfaces:**
- Consumes: the Task 2 contract — top-level `queryEmbedding: number[]` next to `verificationToken`/`payload` in the `Run KAXI RAG Core` POST body.
- Produces: the compiled workflow JSON for the (separate, runbook-gated) API PUT rollout.

- [ ] **Step 1: Read the `.mjs` builder conventions first** (node objects, id/position management, how `Run KAXI RAG Core`'s body is built). Then insert ONE node between the runtime-branch signature IF (true output) and `Run KAXI RAG Core`:

Node (adapt to the file's declaration style — name, type, and parameters are binding):

```js
{
  name: "Compute Query Embedding",
  type: "n8n-nodes-base.httpRequest",
  typeVersion: 4.2,
  onError: "continueRegularOutput",
  parameters: {
    method: "POST",
    url: "https://api.openai.com/v1/embeddings",
    authentication: "predefinedCredentialType",
    nodeCredentialType: "openAiApi",
    sendBody: true,
    specifyBody: "json",
    jsonBody: `={{ JSON.stringify({
      model: "text-embedding-3-small",
      input: String($json.body?.payload?.retrievalQuery || $json.body?.payload?.question || "").slice(0, 4000),
      dimensions: 1536,
      encoding_format: "float"
    }) }}`,
    options: { timeout: 4000 },
  },
}
```

and extend the `Run KAXI RAG Core` request body so it includes, alongside the existing `verificationToken` and untouched `payload`:

```
queryEmbedding: {{ Array.isArray($json.data) && Array.isArray($json.data[0]?.embedding) ? $json.data[0].embedding : undefined }}
```

with the ORIGINAL webhook payload still sourced from the trigger/verify nodes (`$('Typebot Runtime Webhook')…` style references, per the file's existing expressions) — the embedding node's output must not replace the payload reference. On the embedding node's error output (continueRegularOutput), `$json.data` is absent → the expression yields `undefined` → the body field is omitted → Task 2's `not_provided` path.

- [ ] **Step 2: Compile** — `bun run n8n:build:orchestrator`
Expected: exit 0; `git diff --stat infra/n8n/` shows the `.json` regenerated.

- [ ] **Step 3: Sanity-pin the artifact** — verify with `python3 -c "import json; d=json.load(open('infra/n8n/kaxi-rag-typebot-orchestrator.json')); names=[n['name'] for n in d['nodes']]; assert 'Compute Query Embedding' in names, names; print('node count:', len(d['nodes']))"`. If an existing test pins the orchestrator node count or structure (grep `scripts/` for `orchestrator`), update it in the same commit.

- [ ] **Step 4: Gates** — `bun run ci:types && bun run lint` (the `.mjs` is plain JS input to the build script; typecheck must stay green).

- [ ] **Step 5: Commit**

```bash
git add infra/n8n/kaxi-rag-typebot-orchestrator.mjs infra/n8n/kaxi-rag-typebot-orchestrator.json
git commit -m "feat: compute the query embedding in the n8n orchestrator

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: full gates + PR

- [ ] **Step 1:** `bun run ci:types && bun run lint` locally; full `ci:domain`/`ci:ops` run in the PR's CI (local DB consent gate — do not bypass).
- [ ] **Step 2:** Push and open a PR titled "n8n query-path embedding (sub-project A)"; body links the spec and states: contract is inert until the workflow rollout, rollout is runbook-gated on the n8n credential rotation.
- [ ] **Step 3:** Write `.superpowers/sdd/n8n-embedding-report.md` (NOT committed): per-task TDD evidence, gate tails.

---

## Runbook (manual rollout — OUT of plan scope, operator-gated)

1. Rotate the n8n instance API key + MCP bearer (prerequisite; exposed in chat).
2. Create the OpenAI credential in n8n (type `openAiApi`, an EMBEDDING-scoped key — prefer the dedicated `OPENAI_EMBEDDING_API_KEY` value, not the chat key).
3. Roll out the compiled workflow via the v3 procedure: n8n API `PUT /workflows/bHHyeC1DCUSvi7Px` with schema-valid settings keys (never UI "Import from URL"), verify node count, keep the previous version for rollback.
4. Signed probe on the n8n path → response `searchMeta.embeddingSource === "n8n-openai"`; grounded answer quality unchanged; latency delta recorded.
5. Flip `KAXI_RAG_RUNTIME_PRIMARY=n8n` (Vercel env + redeploy); watch `ops_events` and `retrieval_runs` for a day; rollback = unset the flag.

## Self-review notes

- Spec A coverage: contract (Tasks 1-2), workflow (Task 3), telemetry keys (Task 2 3d), byte-identical-when-absent (Task 2 resolveProvidedEmbedding absent-path + regression suites), rollout gating (Runbook).
- Type consistency: `ProvidedEmbeddingParse`/`resolveProvidedEmbedding` defined in Task 1/2 and consumed only by the route; the fabricated result's fields match `QueryEmbeddingResult` exactly (`query-embedding.ts:10-21`).
- The payloadHash trap (vector must ride outside `payload`) is encoded in both the route comment and the workflow body change.
