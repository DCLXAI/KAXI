# Account-Linked Session Profile

Date: 2026-07-16
Status: Draft for operator review
Depends on: the merged session-profile-memory feature (`ChatSession.metadata.profile`).

## Problem

The session profile (nationality / currentVisa / targetVisa / studyStage) lives under the anonymous `ChatSession.metadata` keyed by the HMAC chat-session cookie. It survives only within the cookie lifetime on one browser. A logged-in student who returns on a new device, after clearing cookies, or after the cookie expires loses the profile. The chat path does not currently know whether the visitor is logged in at all (no `getCurrentKaxiUser` call anywhere in `/api/typebot-rag`).

## Goal

For a **logged-in student**, persist the session profile to their account so it carries across sessions and devices:
- **Write-time link**: when a turn is served for a logged-in student, map the merged session profile into their `StudentProfile` (best-effort, never blocking the chat).
- **Read-back seed**: at the start of a turn for a logged-in student whose session has no stored profile yet, seed the session profile from their `StudentProfile` so their prior facts are in play immediately on the new session/device.

Out of scope (operator decisions):
- Retroactive claim of *past anonymous* sessions on login (write-time only, matching the `DiagnosisLead.userId` precedent).
- Cross-concurrent-device merge/turn-reconciliation (the account is a per-field fill store, not a turn ledger).
- Anonymous long-lived visitor identifiers; extending the cookie max-age.

## Storage — normalize into StudentProfile (operator-chosen)

`StudentProfile` (1:1 with `User`, `onDelete: Cascade`) already holds `nationality String @default("VN")` and `visaType String?`. Add two nullable columns via a **non-destructive additive migration** (local-authored, deployed through the normal migration workflow — never a remote reset):

- `targetVisa String?` — normalized visa code (e.g. `D-2`), same format as the session profile.
- `chatStudyStage String?` — `language | undergraduate | graduate`. Named `chatStudyStage` (not `studyStage`) to avoid semantic collision with the existing `programType` / `semesterStatus` columns, which have different meaning and are set elsewhere.

Field mapping (session profile ⇄ StudentProfile). **v1 handles only the three nullable columns**; `nationality` is deferred in BOTH directions:

| session profile | StudentProfile | v1? | note |
| --- | --- | --- | --- |
| `currentVisa` (`D-2`) | `visaType` | ✅ | same format (`detectVisaType` also emits `D-2`) |
| `targetVisa` (`D-2`) | `targetVisa` (new, nullable) | ✅ | same format |
| `studyStage` (`language`) | `chatStudyStage` (new, nullable) | ✅ | same enum |
| `nationality` (`vn`) | `nationality` (default `"VN"`) | ❌ deferred | see below |

**Why nationality is deferred:** `StudentProfile.nationality` is non-null with default `"VN"`. There is no way to distinguish "explicitly declared VN" from "never set (default)". Reading it back would seed every logged-in student's session with `nationality:"vn"` as if they had declared it — a false signal that would then drive retrieval. Writing it would need to overwrite the default, contradicting fill-only. Until an explicit-set marker exists (a future `nationalitySource`/nullable redesign), nationality is neither written to nor read from the account. The three nullable columns have no default, so `null` unambiguously means "unset" and fill-only is well-defined.

## Fill-only merge policy (both directions)

`StudentProfile` is user/signup-authoritative (upserted at `auth.ts:178/226`, `documents/repository.ts:71`, and editable via the student dashboard). Chat-derived data must never clobber a value the student set.

- **Write (session → account)**: only fill a StudentProfile column (`visaType`/`targetVisa`/`chatStudyStage`) that is currently null. Never overwrite a non-null value. Nationality is not written (see deferral above).
- **Read-back (account → session)**: seed a session profile field (`currentVisa`/`targetVisa`/`studyStage`) only when the session profile does not already have it. Session-stated values always win within the session (same fill-only semantics as `fillSessionProfile`). Nationality is not read back.

## Data flow (per turn, direct path, logged-in only)

1. `/api/typebot-rag` does a best-effort `getCurrentKaxiUser()` inside a try/catch that degrades to `null` on any failure (exact pattern from `src/app/api/leads/route.ts:104-114`) — a lookup failure or timeout must never block or fail the chat turn.
2. If a STUDENT user is resolved, load their `StudentProfile`; **read-back seed** the freshly-loaded session profile from it (fill-only).
3. Extraction + mediation merge proceed as today.
4. After the answer, best-effort **write-time link**: map the merged session profile into the student's `StudentProfile` via a fill-only upsert (Prisma `db.studentProfile`, separate from the raw-Supabase `chat_sessions` upsert — no dual-write conflict). Wrapped in try/catch; failure is logged and swallowed.

## Privacy

- The four fields are categorical codes, not identifiers. `StudentProfile.nationality`/`visaType` are already stored plaintext; `targetVisa`/`chatStudyStage` follow that established convention. No new encryption/hash.
- **Deletion**: `StudentProfile` is `onDelete: Cascade` from `User`, so account deletion already removes these columns — no new deletion path required. (Confirm the existing `/api/privacy/delete-request` account-deletion path cascades `User`; if it only marks chat/lead tables, note that account-profile deletion rides `User` deletion, which is the existing mechanism.)
- **Consent**: covered by the signup-time `PRIVACY` consent scope (the profile is derived from the student's own messages and stored on their own account). No new `ConsentScope`.
- The chat-session GET response already excludes `metadata` (from the merged feature); that boundary is unchanged. The account profile is never returned to the browser by the chat path.

## Testing

1. Unit: the mapping helpers — `sessionProfileToStudentFields(profile)` (nullable-column candidate set: visaType/targetVisa/chatStudyStage) and `studentFieldsToSessionSignals(row)`; verify `D-2` passthrough, that nationality is excluded both directions, and that empty/absent fields are omitted.
2. Unit: fill-only write policy — a StudentProfile with `visaType:"D-2"` set is NOT overwritten by a session `currentVisa:"D-4"`; a null `targetVisa` IS filled.
3. Unit: read-back seed — a session with no stored profile, a logged-in student with `visaType:"D-4"`, yields a seeded session `currentVisa:"D-4"`; a session that already has `currentVisa` is NOT overwritten by the account.
4. Migration: additive columns, `bun run test:schema` / schema-parity green.
5. Full `ci:domain` + `ci:ops` green (hermetic).

## Migration & rollout note

The additive migration must be authored locally and applied through the standard deploy migration workflow (per project rule: no remote DB resets / destructive migrations). `src/lib/chat/persistence.ts`'s raw Supabase `chat_sessions` upsert is untouched (this feature writes StudentProfile via Prisma, not the chat_sessions column).
