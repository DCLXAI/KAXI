import assert from "node:assert/strict";
import { mock } from "bun:test";
import {
  extractProfileSignals,
  fillSessionProfile,
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

// --- FIX 1: "A에서 B로 변경" source→current, destination→target ---
const koFromTo1 = extractProfileSignals("D-4에서 D-2로 변경하고 싶어요", "ko");
assert.equal(koFromTo1.currentVisa, "D-4");
assert.equal(koFromTo1.targetVisa, "D-2");

const koFromTo2 = extractProfileSignals("D-4에서 D-10으로 바꾸려고 합니다", "ko");
assert.equal(koFromTo2.currentVisa, "D-4");
assert.equal(koFromTo2.targetVisa, "D-10");

// non-regression: no source marker (에서/부터), 다니 is still the current-visa cue
const koChangeRegression = extractProfileSignals(
  "D-4로 어학당에 다니는데 D-2로 변경을 준비하고 있어요",
  "ko",
);
assert.equal(koChangeRegression.currentVisa, "D-4");
assert.equal(koChangeRegression.targetVisa, "D-2");

const enFromTo = extractProfileSignals("I want to change from D-4 to E-7", "en");
assert.equal(enFromTo.currentVisa, "D-4");
assert.equal(enFromTo.targetVisa, "E-7");

const viFromTo = extractProfileSignals("từ D-4 sang D-2", "vi");
assert.equal(viFromTo.currentVisa, "D-4");
assert.equal(viFromTo.targetVisa, "D-2");

// --- FIX 7: nationality context marker must be near the country term ---
assert.equal(extractProfileSignals("저는 베트남 사람이에요", "ko").nationality, "vn");
assert.equal(
  extractProfileSignals("베트남 유학생이 한국에 많은데 제 국적으로도 가능한가요?", "ko").nationality,
  undefined,
  "a country term far from the context word must not be mistaken for the user's own nationality",
);

// --- FIX 8: an ongoing stage must win over a stage only mentioned as a future plan ---
assert.equal(
  extractProfileSignals("어학연수 중인데 대학원은 나중에 생각중이에요", "ko").studyStage,
  "language",
);

// --- merge: newest wins, provenance recorded, whitelist enforced ---
let profile = mergeSessionProfile(EMPTY, koChange, 1, "deterministic");
assert.equal(profile.nationality, "vn");
assert.equal(profile.fields?.nationality?.turn, 1);
profile = mergeSessionProfile(profile, { targetVisa: "D-10" }, 3, "mediation");
assert.equal(profile.targetVisa, "D-10");
assert.equal(profile.fields?.targetVisa?.source, "mediation");
assert.equal(profile.currentVisa, "D-4"); // untouched fields survive

// --- FIX 4: fillSessionProfile only fills gaps, never overwrites what the
// deterministic pass already set (same turn or a prior one) ---
const filledBase = mergeSessionProfile(EMPTY, { currentVisa: "D-4" }, 1, "deterministic");
const filled = fillSessionProfile(
  filledBase,
  { currentVisa: "D-2", studyStage: "graduate" },
  2,
  "mediation",
);
assert.equal(filled.currentVisa, "D-4", "fillSessionProfile must not overwrite an existing field");
assert.equal(filled.fields?.currentVisa?.source, "deterministic", "provenance of the untouched field is unchanged");
assert.equal(filled.studyStage, "graduate", "fillSessionProfile must still fill an empty field");
assert.equal(filled.fields?.studyStage?.source, "mediation");

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
assert.equal(mediationExplicit.visaCodes.includes("D-2"), false, "a stale profile code must not pollute an explicit-code question");

// Deterministic fast-path also inherits profile visa codes (no LLM involved).
const mediationDeterministic = await mediateRagQuestion(
  {
    question: "어학연수 재정 증빙 서류 알려주세요",
    locale: "ko",
    deterministicCategory: "documents",
    conversationHistory: [],
    profile: { version: "session-profile-v1", currentVisa: "D-4" },
  },
  { forceLlm: false },
);
assert.equal(mediationDeterministic.status, "deterministic");
assert.equal(mediationDeterministic.visaCodes.includes("D-4"), true);

// --- FIX 2: profile codes must not pollute retrieval when the question has
// its own explicit code (reproduced: E-7 question + stale D-4/D-2 profile) ---
const mediationExplicitFastPath = await mediateRagQuestion(
  {
    question: "E-7 취업비자 요건 알려주세요",
    locale: "ko",
    deterministicCategory: "visa",
    conversationHistory: [],
    profile: { version: "session-profile-v1", currentVisa: "D-4", targetVisa: "D-2" },
  },
  { forceLlm: false },
);
assert.deepEqual(mediationExplicitFastPath.visaCodes, ["E-7"]);

// --- FIX 2b: the LLM path must preserve the model's own selection, not
// unconditionally force the full profile set past the whitelist filter ---
const noProfileContextualFollowUp = await mediateRagQuestion(
  {
    question: "그럼 서류는요?",
    locale: "ko",
    conversationHistory: [{ question: "한국 유학 준비 비용은 어느 정도인가요?", answer: "" }],
  },
  {
    forceLlm: true,
    generate: async () => ({
      text: JSON.stringify({
        action: "retrieve",
        category: "documents",
        searchQuery: "한국 유학 준비 서류",
        answerFocus: "유학 준비 서류",
        responseMode: "checklist",
        clarificationQuestion: "",
        intents: ["required_documents"],
        visaCodes: [],
        needsHumanReview: false,
        confidence: 0.9,
      }),
      backend: "kimi",
      model: "test",
      durationMs: 1,
      inputChars: 0,
      outputChars: 0,
    }),
  },
);
assert.deepEqual(
  noProfileContextualFollowUp.visaCodes,
  [],
  "no profile and no explicit/inherited code must never be force-widened",
);

// --- FIX 5: hermetic pin for beyond-window profile persistence (no server,
// no DB) — the eval case's live/staging equivalent is the only other cover ---
const beyondWindowProfile = mergeSessionProfile(
  EMPTY,
  { currentVisa: "D-4", targetVisa: "D-2" },
  1,
  "deterministic",
);
// A later turn's deterministic extraction on a question with no visa code
// must not drop the previously-established D-2 from the stored profile.
const laterTurnProfile = mergeSessionProfile(
  beyondWindowProfile,
  extractProfileSignals("서울에 있는 어학당을 추천해 주세요", "ko"),
  4,
  "deterministic",
);
assert.equal(profileVisaCodes(laterTurnProfile).includes("D-2"), true);
const beyondWindowMediation = await mediateRagQuestion(
  {
    question: "제가 변경하려는 비자에 필요한 서류 알려주세요",
    locale: "ko",
    deterministicCategory: "documents",
    conversationHistory: [],
    profile: laterTurnProfile,
  },
  { forceLlm: false },
);
assert.equal(beyondWindowMediation.visaCodes.includes("D-2"), true);

console.log("PASS session profile: extraction, whitelist merge, fail-closed parse");

// --- FIX 9: the grounded-answer system prompt actually interpolates the
// stored profile block + rule 13, not just the stub that bypasses it ---
// generateGroundedRagAnswer calls generateLlmText directly (no DI seam), so
// this uses Bun's module mock to intercept the real call and capture the
// real system prompt string built by src/lib/chat/grounded-rag-answer.ts.
let capturedGroundedSystemPrompt = "";
mock.module("@/lib/ai/llm-gateway", () => ({
  isLlmConfigured: () => true,
  isLlmNotConfiguredError: () => false,
  generateLlmText: async (options: { messages: Array<{ role: string; content: string }> }) => {
    capturedGroundedSystemPrompt = options.messages.find((message) => message.role === "system")?.content || "";
    return {
      text: JSON.stringify({
        supported: true,
        answer: "D-4에서 D-2로 변경 시 통합신청서가 필요합니다 [1]",
        nextStep: "출입국사무소에 방문해 서류를 제출하세요.",
        usedSourceIndexes: [1],
      }),
      backend: "kimi",
      model: "test-model",
      durationMs: 1,
      inputChars: 0,
      outputChars: 0,
    };
  },
}));
const { generateGroundedRagAnswer } = await import("../src/lib/chat/grounded-rag-answer");
const groundedResult = await generateGroundedRagAnswer({
  question: "D-4에서 D-2로 변경할 때 필요한 서류가 뭔가요?",
  category: "documents",
  locale: "ko",
  profile: { version: "session-profile-v1", currentVisa: "D-4", targetVisa: "D-2" },
  documents: [{
    title: "체류자격 변경 서류 안내",
    content: "체류자격 변경 신청 시 통합신청서, 여권, 외국인등록증을 제출합니다.",
    source: "법무부",
    sourceUrl: "https://example.kr/visa-change",
    checkedAt: "2026-07-01",
    checkedBy: "ops",
  }],
});
assert.equal(groundedResult.status, "answered");
assert.equal(
  capturedGroundedSystemPrompt.includes("currentVisa=D-4"),
  true,
  "the system prompt must render the stored profile block",
);
assert.equal(
  capturedGroundedSystemPrompt.includes("targetVisa=D-2"),
  true,
);
assert.equal(
  capturedGroundedSystemPrompt.includes("13. The stored user profile is trusted session context"),
  true,
  "rule 13 (profile usage rule) must be present in the actual system prompt",
);

console.log("PASS session profile: mediation profile guard, persistence pin, grounded prompt");
