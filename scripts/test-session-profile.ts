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
      inputChars: 0,
      outputChars: 0,
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

console.log("PASS session profile: extraction, whitelist merge, fail-closed parse");
