import { strict as assert } from "assert";
import { existsSync, readFileSync, readdirSync } from "fs";
import {
  decideUnifiedAiRoute,
  unifiedRouteLabel,
} from "../src/lib/ai/unified-router";
import { recommendPath } from "../src/lib/data/diagnosis";
import {
  quickDiagnosisInput,
} from "../src/lib/data/quick-diagnosis";
import { normalizeExpertResponse } from "../src/app/api/ai/unified/route";

assert.deepEqual(
  decideUnifiedAiRoute("서울 인증대학 3곳 찾아서 비용을 계산해줘"),
  { capability: "action", mode: null, reason: "explicit_action" },
);
assert.deepEqual(
  decideUnifiedAiRoute("D-4 체류기간 연장 기준이 어떻게 되나요?"),
  { capability: "expert", mode: "visa", reason: "regulated_guidance" },
);
assert.deepEqual(
  decideUnifiedAiRoute("D-2 비자가 거절됐는데 전문가도 연결해줘"),
  { capability: "expert", mode: "appeal", reason: "visa_appeal" },
);
assert.deepEqual(
  decideUnifiedAiRoute("허위 잔고증명 서류를 만들어도 되나요?"),
  { capability: "expert", mode: "documents", reason: "safety_high_risk" },
);
assert.deepEqual(
  decideUnifiedAiRoute("유학원 등록 없이 상담업을 운영할 수 있나요?"),
  { capability: "expert", mode: "business", reason: "business_compliance" },
);

assert.equal(decideUnifiedAiRoute("Tìm 3 trường ở Seoul và tính chi phí").capability, "action");
assert.equal(decideUnifiedAiRoute("Visa D-2 bị từ chối thì khiếu nại thế nào?").mode, "appeal");
assert.equal(decideUnifiedAiRoute("D-4 визийн хугацааг яаж сунгах вэ?").mode, "visa");
assert.equal(decideUnifiedAiRoute("Find schools within 5M KRW").capability, "action");
assert.equal(decideUnifiedAiRoute("My D-2 visa was denied. Can I appeal?").mode, "appeal");

assert.deepEqual(
  decideUnifiedAiRoute("그럼 다음 단계는요?", {
    previousCapability: "expert",
    previousExpertMode: "appeal",
  }),
  { capability: "expert", mode: "appeal", reason: "expert_followup" },
);
assert.equal(
  decideUnifiedAiRoute("그 조건으로 학교를 다시 찾아줘", {
    previousCapability: "expert",
    previousExpertMode: "visa",
  }).capability,
  "action",
);
assert.equal(unifiedRouteLabel("ko", "expert"), "공식 문서 상담");
assert.equal(unifiedRouteLabel("en", "action"), "Tool execution");

const landing = readFileSync("src/components/kbridge/Landing.tsx", "utf8");
const header = readFileSync("src/components/kbridge/Header.tsx", "utf8");
const agentHook = readFileSync("src/components/agent/useAgentChat.ts", "utf8");
const unifiedApi = readFileSync("src/app/api/ai/unified/route.ts", "utf8");
const consultPage = readFileSync("src/app/[locale]/consult/page.tsx", "utf8");
const sitemap = readFileSync("src/app/sitemap.ts", "utf8");
const widget = readFileSync("src/components/typebot/TypebotBubble.tsx", "utf8");
const quickDiagnosis = readFileSync("src/components/diagnosis/HomeQuickDiagnosis.tsx", "utf8");
const pawMark = readFileSync("src/components/brand/KaxiPawMark.tsx", "utf8");
const agentLanding = readFileSync("src/components/agent/AgentLanding.tsx", "utf8");
const agentChatHeader = readFileSync("src/components/agent/AgentChatHeader.tsx", "utf8");
const agentResponseCard = readFileSync("src/components/agent/AgentResponseCard.tsx", "utf8");
const globalTheme = readFileSync("src/app/globals.css", "utf8");
const button = readFileSync("src/components/ui/button.tsx", "utf8");
const runningCat = readFileSync("src/components/brand/KaxiRunningCat.tsx", "utf8");

