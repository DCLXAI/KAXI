# LLM Involvement Expansion: Answer Retry/Repair, LLM Clarifications, Agent Fallback Telemetry

Date: 2026-07-16
Status: Approved (operator chose the ①+②+⑤ bundle, then approved this design)

## Problem

Production telemetry (`retrieval_runs`, 2026-07-13..15, current pipeline: 67 runs)
shows the LLM (Kimi, `kimi-for-coding`) writes only ~48% of chatbot answers:

- 15 runs (22%) were LLM-eligible but fell back to extractive summaries —
  `generation_failed` (10) and `invalid_generation` (5). Pure loss.
- Clarification turns ship a static 4-locale template whenever mediation ran
  deterministically (by design for vague questions) or fell back.
- The action agent's "KAXI 내장 도구로 확인한 결과" fallback fired in production
  (operator saw it) but is recorded nowhere durable — Vercel runtime log
  retention already aged out the evidence. Observability gap.

Investigated facts that bound this design:

- `generateGroundedRagAnswer` calls the LLM once, no retry
  (`grounded-rag-answer.ts:189-236`). Its parser (`parseModelOutput`, :107-129)
  is strict: no nested unwrapping, no key aliases; a parse miss discards the
  generated text entirely.
- `mediateRagQuestion` already has a PROVEN retry pattern — on parse failure
  only, one retry with a condensed harsher prompt, reduced maxTokens, schema
  name suffixed `_retry` (`question-mediator.ts:626-656`), covered by
  `test-rag-direct-fallback.ts`.
- Clarification copy is already LLM-written when mediation ran via LLM; the
  template appears only on the deterministic path and on LLM failure
  (`question-mediator.ts:140-157`, `typebot-rag/route.ts:575-599`).
- Both LLM provider slots point at the same vendor (Kimi) — provider failover
  does not protect against a vendor-wide transient, so an in-turn retry has
  real value for `generation_failed` too.

## A. Grounded answer retry + repair (`src/lib/chat/grounded-rag-answer.ts`)

1. **Tolerant parsing** — port the mediator parser's leniency:
   - unwrap nested containers (`result` / `output` / `data`) before field reads;
   - accept key aliases the mediator's `read(...)` pattern accepts;
   - default `usedSourceIndexes` to `[]` when absent;
   - **never** rescue a missing/non-boolean `supported` — that flag is the
     grounding guarantee; without it the output goes to retry, not through.
2. **One retry** when the first attempt ends in `invalid_generation` (parse
   null) or `generation_failed` (exception) — never for `not_configured`:
   - condensed, harsher instruction prompt (mediator style);
   - reduced maxTokens; retry timeout no longer than the first attempt's;
   - `jsonSchema.name: "kaxi_grounded_answer_retry"` (same schema object).
3. **Telemetry**: `search_meta` gains `answerAttempts` (1|2) and
   `answerRetryReason` (`"invalid_generation"|"generation_failed"|null`), so
   the retry's effect is aggregable next to the existing
   `answerGenerationStatus`/`answerBackend`/`answerModel` keys.

## B. LLM-written clarifications (`/api/typebot-rag` clarify branch)

- Routing stays exactly as-is (deterministic clarify decisions unchanged).
- When the clarify branch would ship the static template — mediation status
  `deterministic`/`fallback`, or an LLM mediation that returned an empty
  clarification — call the LLM once to WRITE the clarifying question:
  - inputs: original question, locale, session profile (already in scope at
    `typebot-rag/route.ts:394-455` as `question`, `locale`, `profile`);
  - schema `{ clarificationQuestion, nextStep }`, maxTokens ≈ 200, short
    timeout (below the mediation timeout);
  - any failure or `not_configured` → ship the existing template unchanged.
- `search_meta` gains `clarificationSource: "llm" | "template"` plus
  backend/model/latency keys mirroring the mediation naming.
- No new behavior for high-risk deterministic ROUTING — those turns are
  `retrieve`, not `clarify`, and are out of scope.

## C. Agent/consult fallback telemetry (`/api/ai/agent`, `/api/ai/consult`)

- At the moment `/api/ai/agent` enters `runFallbackAgent()` after an LLM
  error, record `recordOpsEvent({ source: "ai-agent", eventType:
  "agent.llm_fallback", severity: "warning", payload: { failureReason,
  backend?, feature: "action" } })`. Best-effort — a telemetry failure must
  never fail the user turn (mirror the notification pattern).
- Same event (payload `feature: "consult"`, eventType
  `"consult.llm_fallback"`) where consult swaps in
  `buildOfficialSummaryExpertResult()` after an LLM failure.
- Retro-diagnosis of the operator-observed fallback is closed as
  NOT-RECONSTRUCTIBLE (log retention); this telemetry is the fix, making
  frequency and reasons queryable from `ops_events` afterward.

## Out of scope

- LLM generation on no-context turns (separate design; hallucination guardrails needed).
- Any change to deterministic ROUTING conditions (high-risk patterns, explicit visa codes).
- More than one retry per turn; retry for `not_configured`.
- Prompt-content tuning beyond the condensed retry instruction.

## Testing

1. `scripts/test-rag-direct-fallback.ts` (extend, `test:rag-fallback`):
   grounded answer — first attempt invalid → retry succeeds (`answerAttempts:
   2`, answered); retry also fails → extractive fallback with
   `answerRetryReason` recorded; `not_configured` → no retry.
2. Same file: clarify branch — deterministic mediation + LLM available →
   `clarificationSource: "llm"` and LLM copy shipped; LLM fails →
   `clarificationSource: "template"`, template copy byte-identical to today.
3. Agent/consult fallback: assert the ops event is recorded with the right
   eventType/payload, and that event-recording failure does not break the
   turn (mock `recordOpsEvent` throwing).
4. Gates: `ci:types && lint && ci:domain && ci:ops` — ci:domain is mandatory
   (the pastel PR's tripwire lesson).

## Rollout note

All three changes are additive with template/extractive fallbacks preserved;
LLM-unavailable behavior is byte-identical to today except for new metadata
keys. No schema migration (search_meta and ops_events payload are JSONB).
