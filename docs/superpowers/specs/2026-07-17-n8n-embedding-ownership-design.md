# n8n Embedding Ownership: OpenAI Query + Ingestion Embeddings in n8n, Retrieval/Generation/Guardrails in the KAXI Core

Date: 2026-07-17
Status: A implemented & live (n8n-primary, 2026-07-17). B implemented & live (PR #32, workflow PUT + probe verified 2026-07-18: writer n8n, ingest_embedding_source n8n-openai).

## Problem / Motivation

The operator wants the n8n + Typebot architecture "completed" so that n8n
genuinely participates in the RAG pipeline instead of acting as a signed
passthrough. The stated motive is **using the n8n ecosystem** (LangChain
nodes, connectors, canvas visibility). The attached v1 workflow ("KAXI RAG
Typebot Architecture") sketched this but is not shippable as-is: its
embedding/vector-search nodes are `disabled: true`, its "generation" is a
deterministic regex-extraction Code node (no LLM), and its provenance is
stale (`@2026-07-12` vs the core's `@2026-07-14 p3-v3`).

An architecture consult (Opus, file-level evidence) established the safe
boundary: moving generation or guardrails into n8n would lose the core's
anti-hallucination contract (`supported=false`/`usedSourceIndexes` is
produced AT generation time — `grounded-rag-answer.ts:274-287` — and cannot
be reconstructed by a post-hoc guard pass), and re-implementing retrieval
would fork hybrid RRF v3 + rerank. The operator chose: **n8n owns OpenAI
embeddings (query + ingestion); retrieval, generation, guardrails,
mediation, session profiles, provenance, and persistence remain exclusively
in the KAXI core.** Chat runs **n8n-primary with direct fallback**.

Two facts make this design cheap and robust:

- `match_rag_documents_hybrid_v3(query_embedding vector(1536) DEFAULT NULL, …)`
  already accepts a precomputed vector and labels it `provider-query`
  (migration `20260714090000_rag_provider_independent_hybrid`).
- The direct core already has an embedding injection seam:
  `createEmbedding?: (question) => Promise<QueryEmbeddingResult>`
  (`direct-lexical-fallback.ts:79`, consumed at `:1264`).

So n8n-supplied vectors are wiring, not reimplementation.

## Boundary (binding)

| n8n owns | KAXI core owns (exclusively) |
| --- | --- |
| Network primary for the Typebot webhook | Hybrid retrieval (RRF v3 + rerank v11, locale/citation/category/visa filters) |
| OpenAI **query** embedding (LangChain `embeddingsOpenAi`) | LLM generation (Kimi gateway, retry/repair, output budget) |
| OpenAI **ingestion** embedding + text splitting | Guardrails, mediation, risk patterns, calibration thresholds |
| Connector/queueing/fan-out extensions on the canvas | Session profiles, account linkage, idempotent persistence, provenance |
| Error-workflow reporting (existing) | Ingestion governance (validation, PENDING candidates, canonical writes) |

n8n never writes to Supabase RAG tables directly (`vectorStoreSupabase`
insert mode and the v1 `Save Handoff Update` direct-write pattern are
prohibited — writes go through the governed KAXI endpoints).

## Sub-project A — query-path embedding

1. **n8n workflow** (extend the LIVE v3 orchestrator source
   `infra/n8n/kaxi-rag-typebot-orchestrator.mjs` — NOT the attached v1):
   in the Typebot Runtime branch, after signature verification, an
   `embeddingsOpenAi` node (model `text-embedding-3-small`, 1536 dims,
   n8n-held OpenAI credential) embeds the mediated retrieval query; the
   `Run KAXI RAG Core` HTTP node then includes `queryEmbedding` (number
   array) in the POST body. If the embedding node fails, the workflow
   proceeds WITHOUT `queryEmbedding` (never blocks the turn).
2. **Contract** — `/api/internal/n8n/rag-runtime` accepts optional
   `queryEmbedding: number[]`. Present and valid → injected through the
   `createEmbedding` seam so the RPC receives it as `query_embedding`
   (provider-query mode). Absent → the core embeds as today (backward
   compatible; n8n and KAXI deploy independently).
3. **Server-side defense (trust boundary)**: the core validates length
   (exactly 1536), all elements finite numbers, and L2 norm within
   [0.5, 2.0]; any failure falls back to core embedding and records the
   rejection reason. n8n input is data, never trusted computation.
4. **Provenance/telemetry**: `search_meta.embeddingSource:
   "n8n-openai" | "core"` (+ rejection reason when a supplied vector was
   discarded), so quality/latency can be compared per source.

## Sub-project B — ingestion-path embedding (after A is verified)

1. n8n ingestion branch: `formTrigger`/webhook → text splitter →
   `embeddingsOpenAi` (ingest) → POST to `/api/internal/n8n/rag-ingestion`
   with per-chunk `{ content, embedding }` pairs.
2. Contract: the ingestion endpoint accepts optional per-chunk embeddings;
   same validation as A (dimension/finiteness/norm, plus a chunk-count
   bound). Valid → stored through the EXISTING governance path (PENDING
   candidates, review gates) with the supplied vectors; invalid or absent →
   core embeds as today.
3. The core's embedding cache keys must not poison: cache writes are
   skipped for supplied vectors (they did not come from the core's
   provider call).

## Rollout

1. **Prerequisite: rotate the exposed n8n credentials** (instance API key
   and MCP bearer were exposed in operator chat). Handing n8n an OpenAI
   credential while its admin key is compromised is not acceptable; the
   rotation is the gate for giving n8n any new secret.
2. Ship A's KAXI contract change first (inert without a sender), then the
   workflow update via the established compile → API `PUT` → version-check
   procedure from the v3 rollout (no UI "Import from URL").
3. Verify on the n8n path with signed probes: `embeddingSource:
   "n8n-openai"` appears, answers remain grounded, latency delta recorded.
4. **Flip `KAXI_RAG_RUNTIME_PRIMARY=n8n`** (Vercel env + redeploy) — chat
   becomes n8n-primary with the direct core as fallback, per the operator's
   choice. The direct path stays fully functional (it is the fallback and
   still embeds for itself).
5. B follows the same sequence once A's telemetry looks healthy.

## Recorded trade-offs (operator-accepted)

- Query latency increases (KAXI→n8n→OpenAI→n8n→KAXI vs KAXI→OpenAI):
  expected +200-600ms per turn on the n8n path.
- Functional gain is limited (the core already embeds correctly); the value
  is operational — provider/model management and pipeline visibility on the
  n8n canvas without code deploys.
- The n8n path bypasses the core's query-embedding cache; cache hit-rate
  loss is accepted on that path.

## Out of scope

- Moving retrieval, generation, guardrails, mediation, session profiles, or
  persistence into n8n (consult verdict: quality inversion + P0 safety
  divergence + anti-hallucination contract loss).
- LLM provider changes (generation stays on the KAXI Kimi gateway).
- The attached v1 workflow's direct-write nodes (`vectorStoreSupabase`
  insert, `Save Handoff Update` supabase node) — superseded by governed
  endpoints.
- Typebot bot-flow changes (the bot already posts to the gateway; the
  gateway's n8n-primary flag does the routing).

## Testing

1. Unit (DB-free, mocked seam): valid 1536 vector → injected, RPC receives
   provider vector, `embeddingSource: "n8n-openai"`; wrong dimension /
   NaN / absurd norm → rejected + core fallback + reason recorded; absent →
   byte-identical behavior to today.
2. Ingestion contract: supplied chunk vectors accepted only with valid
   shape; governance path (PENDING candidate creation) unchanged either way;
   cache not written for supplied vectors.
3. Workflow artifact: compiled orchestrator JSON schema-valid, node-count
   pinned, provenance version strings match the core's current values
   (drift tripwire, same pattern as the brand-color pin).
4. Gates: `ci:types && lint && ci:domain && ci:ops`; live signed probe on
   the n8n path before and after the primary flip.
