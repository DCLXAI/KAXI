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

// The repository/link helpers must exist with the exact signatures the route relies on.
const repo = await import("../src/lib/chat/account-profile-repository");
assert.equal(typeof repo.loadStudentChatProfile, "function");
assert.equal(typeof repo.fillStudentChatProfile, "function");
assert.equal(typeof repo.resolveLoggedInStudentId, "function");
// fillStudentChatProfile must be a no-op for empty fills (no DB call, resolves).
await repo.fillStudentChatProfile("nonexistent-user", {});

console.log("PASS account profile: fill-only write + read-back mapping");
