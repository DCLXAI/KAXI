# Session Profile Memory for the Typebot RAG Direct Path

Date: 2026-07-15
Status: Approved by operator

## Problem

The Typebot RAG direct path already carries short-term conversation memory
(the last 3 completed exchanges feed the question mediator, retrieval, and
the grounded LLM prompt). Facts stated earlier than 3 turns ago are lost:
"저는 베트남 사람이고 D-2를 준비 중" stated in turn 1 no longer influences a
documents question asked in turn 5. There is no structured, session-scoped
profile of the user.

## Goal

Remember four session-scoped facts and apply them to every turn of the same
session:

- `nationality` (normalized to a lowercase ISO 3166-1 alpha-2 code)
- `currentVisa` (normalized visa code, e.g. `D-4`)
- `targetVisa` (normalized visa code, e.g. `D-2`)
- `studyStage` (`language` | `undergraduate` | `graduate`)

Explicitly out of scope: names, contact details, or any other identifying
fields (the encrypted lead pipeline owns those); the n8n rollback path;
cross-session (returning visitor) linkage; budget/region facts.

## Storage

No schema change. The profile lives under the existing
`ChatSession.metadata` JSON column, which already has upsert support in
`src/lib/chat/persistence.ts`, a 90-day retention default, and the delete
workflow.

```json
{
  "profile": {
    "version": "session-profile-v1",
    "nationality": "vn",
    "currentVisa": "D-4",
    "targetVisa": "D-2",
    "studyStage": "language",
    "fields": {
      "nationality": { "turn": 2, "source": "deterministic" }
    }
  }
}
```

Merge policy: the newest extraction wins per field. `fields` records which
turn and which extractor (`deterministic` | `mediation`) last set each value.
Unknown or non-whitelisted keys are dropped on merge, so the profile cannot
accumulate arbitrary data.

## Extraction (hybrid)

Primary: deterministic extraction in a new pure module
`src/lib/chat/session-profile.ts`:

- Visa codes reuse the existing `normalizedVisaCodes` helper. Extension
  context ("연장", "gia hạn", ...) maps a code to `currentVisa`; change/goal
  context ("변경", "으로 바꾸", "chuyển sang", ...) maps the destination code
  to `targetVisa`; a bare code with no context defaults to `targetVisa` only
  when the profile has none.
- Nationality uses a small country-name dictionary covering ko/en/vi/mn
  surface forms (베트남/Vietnam/Việt Nam/Вьетнам-style variants) for the
  nationalities KAXI serves, mapped to ISO codes.
- Study stage uses locale patterns (어학당/학부/대학원/trường tiếng/đại học/
  их сургууль, ...).

Secondary: the existing question-mediator LLM call gains an optional
`profile` object in its structured-output schema (same four fields). No new
API call is added; when the mediator runs its LLM path, its extraction
augments the deterministic result. Deterministic values win ties within the
same turn; mediation fills fields the patterns missed.

## Data flow (per turn, direct path only)

1. `POST /api/typebot-rag` loads the session snapshot (existing call) and
   reads `metadata.profile`.
2. Deterministic extraction runs on the incoming question; the result is
   merged into the profile in memory.
3. The merged profile is passed to `mediateRagQuestion`, which (a) feeds
   profile visa codes into the existing inherited-visa-code logic and (b) may
   return mediation-extracted profile fields, merged after the call.
4. Retrieval receives the profile-augmented visa codes through the existing
   mediation fields; no separate retrieval plumbing.
5. `generateGroundedRagAnswer` renders a `User profile:` block next to the
   existing `Recent conversation:` block via `profilePromptBlock`.
6. The post-answer `after()` persistence upserts the merged profile back into
   `ChatSession.metadata.profile` (piggybacks on the existing session
   upsert).

## Failure handling

Profile load, extraction, or save failures log a warning and the turn
proceeds without a profile — identical to the existing conversation-history
failure pattern. A malformed stored profile is discarded (fails closed to
empty), never thrown.

Latency: zero additional API calls; the only I/O rides existing queries.
No measurable p95 impact expected.

## Testing

1. Unit tests for `session-profile.ts`: extraction across the four locales,
   current-vs-target visa context, merge/override rules, rejection of
   non-whitelisted keys.
2. `scripts/test-rag-direct-fallback.ts` scenario: nationality and target
   visa stated in turn 1 influence a documents question at turn 5 (beyond the
   3-turn window).
3. RAG evaluation seeds: 1-2 profile-persistence cases joining the
   `conversationContextAccuracy` gate.
4. Full `ci:domain` + `ci:ops` green.

## Privacy notes

The profile stores no identifying data by design (whitelist enforcement in
the merge function). It inherits the chat session's retention (90 days) and
deletion flows. `docs/OPERATIONS.md` gets one line documenting the profile
key and its whitelist.
