import assert from "node:assert/strict";
import {
  accountEligibleSignals,
  sessionProfileToStudentFills,
  studentFieldsToSessionSignals,
} from "../src/lib/chat/account-profile";
import {
  fillSessionProfile,
  fillSessionProfileOverAccount,
  mergeSessionProfile,
  type SessionProfile,
} from "../src/lib/chat/session-profile";

const EMPTY: SessionProfile = { version: "session-profile-v1" };

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
const nationalityOnlyProfile: SessionProfile = { version: "session-profile-v1", nationality: "vn" };
assert.deepEqual(
  sessionProfileToStudentFills(nationalityOnlyProfile, { visaType: null, targetVisa: null, chatStudyStage: null }),
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

// --- FIX A: account-seeded fields can be overwritten by a this-turn value;
// genuine session-stated values (any prior turn) never can ---

// Account seed "E-7" + mediation resolving "D-4" THIS turn → mediation wins.
const accountSeededE7 = fillSessionProfile(EMPTY, { currentVisa: "E-7" }, 1, "account");
assert.equal(accountSeededE7.fields?.currentVisa?.source, "account");
const mediationOverwritesSeed = fillSessionProfileOverAccount(accountSeededE7, { currentVisa: "D-4" }, 1, "mediation");
assert.equal(mediationOverwritesSeed.currentVisa, "D-4");
assert.equal(mediationOverwritesSeed.fields?.currentVisa?.source, "mediation");

// A session-stated value from a PRIOR turn (deterministic, turn 1) is never
// overwritten by a mediation fill at a later turn (existing fill-only
// guarantee preserved even with the account-aware fill variant).
const statedPriorTurn = mergeSessionProfile(EMPTY, { currentVisa: "D-4" }, 1, "deterministic");
const notOverwritten = fillSessionProfileOverAccount(statedPriorTurn, { currentVisa: "E-7" }, 2, "mediation");
assert.equal(notOverwritten.currentVisa, "D-4");
assert.equal(notOverwritten.fields?.currentVisa?.source, "deterministic");

// --- FIX B: the account may only receive this-turn, deterministic facts ---

// A fact established on a PRIOR turn (turn 1), evaluated at turn 2, must
// never reach the account: a different visitor may have set it while sharing
// the browser's chat-session cookie.
const priorTurnFact: SessionProfile = {
  version: "session-profile-v1",
  currentVisa: "D-4",
  fields: { currentVisa: { turn: 1, source: "deterministic" } },
};
assert.deepEqual(accountEligibleSignals(priorTurnFact, 2), {}, "a prior visitor's fact must never reach the account");

// A THIS-turn fact whose source is "mediation" (an LLM guess) must never
// reach the account — fill-only would make a wrong guess permanent.
const mediationThisTurn: SessionProfile = {
  version: "session-profile-v1",
  currentVisa: "D-4",
  fields: { currentVisa: { turn: 2, source: "mediation" } },
};
assert.deepEqual(accountEligibleSignals(mediationThisTurn, 2), {}, "an LLM-mediated guess must never reach the account");

// Account-seeded fields (source "account", from FIX A's read-back) are never
// eligible either — they were never actually stated by this student.
const accountSeededFact: SessionProfile = {
  version: "session-profile-v1",
  currentVisa: "E-7",
  fields: { currentVisa: { turn: 2, source: "account" } },
};
assert.deepEqual(accountEligibleSignals(accountSeededFact, 2), {}, "an account read-back seed must never round-trip back to the account");

// The main path still works: a THIS-turn, deterministic fact IS eligible and
// flows through to a fill.
const deterministicThisTurn: SessionProfile = {
  version: "session-profile-v1",
  currentVisa: "D-4",
  fields: { currentVisa: { turn: 2, source: "deterministic" } },
};
assert.deepEqual(accountEligibleSignals(deterministicThisTurn, 2), { currentVisa: "D-4" });
assert.deepEqual(
  sessionProfileToStudentFills(
    accountEligibleSignals(deterministicThisTurn, 2),
    { visaType: null, targetVisa: null, chatStudyStage: null },
  ),
  { visaType: "D-4" },
);

console.log("PASS account profile: fill-only write + read-back mapping + account-eligibility gating");

// --- FIX D: the empty-fills guard must be falsifiable via an injectable spy ---
const repo = await import("../src/lib/chat/account-profile-repository");

{
  const calls: unknown[] = [];
  await repo.fillStudentChatProfile(
    "nonexistent-user",
    {},
    { update: async (args) => { calls.push(args); } },
  );
  assert.equal(calls.length, 0, "an EMPTY fills object must perform ZERO update calls");
}
{
  const calls: unknown[] = [];
  await repo.fillStudentChatProfile(
    "nonexistent-user",
    { visaType: "D-4" },
    { update: async (args) => { calls.push(args); } },
  );
  assert.equal(calls.length, 1, "a NON-EMPTY fills object must perform exactly one update call");
}

console.log("PASS account profile: empty-fills guard is observable via injected client spy");
