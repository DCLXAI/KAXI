# Lifecycle Phase C — E-7/F-2/F-5 Corpus Deepening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three official-source knowledge docs (general E-7 employment requirements, F-2 points-based residency, F-5 permanent-residency routes) enter the EXISTING governance pipeline as PENDING legal-review candidates — harvested from official pages, never authored by the model, never auto-approved. Their approval (operator/legal) is the unlock condition for F-2/F-5 product tracks.

**Architecture:** The static corpus (knowledge-corpus.ts) defaults to approved — WRONG path (verified: resolveSourceMetadata defaults reviewStatus "approved"). The correct path is the verified-official-sources registry: entries in `VERIFIED_OFFICIAL_KNOWLEDGE_SOURCES` (src/lib/knowledge/verified-official-sources.ts) are harvested by `knowledge:harvest:official` into `KnowledgeDocument`/`KnowledgeChunk` rows with `reviewStatus: PENDING` via `upsertPendingKnowledgeCandidate` (repository.ts:619-691), embedded by `knowledge:embed:candidates`, exported as a legal-review JSONL packet (`legal-review:export`), and only a HUMAN decision applied via `legal-review:apply` → `knowledge:promote:candidates` flips them APPROVED and projects them into serving. Task 1 is a small code PR (3 registry entries with VERIFIED fetchable official URLs + harvest-test pins). Task 2 is operational: run harvest/embed/export (PENDING writes are the pipeline's designed inert state), verify rows are PENDING, and produce the packet. Task 3 is the operator handoff.

**Tech Stack:** TypeScript registry entry + existing bun pipeline scripts.

## Global Constraints

- Branch: `feat/lifecycle-corpus-sources` off `main` (after Phase B merges). Trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- NEVER add these docs to knowledge-corpus.ts / source-metadata.ts (auto-approve path). NEVER call approve/apply/promote scripts — PENDING is the terminal state for this phase; approval is the operator's legal review, full stop.
- URLs must be REAL and VERIFIED fetchable (WebFetch/curl the page; confirm the requiredContentSignals strings actually appear in the page text) BEFORE committing. Official hosts only (easylaw.go.kr / hikorea.go.kr / moj.go.kr / immigration.go.kr). If a suitable page for one of the three topics cannot be verified, DROP that entry and report it — never commit an unverified URL.
- Registry entry shape per the existing file (docId, title, sourceUrl, sourceType, topic, legalPriority, monitorCadence, evidenceKind, changeSignals, requiredContentSignals, minimumExtractedChars). docIds: `official-e7-employment-requirements`, `official-f2-points-residency`, `official-f5-permanent-residency`.
- Harvest/embed/export runs (Task 2) write ONLY PENDING candidates + embeddings — no approvals, no serving changes. Export packet path recorded for the operator.

---

### Task 1: Registry entries (code PR)

**Files:**
- Modify: `src/lib/knowledge/verified-official-sources.ts` (3 entries appended)
- Tests: run `bun run test:official-source-harvest` — advance any source-count/shape pins consciously

- [ ] **Step 1:** Find + VERIFY candidate official pages (fetch each; confirm signals in text):
  - E-7: prefer EasyLaw's 외국인 전문인력/취업 content or HiKorea's E-7 안내 (the combined requirements manual URL already used by the corpus is acceptable if page text covers E-7 요건); requiredContentSignals like ["E-7", "특정활동"].
  - F-2: EasyLaw or HiKorea page covering 거주(F-2) / 점수제(F-2-7); signals ["F-2", "점수"] (adjust to the real page's wording).
  - F-5: EasyLaw 영주자격 guide or HiKorea F-5 안내; signals ["F-5", "영주"].
  Record the verification evidence (fetched-text excerpts containing the signals) in the report.
- [ ] **Step 2:** Append the three entries (topic "visa", sourceType "official_government", legalPriority 3, monitorCadence "weekly", evidenceKind "government_guidance", minimumExtractedChars 700, changeSignals sensible per topic e.g. ["e7","wage","occupation"] / ["f2","points","residency"] / ["f5","permanent","routes"]).
- [ ] **Step 3:** Gates: `bun run test:official-source-harvest && bun run ci:types && bun run lint` (advance pins consciously; DB-gated portions → CI). Commit `feat(knowledge): register E-7/F-2/F-5 official sources for pending harvest` (trailer). PR → CI → merge (no deploy needed for the registry alone, but deploying is harmless — follow the standard flow).

### Task 2: Harvest → embed → export (operational, orchestrator-run)

- [ ] `bun run knowledge:harvest:official` (writes PENDING candidates; report per-source outcome — a fetch/signal failure for one source is reported, not retried blindly).
- [ ] `bun run knowledge:embed:candidates`.
- [ ] `bun run legal-review:export` → record the packet path.
- [ ] Verify via DB read: the three `__candidate__` docIds exist with `reviewStatus: PENDING` (and remain PENDING at the end — assert nothing approved).

### Task 3: Operator handoff

- [ ] Write a short handoff note (ledger + final message): packet path, the operator commands for the approval leg (`legal-review:validate` → `legal-review:apply` → `knowledge:promote:candidates` → `bun run scripts/sync-rag-serving-projection.ts --execute --confirm-contract 2026-07-14.v4`), and the explicit statement that F-2/F-5 workspace tracks remain product-locked until these docs are APPROVED and serving.
