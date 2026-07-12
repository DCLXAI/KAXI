import { strict as assert } from "assert";
import { existsSync, readFileSync, readdirSync } from "fs";
import {
  decideUnifiedAiRoute,
  unifiedRouteLabel,
} from "../src/lib/ai/unified-router";

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

assert.doesNotMatch(landing, /onNavigate\("consult"\)/, "landing must expose one AI entry point");
assert.doesNotMatch(header, /publicHref\("consult"\)/, "header must expose one AI entry point");
assert.match(agentHook, /\/api\/ai\/unified/, "the single AI screen must use the server-side router");
assert.match(unifiedApi, /runExpertConsult/, "regulated guidance must retain the expert backend boundary");
assert.match(unifiedApi, /runActionAgent/, "task execution must retain the action backend boundary");
assert.match(consultPage, /redirect\(`\/\$\{locale\}\/agent`\)/, "legacy consult path must redirect to KAXI AI");
assert.doesNotMatch(sitemap, /"\/consult"/, "legacy consult path must not be indexed as a separate product");
assert.match(widget, /"\/agent"/, "the compact widget must be hidden on the full KAXI AI screen");
const consultFrontendFiles = existsSync("src/components/consult")
  ? readdirSync("src/components/consult")
  : [];
assert.deepEqual(consultFrontendFiles, [], "a second consult frontend must not remain in the bundle");
assert.equal(existsSync("src/app/api/ai/consult/route.ts"), true, "the expert backend must remain available behind the router");

console.log("PASS unified KAXI AI routing and single-entry frontend");
