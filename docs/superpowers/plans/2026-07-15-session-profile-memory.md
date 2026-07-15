# Session Profile Memory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remember four session-scoped facts (nationality, current visa, target visa, study stage) on the Typebot RAG direct path and apply them to mediation, retrieval visa codes, and the grounded LLM prompt.

**Architecture:** A new pure module `src/lib/chat/session-profile.ts` owns extraction, whitelisted merge, and prompt rendering. The `/api/typebot-rag` route loads the profile from `ChatSession.metadata.profile`, merges deterministic extraction each turn, passes it to the question mediator (which also enriches it from its existing LLM call) and to the grounded answer prompt, then persists the merged profile through the existing session upsert. Zero additional API calls; no schema change.

**Tech Stack:** TypeScript (Next.js App Router), Bun test scripts (`scripts/test-*.ts` with plain asserts), Supabase JSON column (`chat_sessions.metadata`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-15-session-profile-memory-design.md`
- Profile whitelist is exactly: `nationality`, `currentVisa`, `targetVisa`, `studyStage`. The merge function MUST drop any other key.
- Visa codes are stored in `normalizeVisaCode` format (`D-4`, `D-10-1` style — uppercase, hyphenated).
- Nationality is a lowercase ISO 3166-1 alpha-2 code (`vn`, `mn`, ...).
- `studyStage` ∈ `language | undergraduate | graduate`.
- No new API calls; no Prisma schema change; n8n rollback path untouched.
- Profile load/extract/save failures must degrade to "no profile" with a `console.warn`, never a thrown error to the user path.
- All commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Test-DB suites need `TEST_DATABASE_URL` (loopback, `*_test` name); run via `bun run <script>`.

---

### Task 1: `session-profile` module + unit suite

**Files:**
- Create: `src/lib/chat/session-profile.ts`
- Create: `scripts/test-session-profile.ts`
- Modify: `package.json` (add `test:session-profile`, append to `ci:domain`)

**Interfaces:**
- Consumes: nothing (pure module; locale is a structural union).
- Produces (later tasks rely on these exact names):
  - `type SessionProfile`, `type SessionProfileSignals`, `type SessionProfileLocale = "ko" | "en" | "vi" | "mn"`
  - `normalizeVisaCode(value: unknown): string` (moved here so the mediator can import it — returns `""` when invalid)
  - `parseSessionProfile(value: unknown): SessionProfile` (fail-closed)
  - `extractProfileSignals(question: string, locale: SessionProfileLocale): SessionProfileSignals`
  - `mergeSessionProfile(prev: SessionProfile, signals: SessionProfileSignals, turn: number, source: "deterministic" | "mediation"): SessionProfile`
  - `profileVisaCodes(profile: SessionProfile): string[]`
  - `profilePromptBlock(profile: SessionProfile): string`
  - `hasProfileFacts(profile: SessionProfile): boolean`

- [ ] **Step 1: Write the failing test**

Create `scripts/test-session-profile.ts`:

```ts
import assert from "node:assert/strict";
import {
  extractProfileSignals,
  hasProfileFacts,
  mergeSessionProfile,
  normalizeVisaCode,
  parseSessionProfile,
  profilePromptBlock,
  profileVisaCodes,
  type SessionProfile,
} from "../src/lib/chat/session-profile";

const EMPTY: SessionProfile = { version: "session-profile-v1" };

// --- normalizeVisaCode (moved from question-mediator) ---
assert.equal(normalizeVisaCode("d4"), "D-4");
assert.equal(normalizeVisaCode("D 10 1"), "D-10-1");
assert.equal(normalizeVisaCode("hello"), "");

// --- deterministic extraction: visa context (ko) ---
const koChange = extractProfileSignals(
  "저는 베트남 사람이고 D-4로 어학당에 다니는데 D-2로 변경을 준비하고 있어요",
  "ko",
);
assert.equal(koChange.nationality, "vn");
assert.equal(koChange.currentVisa, "D-4");
assert.equal(koChange.targetVisa, "D-2");
assert.equal(koChange.studyStage, "language");

const koExtend = extractProfileSignals("D-4 비자 연장 서류가 궁금해요", "ko");
assert.equal(koExtend.currentVisa, "D-4");
assert.equal(koExtend.targetVisa, undefined);

// bare code with no context → targetVisa
const koBare = extractProfileSignals("D-10 요건 알려주세요", "ko");
assert.equal(koBare.targetVisa, "D-10");
assert.equal(koBare.currentVisa, undefined);

// --- extraction: other locales ---
assert.equal(extractProfileSignals("Tôi là người Việt Nam đang học trường tiếng", "vi").nationality, "vn");
assert.equal(extractProfileSignals("Би Монгол хүн, магистрт орохыг хүсэж байна", "mn").nationality, "mn");
assert.equal(extractProfileSignals("Би Монгол хүн, магистрт орохыг хүсэж байна", "mn").studyStage, "graduate");
assert.equal(extractProfileSignals("I am from Vietnam and want to extend my D-4", "en").currentVisa, "D-4");

// --- merge: newest wins, provenance recorded, whitelist enforced ---
let profile = mergeSessionProfile(EMPTY, koChange, 1, "deterministic");
assert.equal(profile.nationality, "vn");
assert.equal(profile.fields?.nationality?.turn, 1);
profile = mergeSessionProfile(profile, { targetVisa: "D-10" }, 3, "mediation");
assert.equal(profile.targetVisa, "D-10");
assert.equal(profile.fields?.targetVisa?.source, "mediation");
assert.equal(profile.currentVisa, "D-4"); // untouched fields survive

const polluted = mergeSessionProfile(
  EMPTY,
  { nationality: "vn", name: "홍길동", phone: "010", targetVisa: "D-2" } as never,
  1,
  "deterministic",
);
assert.equal(JSON.stringify(polluted).includes("홍길동"), false);
assert.equal(JSON.stringify(polluted).includes("phone"), false);

// empty-string / invalid signals never erase existing values
profile = mergeSessionProfile(profile, { currentVisa: "", studyStage: "invalid" as never }, 4, "mediation");
assert.equal(profile.currentVisa, "D-4");
assert.equal(profile.studyStage, "language");

// --- parse: fail-closed on malformed stored values ---
assert.deepEqual(parseSessionProfile(null), EMPTY);
assert.deepEqual(parseSessionProfile("garbage"), EMPTY);
assert.deepEqual(parseSessionProfile({ version: "other", nationality: "vn" }), EMPTY);
const parsed = parseSessionProfile({
  version: "session-profile-v1",
  nationality: "VN",
  currentVisa: "d4",
  contact: "leak@example.com",
});
assert.equal(parsed.nationality, "vn");
assert.equal(parsed.currentVisa, "D-4");
assert.equal(JSON.stringify(parsed).includes("leak"), false);

// --- helpers ---
assert.deepEqual(profileVisaCodes(profile).sort(), ["D-10", "D-4"]);
assert.equal(hasProfileFacts(EMPTY), false);
assert.equal(hasProfileFacts(profile), true);
const block = profilePromptBlock(profile);
assert.equal(block.includes("vn"), true);
assert.equal(block.includes("D-4"), true);
assert.equal(profilePromptBlock(EMPTY), "No stored user profile.");

console.log("PASS session profile: extraction, whitelist merge, fail-closed parse");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run scripts/test-session-profile.ts`
Expected: FAIL — `Cannot find module '../src/lib/chat/session-profile'`

- [ ] **Step 3: Write the implementation**

Create `src/lib/chat/session-profile.ts`:

```ts
export type SessionProfileLocale = "ko" | "en" | "vi" | "mn";
export type SessionProfileStudyStage = "language" | "undergraduate" | "graduate";
export type SessionProfileSource = "deterministic" | "mediation";
export type SessionProfileFieldKey = "nationality" | "currentVisa" | "targetVisa" | "studyStage";

export type SessionProfile = {
  version: "session-profile-v1";
  nationality?: string;
  currentVisa?: string;
  targetVisa?: string;
  studyStage?: SessionProfileStudyStage;
  fields?: Partial<Record<SessionProfileFieldKey, { turn: number; source: SessionProfileSource }>>;
};

export type SessionProfileSignals = Partial<{
  nationality: string;
  currentVisa: string;
  targetVisa: string;
  studyStage: SessionProfileStudyStage;
}>;

const PROFILE_VERSION = "session-profile-v1" as const;
const STUDY_STAGES: SessionProfileStudyStage[] = ["language", "undergraduate", "graduate"];

export function normalizeVisaCode(value: unknown) {
  const match = String(value || "").trim().toUpperCase().match(/^([CDEF])[-\s]?(\d+)(?:[-\s]?(\d+))?$/);
  return match ? `${match[1]}-${match[2]}${match[3] ? `-${match[3]}` : ""}` : "";
}

const VISA_CODE_PATTERN = /\b[cdef][-\s]?\d+(?:[-\s]?\d+)?\b/giu;

// Country surface forms → ISO 3166-1 alpha-2, covering KAXI's serving locales.
const NATIONALITY_PATTERNS: Array<{ code: string; pattern: RegExp }> = [
  { code: "vn", pattern: /베트남|việt\s?nam|vietnam(?:ese)?|вьетнам/iu },
  { code: "mn", pattern: /몽골|mongolia(?:n)?|монгол/iu },
  { code: "uz", pattern: /우즈베키스탄|uzbekistan|узбекистан|o['’]zbekiston/iu },
  { code: "kz", pattern: /카자흐스탄|kazakhstan|казахстан/iu },
  { code: "cn", pattern: /중국|china|chinese|trung\s?quốc|хятад/iu },
  { code: "np", pattern: /네팔|nepal(?:i)?/iu },
  { code: "id", pattern: /인도네시아|indonesia(?:n)?/iu },
  { code: "ph", pattern: /필리핀|philippin(?:es|o)|филиппин/iu },
  { code: "th", pattern: /태국|thailand|thai\b/iu },
  { code: "mm", pattern: /미얀마|myanmar|burma/iu },
  { code: "bd", pattern: /방글라데시|bangladesh(?:i)?/iu },
  { code: "in", pattern: /인도(?!네시아)|(?<!s)india(?:n)?\b/iu },
  { code: "ru", pattern: /러시아|russia(?:n)?|россия|орос/iu },
];

// A nationality statement, not a mere topic mention ("베트남 유학생 통계" should not match).
const NATIONALITY_CONTEXT = /(사람|국적|출신|에서\s?왔|입니다|이에요|người|quốc tịch|хүн|иргэн|citizen|nationality|i\s?am\s?from|i'm\s?from|come\s?from)/iu;

const CURRENT_VISA_CONTEXT = /(연장|갱신|현재|지금|소지|가지고\s?있|다니|체류\s?중|로\s?체류|gia\s?hạn|hiện\s?tại|đang\s?(?:có|học|ở)|сунгах|одоо|байгаа|extend|renew|currently|i\s?have|i'm\s?on|holding)/iu;
const TARGET_VISA_CONTEXT = /(변경|바꾸|전환|목표|준비|취득|신청하려|받으려|chuyển|đổi\s?sang|mục\s?tiêu|chuẩn\s?bị|шилжих|солих|бэлтгэ|change\s?to|switch(?:ing)?\s?to|apply\s?for|planning|preparing|want\s?to\s?get)/iu;

const STUDY_STAGE_PATTERNS: Array<{ stage: SessionProfileStudyStage; pattern: RegExp }> = [
  { stage: "graduate", pattern: /대학원|석사|박사|thạc\s?sĩ|tiến\s?sĩ|cao\s?học|магистр|доктор|graduate\s?school|master(?:'s)?|phd|doctoral/iu },
  { stage: "undergraduate", pattern: /학부|학사|대학교?\s?(입학|진학|지원)|đại\s?học|cử\s?nhân|бакалавр|их\s?сургууль|undergraduate|bachelor/iu },
  { stage: "language", pattern: /어학당|어학원|어학연수|한국어\s?연수|trường\s?tiếng|khóa\s?tiếng|хэлний\s?(бэлтгэл|сургалт)|language\s?(school|course|program)/iu },
];

function questionVisaCodes(question: string) {
  return Array.from(new Set(
    (question.match(VISA_CODE_PATTERN) || []).map(normalizeVisaCode).filter(Boolean),
  ));
}

function contextWindow(question: string, code: string) {
  const compact = question.replace(/\s+/g, " ");
  const index = compact.toUpperCase().replace(/-/g, " ").indexOf(code.replace(/-/g, " "));
  if (index < 0) return compact;
  // Narrow window: with two codes in one sentence ("D-4로 다니는데 D-2로 변경"),
  // a wide window lets the other code's cue leak in and misclassify.
  return compact.slice(Math.max(0, index - 24), index + code.length + 24);
}

export function extractProfileSignals(
  question: string,
  _locale: SessionProfileLocale,
): SessionProfileSignals {
  const text = question.normalize("NFKC");
  const signals: SessionProfileSignals = {};

  const nationality = NATIONALITY_PATTERNS.find(
    (entry) => entry.pattern.test(text) && NATIONALITY_CONTEXT.test(text),
  );
  if (nationality) signals.nationality = nationality.code;

  for (const code of questionVisaCodes(text)) {
    const window = contextWindow(text, code);
    // CURRENT cues are checked first: holding/attending/extending verbs are
    // stronger evidence than change/preparation verbs that may belong to the
    // other code in the same sentence.
    if (CURRENT_VISA_CONTEXT.test(window) && !signals.currentVisa) {
      signals.currentVisa = code;
    } else if (TARGET_VISA_CONTEXT.test(window) && !signals.targetVisa) {
      signals.targetVisa = code;
    } else if (!signals.targetVisa && !signals.currentVisa) {
      signals.targetVisa = code;
    }
  }

  const stage = STUDY_STAGE_PATTERNS.find((entry) => entry.pattern.test(text));
  if (stage) signals.studyStage = stage.stage;

  return signals;
}

function cleanSignal(key: SessionProfileFieldKey, value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  if (key === "nationality") {
    const code = value.trim().toLowerCase();
    return /^[a-z]{2}$/.test(code) ? code : undefined;
  }
  if (key === "currentVisa" || key === "targetVisa") {
    return normalizeVisaCode(value) || undefined;
  }
  return STUDY_STAGES.includes(value as SessionProfileStudyStage) ? value : undefined;
}

const FIELD_KEYS: SessionProfileFieldKey[] = ["nationality", "currentVisa", "targetVisa", "studyStage"];

export function mergeSessionProfile(
  prev: SessionProfile,
  signals: SessionProfileSignals,
  turn: number,
  source: SessionProfileSource,
): SessionProfile {
  const next: SessionProfile = {
    version: PROFILE_VERSION,
    nationality: prev.nationality,
    currentVisa: prev.currentVisa,
    targetVisa: prev.targetVisa,
    studyStage: prev.studyStage,
    fields: { ...(prev.fields || {}) },
  };
  for (const key of FIELD_KEYS) {
    const value = cleanSignal(key, (signals as Record<string, unknown>)[key]);
    if (!value) continue;
    if (key === "studyStage") next.studyStage = value as SessionProfileStudyStage;
    else next[key] = value;
    next.fields = { ...(next.fields || {}), [key]: { turn, source } };
  }
  return next;
}

export function parseSessionProfile(value: unknown): SessionProfile {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { version: PROFILE_VERSION };
  }
  const record = value as Record<string, unknown>;
  if (record.version !== PROFILE_VERSION) return { version: PROFILE_VERSION };
  return mergeSessionProfile(
    { version: PROFILE_VERSION },
    {
      nationality: record.nationality as string,
      currentVisa: record.currentVisa as string,
      targetVisa: record.targetVisa as string,
      studyStage: record.studyStage as SessionProfileStudyStage,
    },
    0,
    "deterministic",
  );
}

export function profileVisaCodes(profile: SessionProfile): string[] {
  return Array.from(new Set([profile.currentVisa, profile.targetVisa].filter(
    (code): code is string => Boolean(code),
  )));
}

export function hasProfileFacts(profile: SessionProfile): boolean {
  return FIELD_KEYS.some((key) => Boolean(profile[key]));
}

export function profilePromptBlock(profile: SessionProfile): string {
  if (!hasProfileFacts(profile)) return "No stored user profile.";
  const parts: string[] = [];
  if (profile.nationality) parts.push(`nationality=${profile.nationality}`);
  if (profile.currentVisa) parts.push(`currentVisa=${profile.currentVisa}`);
  if (profile.targetVisa) parts.push(`targetVisa=${profile.targetVisa}`);
  if (profile.studyStage) parts.push(`studyStage=${profile.studyStage}`);
  return parts.join(", ");
}
```

Note: `parseSessionProfile` deliberately reuses `mergeSessionProfile` so the
whitelist and normalization live in exactly one place. `fields` provenance
from storage is intentionally reset (turn 0) — only current-session turns
matter for provenance.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run scripts/test-session-profile.ts`
Expected: `PASS session profile: extraction, whitelist merge, fail-closed parse`

- [ ] **Step 5: Register the script**

In `package.json`, next to `"test:rag-fallback"` add:

```json
"test:session-profile": "bun run scripts/test-session-profile.ts",
```

and in the `ci:domain` chain append `&& bun run test:session-profile` at the end.

Run: `bun run test:session-profile`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/chat/session-profile.ts scripts/test-session-profile.ts package.json
git commit -m "feat: add session profile extraction and whitelist merge

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Mediator integration (visa inheritance + LLM enrichment)

**Files:**
- Modify: `src/lib/chat/question-mediator.ts`
- Test: extend `scripts/test-session-profile.ts`

**Interfaces:**
- Consumes (Task 1): `normalizeVisaCode`, `profileVisaCodes`, `type SessionProfile`, `type SessionProfileSignals`.
- Produces: `mediateRagQuestion` accepts `profile?: SessionProfile` in its input object; `QuestionMediation` gains `profileSignals?: SessionProfileSignals` (mediation-LLM-extracted facts for the route to merge).

- [ ] **Step 1: Write the failing test**

Append to `scripts/test-session-profile.ts` (before the final `console.log`; keep that log line last):

```ts
const { mediateRagQuestion } = await import("../src/lib/chat/question-mediator");

// Profile visa codes flow into mediation when the question itself has none.
const mediationWithProfile = await mediateRagQuestion(
  {
    question: "제가 변경하려는 비자에 필요한 서류 알려주세요",
    locale: "ko",
    conversationHistory: [],
    profile: {
      version: "session-profile-v1",
      nationality: "vn",
      currentVisa: "D-4",
      targetVisa: "D-2",
    },
  },
  {
    forceLlm: true,
    generate: async () => ({
      text: JSON.stringify({
        action: "retrieve",
        category: "documents",
        searchQuery: "D-2 변경 서류",
        answerFocus: "D-2 변경에 필요한 서류",
        responseMode: "checklist",
        clarificationQuestion: "",
        intents: ["required_documents"],
        visaCodes: [],
        needsHumanReview: false,
        confidence: 0.9,
        profile: { nationality: null, currentVisa: null, targetVisa: "D-2", studyStage: "language" },
      }),
      backend: "kimi",
      model: "test",
      durationMs: 1,
    }),
  },
);
assert.equal(mediationWithProfile.visaCodes.includes("D-2"), true);
assert.equal(mediationWithProfile.visaCodes.includes("D-4"), true);
assert.equal(mediationWithProfile.profileSignals?.targetVisa, "D-2");
assert.equal(mediationWithProfile.profileSignals?.studyStage, "language");

// Explicit codes in the question still win (no profile pollution).
const mediationExplicit = await mediateRagQuestion(
  {
    question: "D-10 요건 알려주세요",
    locale: "ko",
    conversationHistory: [],
    profile: { version: "session-profile-v1", targetVisa: "D-2" },
  },
  { forceLlm: false },
);
assert.equal(mediationExplicit.visaCodes.includes("D-10"), true);
```

Note: the exact shape returned by the injected `generate` must match the
mediator's `MediationGenerator` type — check its definition in
`question-mediator.ts` before running and adapt the stub's envelope
(text/backend/model/durationMs) to it if the fields differ.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:session-profile`
Expected: FAIL — `profile` is not a known property / `profileSignals` undefined.

- [ ] **Step 3: Implement mediator changes**

In `src/lib/chat/question-mediator.ts`:

1. Import from the new module and delete the local duplicate:

```ts
import {
  normalizeVisaCode,
  profileVisaCodes,
  type SessionProfile,
  type SessionProfileSignals,
} from "@/lib/chat/session-profile";
```

Remove the local `function normalizeVisaCode(...)` definition (the imported
one is byte-identical).

2. Extend the mediation result type (`QuestionMediation`):

```ts
  profileSignals?: SessionProfileSignals;
```

3. Extend `OUTPUT_SCHEMA.properties` with a strict-mode-safe nullable object,
and add `"profile"` to the `required` array:

```ts
    profile: {
      type: "object",
      additionalProperties: false,
      properties: {
        nationality: { type: ["string", "null"] },
        currentVisa: { type: ["string", "null"] },
        targetVisa: { type: ["string", "null"] },
        studyStage: { type: ["string", "null"] },
      },
      required: ["nationality", "currentVisa", "targetVisa", "studyStage"],
    },
```

4. In `mediateRagQuestion`, accept and use the profile:

```ts
  input: {
    question: string;
    locale: GuardrailLocale;
    deterministicCategory?: ChatCategory;
    conversationHistory?: QuestionConversationTurn[];
    profile?: SessionProfile;
  },
```

Immediately after the existing `resolvedVisaCodes` line, widen it:

```ts
  const profileCodes = input.profile ? profileVisaCodes(input.profile) : [];
  const visaCodesWithProfile = Array.from(new Set([...resolvedVisaCodes, ...profileCodes]));
```

Replace every subsequent use of `resolvedVisaCodes` in this function with
`visaCodesWithProfile` (deterministic return paths included — search the
function body; do not touch `planDeterministicRagQuestion`).

5. Where the LLM `ModelOutput` is parsed into the returned mediation, map the
new field (adapt to the existing parse helper style):

```ts
  const profileSignals: SessionProfileSignals | undefined = output.profile
    ? {
        nationality: output.profile.nationality ?? undefined,
        currentVisa: output.profile.currentVisa ?? undefined,
        targetVisa: output.profile.targetVisa ?? undefined,
        studyStage: (output.profile.studyStage ?? undefined) as SessionProfileSignals["studyStage"],
      }
    : undefined;
```

and include `profileSignals` in the returned object of the LLM path (leave
deterministic/fallback paths without it). Extend the `ModelOutput` type with:

```ts
  profile?: {
    nationality: string | null;
    currentVisa: string | null;
    targetVisa: string | null;
    studyStage: string | null;
  };
```

6. Add one line to the mediation system message (near the conversation
block), so the LLM knows the stored profile and its extraction duty:

```ts
Stored user profile (trusted, session-scoped): ${input.profile ? profilePromptBlock(input.profile) : "none"}
Also extract any newly stated nationality (ISO alpha-2), current visa, target visa, or study stage (language|undergraduate|graduate) into the profile field; use null when not stated.
```

(import `profilePromptBlock` alongside the other imports).

- [ ] **Step 4: Run tests**

Run: `bun run test:session-profile`
Expected: PASS (both Task 1 and Task 2 assertions)

Run: `bun run ci:types && bun run lint`
Expected: clean

- [ ] **Step 5: Commit**

```bash
git add src/lib/chat/question-mediator.ts scripts/test-session-profile.ts
git commit -m "feat: feed session profile into question mediation

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Route wiring — load, merge, prompt, persist

**Files:**
- Modify: `src/lib/chat/history.ts` (expose session metadata in the snapshot)
- Modify: `src/lib/chat/persistence.ts` (optional session metadata passthrough)
- Modify: `src/lib/chat/direct-lexical-fallback.ts` (carry `profile` to the generator)
- Modify: `src/lib/chat/grounded-rag-answer.ts` (prompt block)
- Modify: `src/app/api/typebot-rag/route.ts` (orchestration)
- Test: extend `scripts/test-rag-direct-fallback.ts`

**Interfaces:**
- Consumes (Task 1): `parseSessionProfile`, `extractProfileSignals`, `mergeSessionProfile`, `profilePromptBlock`, `hasProfileFacts`, `type SessionProfile`; (Task 2): `mediation.profileSignals`.
- Produces: `ChatSessionSnapshot.metadata: Record<string, unknown> | null`; `PersistChatExchangeInput.sessionMetadata?: unknown`; `DirectLexicalFallbackInput.profile?: SessionProfile`; `GroundedAnswerRequest.profile?: SessionProfile`.

- [ ] **Step 1: Write the failing test**

In `scripts/test-rag-direct-fallback.ts`, locate the existing block that calls
`runDirectRagFallback` with injected dependencies (`rpc`/`generateAnswer`
style — follow the file's existing pattern) and add a new scenario after it.
The scenario asserts the profile reaches the grounded generator even though
`conversationHistory` is empty (i.e., the fact is older than the 3-turn
window):

```ts
{
  let observedProfileBlock = "";
  const profileResult = await runDirectRagFallback(
    {
      question: "제가 변경하려는 비자에 필요한 서류 알려주세요",
      locale: "ko",
      category: "documents",
      tenantId: "default",
      requestId: "profile-test",
      fallbackReason: "test",
      requireOpenAiEmbedding: false,
      conversationHistory: [],
      profile: {
        version: "session-profile-v1",
        nationality: "vn",
        currentVisa: "D-4",
        targetVisa: "D-2",
      },
    },
    {
      // reuse this file's existing stub rpc/embedding dependencies verbatim
      ...sharedStubDependencies,
      generateAnswer: async (request) => {
        observedProfileBlock = JSON.stringify(request.profile || null);
        return { status: "unavailable", reason: "not_configured" };
      },
    },
  );
  assert.equal(observedProfileBlock.includes("D-2"), true, "profile must reach the grounded generator");
  assert.ok(profileResult); // extractive degradation still answers
}
```

Adapt the input/dependency fields to the file's existing test helpers (the
file already builds stub dependencies for `runDirectRagFallback`; reuse the
same names instead of `sharedStubDependencies` if they differ). The essential
assertions are: (1) `profile` is accepted by `DirectLexicalFallbackInput`,
(2) the generator request receives the same profile object.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:rag-fallback`
Expected: FAIL — `profile` not assignable / `request.profile` undefined.

- [ ] **Step 3: Implement the pipeline plumbing**

1. `src/lib/chat/direct-lexical-fallback.ts` — in `DirectLexicalFallbackInput`
(where `conversationHistory?` is declared, ~line 99) add:

```ts
  profile?: SessionProfile;
```

with `import type { SessionProfile } from "@/lib/chat/session-profile";`, and
where the grounded generator request is built (~line 1388, next to
`conversationHistory: input.conversationHistory,`) add:

```ts
    profile: input.profile,
```

2. `src/lib/chat/grounded-rag-answer.ts` — add to the request type (next to
`conversationHistory?`):

```ts
  profile?: SessionProfile;
```

import `profilePromptBlock` and `type SessionProfile` from
`@/lib/chat/session-profile`, add a rule after rule 12 of the system prompt:

```
13. The stored user profile is trusted session context extracted by the application. Use it to resolve which visa, nationality, or study stage the question refers to, but never cite it as a source.
```

and next to the `Recent conversation:` line add:

```
Stored user profile: ${request.profile ? profilePromptBlock(request.profile) : "No stored user profile."}
```

3. `src/lib/chat/history.ts` — in `loadChatSessionSnapshot`, change the
session select from `"id"` to `"id,metadata"`, add
`metadata: Record<string, unknown> | null;` to `ChatSessionSnapshot`, and
include it in the returned snapshot object:

```ts
  metadata: (session.data as { metadata?: Record<string, unknown> | null }).metadata ?? null,
```

4. `src/lib/chat/persistence.ts` — add `sessionMetadata?: unknown;` to
`PersistChatExchangeInput` and pass it through in `persistChatExchange`:

```ts
  await ensureChatSession({
    sessionKey: input.sessionKey,
    tenantId: input.tenantId,
    locale: input.locale,
    source: input.source,
    typebotResultId: input.typebotResultId,
    metadata: input.sessionMetadata,
  });
```

(`ensureChatSession` already treats `undefined` as "leave metadata alone".)

5. `src/app/api/typebot-rag/route.ts` — orchestrate. Around the existing
snapshot/history block (~line 374):

```ts
    let conversationHistory: Array<{ question: string; answer: string }> = [];
    let sessionMetadata: Record<string, unknown> = {};
    let profile = parseSessionProfile(null);
    try {
      const snapshot = await loadChatSessionSnapshot(sessionId, {
        source,
        messageLimit: 4,
        attachmentLimit: 1,
      });
      sessionMetadata = (snapshot?.metadata && typeof snapshot.metadata === "object")
        ? { ...snapshot.metadata }
        : {};
      profile = parseSessionProfile(sessionMetadata.profile);
      conversationHistory = (snapshot?.messages || [])
        .filter((message) => message.status === "completed" && message.question && message.answer)
        .slice(-3)
        .map((message) => ({ question: message.question, answer: message.answer }));
    } catch (historyError) {
      console.warn("[POST /api/typebot-rag] conversation history unavailable", historyError);
    }
    const turnIndex = conversationHistory.length + 1;
    try {
      profile = mergeSessionProfile(profile, extractProfileSignals(question, locale), turnIndex, "deterministic");
    } catch (profileError) {
      console.warn("[POST /api/typebot-rag] profile extraction failed", profileError);
    }
    const mediation = await mediateRagQuestion({
      question,
      locale,
      deterministicCategory,
      conversationHistory,
      profile,
    });
    if (mediation.profileSignals) {
      profile = mergeSessionProfile(profile, mediation.profileSignals, turnIndex, "mediation");
    }
    const sessionMetadataWithProfile = hasProfileFacts(profile)
      ? { ...sessionMetadata, profile }
      : undefined;
```

Imports:

```ts
import {
  extractProfileSignals,
  hasProfileFacts,
  mergeSessionProfile,
  parseSessionProfile,
} from "@/lib/chat/session-profile";
```

Then: pass `profile,` into the `runDirectRagFallback({ ... mediation, conversationHistory, ... })`
call (~line 514), and pass `sessionMetadata: sessionMetadataWithProfile,`
into **both** `persistChatExchange` call sites (~lines 417 and 664).

Known v1 limitation (accepted in the spec): the whole `metadata` JSON is
last-write-wins; concurrent turns in one session may drop one turn's profile
update.

- [ ] **Step 4: Run tests**

Run: `bun run test:rag-fallback && bun run test:session-profile && bun run ci:types && bun run lint`
Expected: all PASS/clean

- [ ] **Step 5: Commit**

```bash
git add src/lib/chat/history.ts src/lib/chat/persistence.ts src/lib/chat/direct-lexical-fallback.ts src/lib/chat/grounded-rag-answer.ts src/app/api/typebot-rag/route.ts scripts/test-rag-direct-fallback.ts
git commit -m "feat: apply session profile across the typebot RAG turn

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Evaluation case, docs, full gates

**Files:**
- Modify: `scripts/seed-rag-evaluation-cases.ts`
- Modify: `docs/OPERATIONS.md`
- Test: full `ci:domain` + `ci:ops`

**Interfaces:**
- Consumes: the deployed behavior of Tasks 1-3 (the eval runner replays `metadata.conversationHistory` turns as real `/api/typebot-rag` calls into one sessionId, so the profile persists turn by turn).

- [ ] **Step 1: Add the profile-persistence eval case**

In `scripts/seed-rag-evaluation-cases.ts`, append to `behaviorRegressionRows`
(after the `ko-vietnam-d4-nationality-documents` group), following the exact
row shape of `ko-d4-context-followup-documents`:

```ts
  {
    id: "ko-vn-profile-beyond-window-documents",
    locale: "ko",
    category: "documents",
    question: "제가 변경하려는 비자에 필요한 서류 알려주세요",
    expected_doc_ids: ["visa-documents"],
    expected_risk_level: null,
    expected_handoff: false,
    active: true,
    metadata: {
      source: "session-profile-regression-2026-07-15",
      conversationHistory: [
        { question: "저는 베트남 사람이고 D-4로 어학당에 다니는데 D-2로 변경을 준비하고 있어요.", answer: "" },
        { question: "한국 유학 준비 비용은 어느 정도인가요?", answer: "" },
        { question: "서울에 있는 어학당을 추천해 주세요.", answer: "" },
        { question: "TOPIK은 몇 급이 필요한가요?", answer: "" },
      ],
      expectedNoContext: false,
      expectedStrictCategory: true,
      expectedLocaleHeadings: true,
      expectedVisaCodes: ["d2"],
      expectedOpenAiVector: true,
    },
  },
```

The profile fact lives only in turn 1; turns 2-4 push it out of the 3-turn
conversation window, so this case passes only if the session profile carries
`targetVisa=D-2` into the final question. Check how the runner normalizes
`expectedVisaCodes` (the existing case uses `["d4"]` for a `D-4` mediation
code) and keep the same convention.

- [ ] **Step 2: Document the profile key**

In `docs/OPERATIONS.md`, in the chat persistence/session section (near the
`CHAT_SESSION_SIGNING_SECRET` bullet), add:

```markdown
- `chat_sessions.metadata.profile` (`session-profile-v1`): session-scoped user profile limited by whitelist to nationality (ISO alpha-2), current visa, target visa, and study stage. Extracted deterministically each turn and enriched by the question-mediation LLM. Never stores names or contact details; inherits chat-session retention and deletion.
```

- [ ] **Step 3: Run the full gates**

Run: `bun run ci:domain && bun run ci:ops`
Expected: exit 0, all suites PASS (CI-equivalent env: also verify once with
`OPENAI_EMBEDDING_API_KEY="" OPENAI_API_KEY="" NEXT_PUBLIC_SUPABASE_URL="" SUPABASE_SERVICE_ROLE_KEY=""`
prefixed, matching the hermetic-CI convention used by `test-agent-guards`).

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-rag-evaluation-cases.ts docs/OPERATIONS.md
git commit -m "test: add session profile persistence eval case and docs

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