assert.doesNotMatch(landing, /onNavigate\("consult"\)/, "landing must expose one AI entry point");
assert.match(landing, /<AgentExperience embedded \/>/, "home must embed the working unified AI experience");
assert.match(landing, /id="kaxi-ai"/, "home AI must have its own layout section outside the hero");
assert.match(landing, /<HomeQuickDiagnosis/, "home must show an immediate card-based path finder");
assert.doesNotMatch(landing, /tr\("cta_start"/, "home must not gate participation behind a generic diagnosis CTA");
assert.doesNotMatch(landing, /kaxi-home-chat-launcher/, "home must not keep a second floating AI launcher");
assert.doesNotMatch(landing, /ai_banner_title/, "home must not keep a separate promotional AI banner");
assert.doesNotMatch(header, /publicHref\("consult"\)/, "header must expose one AI entry point");
assert.match(header, /<KaxiRunningCat size=\{32\} \/>/, "the header brand must use a stationary RunCat");
assert.doesNotMatch(header, />\s*K\s*<\/div>/, "the legacy K badge must be removed from the header");
assert.match(agentHook, /\/api\/ai\/unified/, "the single AI screen must use the server-side router");
assert.match(unifiedApi, /runExpertConsult/, "regulated guidance must retain the expert backend boundary");
assert.match(unifiedApi, /runActionAgent/, "task execution must retain the action backend boundary");

const officialSummaryDecision = decideUnifiedAiRoute("D-4 체류기간 연장 기준이 어떻게 되나요?");
const officialSummaryNormalized = normalizeExpertResponse(
  { answer: "공식 근거 기반 요약", backend: "official-summary" },
  officialSummaryDecision,
  "ko",
  "D-4 체류기간 연장 기준이 어떻게 되나요?",
  120,
);
assert.equal(
  officialSummaryNormalized.meta.quality.answerSource,
  "official-summary",
  "official-summary fallback answers must be labeled as non-LLM",
);
assert.equal(
  officialSummaryNormalized.meta.quality.intentConfidence,
  undefined,
  "official-summary fallback answers must not carry a fabricated confidence chip",
);

const llmDecision = decideUnifiedAiRoute("D-4 체류기간 연장 기준이 어떻게 되나요?");
const llmNormalized = normalizeExpertResponse(
  { answer: "LLM이 생성한 답변", backend: "kimi" },
  llmDecision,
  "ko",
  "D-4 체류기간 연장 기준이 어떻게 되나요?",
  120,
);
assert.equal(llmNormalized.meta.quality.answerSource, "llm", "LLM-backed answers must be labeled as model output");
assert.equal(llmNormalized.meta.quality.intentConfidence, "high", "LLM-backed answers must keep the confidence chip");
assert.match(consultPage, /redirect\(`\/\$\{locale\}\/agent`\)/, "legacy consult path must redirect to KAXI AI");
assert.doesNotMatch(sitemap, /"\/consult"/, "legacy consult path must not be indexed as a separate product");
assert.match(widget, /"\/agent"/, "the compact widget must be hidden on the full KAXI AI screen");
assert.doesNotMatch(widget, /publicPath === "\/"/, "Typebot must remain available on home");
assert.match(widget, /kaxi-typebot-launcher/, "home must use the Typebot launcher");
assert.match(widget, /<Bubble/, "home must use the published Typebot bubble runtime");
assert.match(widget, /typebot="kaxi-rag-typebot"/, "the Typebot launcher must target the published KAXI bot");
assert.doesNotMatch(widget, /KaxiFlowerMark/, "the legacy flower mark must be removed from Typebot");
assert.doesNotMatch(landing, /KaxiRunningCat/, "home must not show a decorative running cat");
assert.match(runningCat, /state="running"/, "both surfaces must use the running animation");
assert.match(runningCat, /data-kaxi-running-cat="stationary"/, "Typebot cat must stay in place");
assert.doesNotMatch(runningCat, /travel|white/, "the removed homepage travel variant must not remain");
assert.match(pawMark, /data-kaxi-mark="paw"/, "the public AI brand must expose the KAXI paw mark");
assert.match(globalTheme, /--primary: #c7d2fe;/, "the main KAXI action color must match the approved lavender pastel token");
assert.match(globalTheme, /--primary-strong: #4f5db3;/, "the strong companion token must exist or 30+ text/border call sites silently lose contrast");
assert.match(globalTheme, /--icon-accent: #e5a0b3;/, "public icons must use the light-pink accent");
assert.match(button, /border-icon-accent/, "outline buttons must use the light-pink border accent");
assert.match(header, /icon: KaxiPawMark/, "the public AI navigation must use the KAXI paw mark");
assert.match(quickDiagnosis, /<KaxiPawMark/, "quick diagnosis must use the KAXI paw mark");
for (const [name, source] of [
  ["agent landing", agentLanding],
  ["agent chat header", agentChatHeader],
  ["agent response", agentResponseCard],
] as const) {
  assert.match(source, /<KaxiPawMark/, `${name} must use the KAXI paw mark`);
  assert.doesNotMatch(source, /<(?:Sparkles|Bot)\b/, `${name} must not use a generic AI mark`);
}
assert.match(quickDiagnosis, /aria-pressed/, "quick diagnosis choices must expose their selected state");
assert.match(quickDiagnosis, /quick-diagnosis-step-goal/, "quick diagnosis must ask for the user's goal");
assert.match(quickDiagnosis, /quick-diagnosis-step-korean/, "quick diagnosis must ask for Korean level");
assert.match(quickDiagnosis, /quick-diagnosis-step-budget/, "quick diagnosis must ask for a real budget band");
assert.match(quickDiagnosis, /quick-diagnosis-result/, "quick diagnosis must render an in-page result");
assert.match(quickDiagnosis, /onNavigate\("diagnose"\)/, "quick diagnosis must retain a detailed diagnosis path");
for (const scenario of [
  { goal: "language", korean: "topik3", budget: "8to12", expected: "D-4" },
  { goal: "degree", korean: "none", budget: "12to18", expected: "D-4" },
  { goal: "degree", korean: "topik3", budget: "12to18", expected: "D-2" },
  { goal: "transfer", korean: "topik1", budget: "over18", expected: "D-4" },
  { goal: "unsure", korean: "topik2", budget: "8to12", expected: "D-2" },
] as const) {
  assert.equal(
    recommendPath(quickDiagnosisInput(scenario)).visaType,
    scenario.expected,
    `quick diagnosis must use real answers for ${JSON.stringify(scenario)}`,
  );
}
const consultFrontendFiles = existsSync("src/components/consult")
  ? readdirSync("src/components/consult")
  : [];
assert.deepEqual(consultFrontendFiles, [], "a second consult frontend must not remain in the bundle");
assert.equal(existsSync("src/app/api/ai/consult/route.ts"), true, "the expert backend must remain available behind the router");

console.log("PASS unified KAXI AI routing and single-entry frontend");
