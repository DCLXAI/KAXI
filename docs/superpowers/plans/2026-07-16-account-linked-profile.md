# Account-Linked Session Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist a logged-in student's session profile (currentVisa/targetVisa/studyStage) to their `StudentProfile` (write-time, fill-only) and seed a fresh session from the account (read-back), so the profile carries across sessions/devices.

**Architecture:** A new pure mapping module (`src/lib/chat/account-profile.ts`) converts between `SessionProfile` and the three nullable StudentProfile columns with fill-only semantics. `/api/typebot-rag` gains a best-effort `getCurrentKaxiUser()` lookup: it seeds the freshly-loaded session profile from the account (read-back) before extraction, and after the answer fills empty StudentProfile columns from the merged session profile (write-time). All account I/O is best-effort — a failure never blocks or fails the chat turn.

**Tech Stack:** TypeScript (Next.js App Router), Prisma (Postgres), Bun test scripts, Supabase auth (`getCurrentKaxiUser`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-16-account-linked-profile-design.md`.
- v1 columns are exactly the three NULLABLE ones: `visaType` (=currentVisa), `targetVisa` (new), `chatStudyStage` (new). **Nationality is excluded in BOTH directions** (its `@default("VN")` makes "unset" indistinguishable from "declared").
- Visa codes in `normalizeVisaCode` form (`D-2`), same as `StudentProfile.visaType` / `detectVisaType`. studyStage ∈ `language|undergraduate|graduate`.
- **Fill-only both directions**: never overwrite a non-null StudentProfile column (write) or a session-profile field that already has a value (read-back).
- All account I/O is best-effort: `getCurrentKaxiUser()` / StudentProfile read+write are each wrapped so any failure logs a `console.warn` and the chat proceeds with no account linkage (mirror `src/app/api/leads/route.ts:104-114`).
- No change to the raw-Supabase `chat_sessions` upsert in `persistence.ts`; the account profile is written via Prisma `db.studentProfile`.
- Additive migration only (two nullable columns) — authored locally, applied through the deploy migration workflow. Never a remote reset.
- Commit trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`. Do not stage `Capsomnia/` or `.superpowers/`.
- Branch: work on `feat/account-linked-profile` (create off `origin/main`).

---

### Task 1: Migration — two nullable StudentProfile columns

**Files:**
- Modify: `prisma/postgres/schema.prisma:137-166` (StudentProfile model)
- Create: `prisma/postgres/migrations/20260716120000_student_profile_chat_fields/migration.sql`
- Modify: `src/lib/ops/schema-parity.ts:3` (bump `REQUIRED_PRODUCTION_MIGRATION`)

**Interfaces:**
- Produces: StudentProfile Prisma model gains `targetVisa String?` and `chatStudyStage String?`.

- [ ] **Step 1: Add the columns to the Prisma schema**

In `prisma/postgres/schema.prisma`, inside `model StudentProfile` (after the `visaType String?` line at :141), add:

```prisma
  targetVisa            String?
  chatStudyStage        String?
```

- [ ] **Step 2: Author the migration SQL**

Create `prisma/postgres/migrations/20260716120000_student_profile_chat_fields/migration.sql` (additive, nullable — matches the `diagnosis_leads.userId` additive pattern). The physical table is `"StudentProfile"` (PascalCase, quoted — the model has no `@@map`; confirmed against `20260701090000_phase1_operational_domain/migration.sql:61` `CREATE TABLE "StudentProfile"`):

```sql
-- AlterTable
ALTER TABLE "StudentProfile" ADD COLUMN     "targetVisa" TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN     "chatStudyStage" TEXT;
```

- [ ] **Step 3: Bump the required migration marker**

In `src/lib/ops/schema-parity.ts:3`, change:

```ts
export const REQUIRED_PRODUCTION_MIGRATION = "20260714100000_localized_knowledge_titles";
```
to:
```ts
export const REQUIRED_PRODUCTION_MIGRATION = "20260716120000_student_profile_chat_fields";
```

(The new columns are NOT added to `REQUIRED_SCHEMA_OBJECTS` — the feature reads them best-effort and they are not canonical runtime objects.)

- [ ] **Step 4: Apply locally + regenerate client, run schema test**

Run (with the Prisma consent flag if the guard blocks a local reset):
```bash
PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="플래그 승인 (권장)" bun run db:migrate:deploy
bunx prisma generate --schema prisma/postgres/schema.prisma
bun run test:schema
```
Expected: migration applies to the local DB, Prisma client regenerates with the new fields, `test:schema` PASS.

- [ ] **Step 5: Commit**

```bash
git add prisma/postgres/schema.prisma prisma/postgres/migrations/20260716120000_student_profile_chat_fields src/lib/ops/schema-parity.ts
git commit -m "feat: add nullable chat-profile columns to StudentProfile

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: `account-profile` mapping module + unit tests

**Files:**
- Create: `src/lib/chat/account-profile.ts`
- Create: `scripts/test-account-profile.ts`
- Modify: `package.json` (add `test:account-profile`, append to `ci:domain`)

**Interfaces:**
- Consumes: `type SessionProfile`, `type SessionProfileSignals`, `normalizeVisaCode` from `@/lib/chat/session-profile`.
- Produces:
  - `type StudentChatProfileFields = { visaType?: string | null; targetVisa?: string | null; chatStudyStage?: string | null }`
  - `sessionProfileToStudentFills(profile: SessionProfile, existing: StudentChatProfileFields): Partial<{ visaType: string; targetVisa: string; chatStudyStage: string }>` — returns ONLY the columns that are (a) present in the session profile and (b) currently null/empty in `existing`. Never includes a key whose `existing` value is non-empty. Nationality is never included.
  - `studentFieldsToSessionSignals(row: StudentChatProfileFields): SessionProfileSignals` — maps account columns to session signals (`visaType`→`currentVisa`, `targetVisa`→`targetVisa`, `chatStudyStage`→`studyStage`), omitting empty ones and normalizing visa codes; never sets `nationality`.

- [ ] **Step 1: Write the failing test**

Create `scripts/test-account-profile.ts`:

```ts
import assert from "node:assert/strict";
import {
  sessionProfileToStudentFills,
  studentFieldsToSessionSignals,
} from "../src/lib/chat/account-profile";
import type { SessionProfile } from "../src/lib/chat/session-profile";

const profile: SessionProfile = {
  version: "session-profile-v1",
  nationality: "vn",
  currentVisa: "D-4",
  targetVisa: "D-2",
  studyStage: "language",
};

// --- write: fill only empty columns; never overwrite non-null; never nationality ---
assert.deepEqual(
  sessionProfileToStudentFills(profile, { visaType: null, targetVisa: null, chatStudyStage: null }),
  { visaType: "D-4", targetVisa: "D-2", chatStudyStage: "language" },
);
assert.deepEqual(
  sessionProfileToStudentFills(profile, { visaType: "E-7", targetVisa: null, chatStudyStage: null }),
  { targetVisa: "D-2", chatStudyStage: "language" }, // visaType NOT overwritten
);
assert.deepEqual(
  sessionProfileToStudentFills({ version: "session-profile-v1", nationality: "vn" }, { visaType: null, targetVisa: null, chatStudyStage: null }),
  {}, // nationality-only profile fills nothing (nationality excluded)
);
assert.deepEqual(
  sessionProfileToStudentFills(profile, { visaType: "D-4", targetVisa: "D-2", chatStudyStage: "language" }),
  {}, // all set → nothing to fill
);

// --- read-back: account columns → session signals; empty omitted; no nationality ---
assert.deepEqual(
  studentFieldsToSessionSignals({ visaType: "D-4", targetVisa: "D-2", chatStudyStage: "language" }),
  { currentVisa: "D-4", targetVisa: "D-2", studyStage: "language" },
);
assert.deepEqual(
  studentFieldsToSessionSignals({ visaType: "d4", targetVisa: null, chatStudyStage: null }),
  { currentVisa: "D-4" }, // normalized, empties omitted
);
assert.deepEqual(studentFieldsToSessionSignals({}), {});

console.log("PASS account profile: fill-only write + read-back mapping");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run scripts/test-account-profile.ts`
Expected: FAIL — `Cannot find module '../src/lib/chat/account-profile'`

- [ ] **Step 3: Write the implementation**

Create `src/lib/chat/account-profile.ts`:

```ts
import { normalizeVisaCode, type SessionProfile, type SessionProfileSignals } from "@/lib/chat/session-profile";

export type StudentChatProfileFields = {
  visaType?: string | null;
  targetVisa?: string | null;
  chatStudyStage?: string | null;
};

const STUDY_STAGES = new Set(["language", "undergraduate", "graduate"]);

function cleanCode(value: unknown): string | undefined {
  return typeof value === "string" ? normalizeVisaCode(value) || undefined : undefined;
}

function cleanStage(value: unknown): string | undefined {
  return typeof value === "string" && STUDY_STAGES.has(value) ? value : undefined;
}

function isEmpty(value: string | null | undefined): boolean {
  return !value || !value.trim();
}

// Session profile -> the StudentProfile columns to fill. Only returns columns
// that the session has AND the account currently leaves empty (fill-only).
// Nationality is never included (see spec: default-"VN" ambiguity).
export function sessionProfileToStudentFills(
  profile: SessionProfile,
  existing: StudentChatProfileFields,
): Partial<{ visaType: string; targetVisa: string; chatStudyStage: string }> {
  const fills: Partial<{ visaType: string; targetVisa: string; chatStudyStage: string }> = {};
  const visaType = cleanCode(profile.currentVisa);
  if (visaType && isEmpty(existing.visaType)) fills.visaType = visaType;
  const targetVisa = cleanCode(profile.targetVisa);
  if (targetVisa && isEmpty(existing.targetVisa)) fills.targetVisa = targetVisa;
  const chatStudyStage = cleanStage(profile.studyStage);
  if (chatStudyStage && isEmpty(existing.chatStudyStage)) fills.chatStudyStage = chatStudyStage;
  return fills;
}

// StudentProfile columns -> session signals for read-back seeding. Empty
// columns are omitted; nationality is never produced.
export function studentFieldsToSessionSignals(row: StudentChatProfileFields): SessionProfileSignals {
  const signals: SessionProfileSignals = {};
  const currentVisa = cleanCode(row.visaType);
  if (currentVisa) signals.currentVisa = currentVisa;
  const targetVisa = cleanCode(row.targetVisa);
  if (targetVisa) signals.targetVisa = targetVisa;
  const studyStage = cleanStage(row.chatStudyStage);
  if (studyStage) signals.studyStage = studyStage as SessionProfileSignals["studyStage"];
  return signals;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run scripts/test-account-profile.ts`
Expected: `PASS account profile: fill-only write + read-back mapping`

- [ ] **Step 5: Register the script**

In `package.json`, next to `"test:session-profile"` add:
```json
"test:account-profile": "bun run scripts/test-account-profile.ts",
```
and append `&& bun run test:account-profile` to the end of the `ci:domain` chain.

Run: `bun run test:account-profile && bun run ci:types && bun run lint`
Expected: PASS / clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/chat/account-profile.ts scripts/test-account-profile.ts package.json
git commit -m "feat: add account/session profile mapping with fill-only policy

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Route wiring — best-effort read-back seed + write-time link

**Files:**
- Create: `src/lib/chat/account-profile-repository.ts`
- Modify: `src/app/api/typebot-rag/route.ts`
- Test: extend `scripts/test-account-profile.ts`

**Interfaces:**
- Consumes (Task 2): `sessionProfileToStudentFills`, `studentFieldsToSessionSignals`, `type StudentChatProfileFields`; (session-profile): `fillSessionProfile`, `parseSessionProfile`, `type SessionProfile`.
- Produces:
  - `loadStudentChatProfile(userId: string): Promise<StudentChatProfileFields | null>` — reads the three columns for the student; returns null on absence.
  - `fillStudentChatProfile(userId: string, fills: Partial<{ visaType: string; targetVisa: string; chatStudyStage: string }>): Promise<void>` — no-op when `fills` is empty; otherwise updates only those columns.
  - `resolveLoggedInStudentId(): Promise<string | null>` — best-effort `getCurrentKaxiUser()`, returns the user id only when the user is a STUDENT with a StudentProfile; swallows and warns on any failure.

- [ ] **Step 1: Write the failing test (repository shape + best-effort contract)**

Append to `scripts/test-account-profile.ts` before the final `console.log`:

```ts
// The repository/link helpers must exist with the exact signatures the route relies on.
const repo = await import("../src/lib/chat/account-profile-repository");
assert.equal(typeof repo.loadStudentChatProfile, "function");
assert.equal(typeof repo.fillStudentChatProfile, "function");
assert.equal(typeof repo.resolveLoggedInStudentId, "function");
// fillStudentChatProfile must be a no-op for empty fills (no DB call, resolves).
await repo.fillStudentChatProfile("nonexistent-user", {});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:account-profile`
Expected: FAIL — `Cannot find module '../src/lib/chat/account-profile-repository'`

- [ ] **Step 3: Implement the repository**

Create `src/lib/chat/account-profile-repository.ts`:

```ts
import { db } from "@/lib/db";
import { getCurrentKaxiUser } from "@/lib/supabase/auth";
import type { StudentChatProfileFields } from "@/lib/chat/account-profile";

// Best-effort: only returns a student id when a logged-in STUDENT with a
// StudentProfile is resolved. Any failure degrades to null (chat proceeds
// anonymously). Mirrors the write-time best-effort pattern in /api/leads.
export async function resolveLoggedInStudentId(): Promise<string | null> {
  try {
    const user = await getCurrentKaxiUser();
    if (!user || user.role !== "STUDENT") return null;
    const profile = await db.studentProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    return profile ? user.id : null;
  } catch (error) {
    console.warn("[account-profile] logged-in student lookup failed", error);
    return null;
  }
}

export async function loadStudentChatProfile(userId: string): Promise<StudentChatProfileFields | null> {
  try {
    const row = await db.studentProfile.findUnique({
      where: { userId },
      select: { visaType: true, targetVisa: true, chatStudyStage: true },
    });
    return row ?? null;
  } catch (error) {
    console.warn("[account-profile] StudentProfile read failed", error);
    return null;
  }
}

export async function fillStudentChatProfile(
  userId: string,
  fills: Partial<{ visaType: string; targetVisa: string; chatStudyStage: string }>,
): Promise<void> {
  if (Object.keys(fills).length === 0) return;
  try {
    await db.studentProfile.update({ where: { userId }, data: fills });
  } catch (error) {
    console.warn("[account-profile] StudentProfile fill failed", error);
  }
}
```

Note: `User.role` is the `UserRole` enum (`STUDENT | PARTNER_AGENT | PLATFORM_ADMIN`, `schema.prisma:110`), so `user.role !== "STUDENT"` is the exact check. The subsequent `findUnique` on `studentProfile` also gates on the profile actually existing, so a STUDENT user without a profile row returns null (chat proceeds anonymously).

- [ ] **Step 4: Run the repository-shape test**

Run: `bun run test:account-profile`
Expected: PASS (empty-fills no-op resolves without a DB call).

- [ ] **Step 5: Wire the route (read-back seed + write-time link)**

In `src/app/api/typebot-rag/route.ts`, in the profile block (around the snapshot load at :383-419), after `profile = parseSessionProfile(sessionMetadata.profile)` and before the deterministic extraction merge, add the best-effort read-back seed; and after the mediation merge, add the write-time link. Concretely:

Imports (add):
```ts
import { sessionProfileToStudentFills, studentFieldsToSessionSignals } from "@/lib/chat/account-profile";
import { fillStudentChatProfile, loadStudentChatProfile, resolveLoggedInStudentId } from "@/lib/chat/account-profile-repository";
```

Read-back (inside the existing try block, after the `profile = parseSessionProfile(...)` line, before the deterministic `mergeSessionProfile` at :405). Resolve the student id once and reuse it. Use `fillSessionProfile` (NOT `mergeSessionProfile`) so the account only seeds fields the session profile lacks — a session-stated value (from this or a prior turn's storage) must always win over the account:
```ts
    const studentId = await resolveLoggedInStudentId();
    if (studentId) {
      const accountRow = await loadStudentChatProfile(studentId);
      if (accountRow) {
        // Read-back is fill-only: account values seed the session only where the
        // session profile has nothing yet; session-stated values keep priority.
        profile = fillSessionProfile(profile, studentFieldsToSessionSignals(accountRow), turnIndex, "deterministic");
      }
    }
```
Add `fillSessionProfile` to the `@/lib/chat/session-profile` import in this route (it may already be imported for the mediation step — reuse it).
Because `turnIndex` is computed after this block today, MOVE the `const turnIndex = conversationHistory.length + 1;` line to just before this read-back seed so it is defined here (verify it is still defined before its later use in the deterministic and mediation merges — there must be exactly one `turnIndex` declaration).

Write-time link (after the mediation-merge `fillSessionProfile(...)` at :419, i.e. once `profile` is fully merged for the turn):
```ts
    if (studentId) {
      const accountRow = await loadStudentChatProfile(studentId);
      if (accountRow) {
        await fillStudentChatProfile(studentId, sessionProfileToStudentFills(profile, accountRow));
      }
    }
```
Keep the entire student-linkage inside the existing best-effort structure — none of these calls may throw out to the handler (the repository helpers already swallow their own errors; the `resolveLoggedInStudentId` call is inside the same try that already catches profile errors, or wrap it so a failure only warns).

- [ ] **Step 6: Verify + gates**

Run: `bun run test:account-profile && bun run test:session-profile && bun run test:rag-fallback && bun run ci:types && bun run lint`
Expected: all PASS/clean. (The route itself is not hermetically unit-tested — same limitation as the direct path; the mapping/fill-only logic and repository shape are covered by Task 2/3 unit tests.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/chat/account-profile-repository.ts src/app/api/typebot-rag/route.ts scripts/test-account-profile.ts
git commit -m "feat: link session profile to logged-in student account

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Docs + full gates

**Files:**
- Modify: `docs/OPERATIONS.md`
- Test: full `ci:domain` + `ci:ops`

- [ ] **Step 1: Document the columns**

In `docs/OPERATIONS.md`, near the `chat_sessions.metadata.profile` bullet added by the session-profile feature, add:

```markdown
- `StudentProfile.targetVisa` / `StudentProfile.chatStudyStage`: account-linked mirror of the session profile's target visa and study stage, filled fill-only from a logged-in student's chat (`visaType` mirrors currentVisa). Nationality is intentionally not chat-linked (its non-null default is ambiguous). Categorical codes, plaintext, cascade-deleted with the User.
```

- [ ] **Step 2: Run the full gates**

Run (CI-equivalent hermetic env too, per repo convention):
```bash
PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="플래그 승인 (권장)" bun run ci:domain && bun run ci:ops
```
Expected: exit 0, all suites PASS. Also run once with blanked OpenAI/Supabase env (`OPENAI_EMBEDDING_API_KEY="" OPENAI_API_KEY="" NEXT_PUBLIC_SUPABASE_URL="" SUPABASE_SERVICE_ROLE_KEY=""`) to match GitHub CI.

- [ ] **Step 3: Commit**

```bash
git add docs/OPERATIONS.md
git commit -m "docs: document account-linked StudentProfile chat columns

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
