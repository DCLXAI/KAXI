import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { readFileSync } from "node:fs";
import { runAgentPreflight } from "../src/lib/agent/preflight";
import { runFallbackAgent } from "../src/lib/agent/fallback";
import { buildAgentMeta } from "../src/lib/agent/meta";
import { analyzeAgentIntent, type AgentMissingSlot } from "../src/lib/agent/planner";
import {
  explainAgentBackendDecision,
  explainConsultBackendDecision,
  getAgentBackend,
  getAiBackendDiagnostics,
  getConsultBackend,
  shouldRequireAgentLlm,
  shouldRequireConsultLlm,
} from "../src/lib/ai/backend-selector";
import { getTransformerRuntimeInfo, resolveModelCacheDir } from "../src/lib/embeddings/transformer-embedder";
import { TOOL_MAP } from "../src/lib/agent/tools";
import { NextRequest } from "next/server";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function restoreEnv(snapshot: NodeJS.ProcessEnv) {
  for (const key of Object.keys(process.env)) {
    if (!(key in snapshot)) delete process.env[key];
  }
  Object.assign(process.env, snapshot);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function resultHasStatus(item: { result: unknown }, status: string): boolean {
  return isRecord(item.result) && item.result.status === status;
}

function testAgentToolTypeBoundaries() {
  const files = [
    "src/lib/agent/tools.ts",
    "src/lib/agent/agent.ts",
    "src/lib/agent/preflight.ts",
    "src/lib/agent/fallback.ts",
    "src/components/kbridge/Agent.tsx",
  ];
  const forbidden = [
    /Record<string,\s*any>/,
    /result:\s*any/,
    /args:\s*Record<string,\s*any>/,
    /\sas\s+any/,
    /catch\s*\([^)]*:\s*any\)/,
  ];

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    const hit = forbidden.find((pattern) => pattern.test(content));
    if (hit) fail(`${file} should keep agent tool boundaries typed as unknown, matched ${hit}`);
  }
}

function testBackendSelectorContracts() {
  const snapshot = { ...process.env };
  try {
    Object.assign(process.env, {
      AGENT_BACKEND: "remote-bridge",
      CODEX_REMOTE_BRIDGE_URL: "https://bridge.example.invalid/api/ai/agent",
      CODEX_REMOTE_BRIDGE_ENABLED: "true",
      AI_AGENT_ALLOW_TOOL_FALLBACK: "false",
      AI_CONSULT_ALLOW_OFFICIAL_SUMMARY_FALLBACK: "false",
    });
    delete process.env.AI_ALLOW_LLM_FALLBACK;
    delete process.env.AI_CONSULT_BACKEND;

    if (getAgentBackend() !== "remote-bridge") fail("agent backend selector should honor remote-bridge");
    if (getConsultBackend() !== "remote-bridge") fail("consult backend selector should inherit remote bridge");
    if (!shouldRequireAgentLlm()) fail("remote bridge agent should require LLM by default");
    if (!shouldRequireConsultLlm()) fail("remote bridge consult should require LLM by default");
    const remoteDiagnostics = getAiBackendDiagnostics();
    if (
      remoteDiagnostics.agent.backend !== "remote-bridge" ||
      !remoteDiagnostics.agent.requireLlm ||
      !remoteDiagnostics.remoteBridge.configured ||
      remoteDiagnostics.issues.length !== 0
    ) {
      fail(`remote bridge diagnostics should show strict configured bridge: ${JSON.stringify(remoteDiagnostics)}`);
    }
    if (
      !remoteDiagnostics.agent.decisionTable.some(
        (item) => item.code === "agent.backend.explicit_remote_bridge" && item.outcome === "selected"
      ) ||
      !remoteDiagnostics.agent.decisionTable.some(
        (item) => item.code === "agent.require.strict_llm" && item.outcome === "selected"
      )
    ) {
      fail(`agent diagnostics should expose selected bridge decision path: ${JSON.stringify(remoteDiagnostics.agent)}`);
    }
    if (
      !remoteDiagnostics.consult.decisionTable.some(
        (item) => item.code === "consult.backend.inherit_remote_bridge" && item.outcome === "selected"
      )
    ) {
      fail(`consult diagnostics should expose inherited bridge decision path: ${JSON.stringify(remoteDiagnostics.consult)}`);
    }

    process.env.AI_ALLOW_LLM_FALLBACK = " true ";
    if (shouldRequireAgentLlm()) fail("global LLM fallback flag should disable strict agent LLM requirement");
    if (shouldRequireConsultLlm()) fail("global LLM fallback flag should disable strict consult LLM requirement");
    if (explainAgentBackendDecision().requireLlm || explainConsultBackendDecision().requireLlm) {
      fail("decision explanations should mirror LLM fallback requirement policy");
    }

    Object.assign(process.env, {
      VERCEL: "1",
      VERCEL_ENV: "production",
      AGENT_BACKEND: "codex",
      CODEX_SERVERLESS_ENABLED: " false ",
      CODEX_REMOTE_BRIDGE_URL: "",
      CODEX_REMOTE_BRIDGE_ENABLED: "false",
      AI_ALLOW_LLM_FALLBACK: "",
    });
    delete process.env.CODEX_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_CONSULT_BACKEND;

    if (getConsultBackend() !== "zai") fail("hosted consult without Codex config should route to zAI");
    const hostedDiagnostics = getAiBackendDiagnostics();
    if (!hostedDiagnostics.warnings.some((item) => item.toLowerCase().includes("codex")) || hostedDiagnostics.issues.length !== 0) {
      fail(`hosted fallback diagnostics should warn, not fail strict readiness: ${JSON.stringify(hostedDiagnostics)}`);
    }
    if (
      !hostedDiagnostics.consult.decisionTable.some(
        (item) => item.code === "consult.backend.default_zai" && item.outcome === "selected"
      )
    ) {
      fail(`hosted consult diagnostics should expose default Z.ai decision: ${JSON.stringify(hostedDiagnostics.consult)}`);
    }

    process.env.CODEX_SERVERLESS_ENABLED = " true ";
    if (getConsultBackend() !== "codex") fail("explicit CODEX_SERVERLESS_ENABLED=true should route consult to Codex");

    Object.assign(process.env, {
      VERCEL: "",
      VERCEL_ENV: "",
      AGENT_BACKEND: "nonsense",
      AI_CONSULT_BACKEND: "mystery",
      CODEX_SERVERLESS_ENABLED: "",
      CODEX_REMOTE_BRIDGE_URL: "",
      CODEX_REMOTE_BRIDGE_ENABLED: "true",
      AI_ALLOW_LLM_FALLBACK: "true",
    });
    const unsupportedDiagnostics = getAiBackendDiagnostics();
    if (
      unsupportedDiagnostics.agent.configuredValue !== "unsupported" ||
      unsupportedDiagnostics.consult.configuredValue !== "unsupported" ||
      unsupportedDiagnostics.agent.backend !== "codex"
    ) {
      fail(`unsupported backend values should be visible but ignored safely: ${JSON.stringify(unsupportedDiagnostics)}`);
    }
    if (
      !unsupportedDiagnostics.agent.decisionTable.some((item) => item.code === "agent.backend.unsupported_ignored") ||
      !unsupportedDiagnostics.consult.decisionTable.some((item) => item.code === "consult.backend.unsupported_ignored")
    ) {
      fail(`unsupported backend decisions should be represented in diagnostics: ${JSON.stringify(unsupportedDiagnostics)}`);
    }
  } finally {
    restoreEnv(snapshot);
  }
}

async function testPartnerToolDryRun() {
  const tool = TOOL_MAP.request_partner;
  if (!tool) fail("request_partner tool missing");

  const { result, summary } = await tool.execute(
    {
      partner_type: "admin",
      question: "D-2 refusal 상담 원해요. user@example.com 으로 연락주세요.",
    },
    { lang: "ko", leadId: "local-agent-guard", dryRun: true }
  );

  const serialized = JSON.stringify({ result, summary });
  if (!isRecord(result) || result.status !== "draft" || result.persisted !== false) {
    fail(`dry-run partner request must stay draft, got ${serialized}`);
  }
  if (serialized.includes("user@example.com")) {
    fail("dry-run partner response leaked raw email");
  }
}

async function testPreflightDoesNotPersistPartnerRequest() {
  const { db } = await import("../src/lib/db");
  const before = await db.partnerRequest.count();
  const result = await runAgentPreflight(
    "D-2 비자 거절 상담을 행정사에게 연결해줘. user@example.com 으로 연락 가능해.",
    "ko",
    { lang: "ko", leadId: "local-agent-guard" }
  );
  const after = await db.partnerRequest.count();
  const serialized = JSON.stringify(result);

  if (after !== before) {
    fail(`preflight persisted partner request: before=${before}, after=${after}`);
  }
  if (!result.toolResults.some((item) => item.tool === "request_partner" && resultHasStatus(item, "draft"))) {
    fail("preflight partner tool should return a draft request");
  }
  if (serialized.includes("user@example.com")) {
    fail("preflight response leaked raw email");
  }
}

function testPlannerUnderstandsMultilingualRequests() {
  const vi = analyzeAgentIntent(
    "Tôi là người Việt Nam, tìm trường tiếng Hàn ở Seoul chi phí 5 triệu won, hồ sơ visa D-4 và tư vấn hành chính",
    "vi"
  );
  const viTools = vi.plan.map((item) => item.tool);
  if (!viTools.includes("search_schools") || !viTools.includes("get_documents") || !viTools.includes("request_partner")) {
    fail(`Vietnamese planner missed expected tools: ${JSON.stringify(vi)}`);
  }
  if (vi.budget !== 5_000_000 || vi.nationality !== "vn" || vi.region !== "seoul" || vi.program !== "language") {
    fail(`Vietnamese planner entities incorrect: ${JSON.stringify(vi)}`);
  }

  const mn = analyzeAgentIntent(
    "Монгол оюутан D-4 виз баримт, Сеул хэлний сургууль 5 сая вон төсөвтэй хайж байна",
    "mn"
  );
  const mnTools = mn.plan.map((item) => item.tool);
  if (!mnTools.includes("search_schools") || !mnTools.includes("get_documents")) {
    fail(`Mongolian planner missed expected tools: ${JSON.stringify(mn)}`);
  }
  if (mn.budget !== 5_000_000 || mn.nationality !== "mn" || mn.region !== "seoul") {
    fail(`Mongolian planner entities incorrect: ${JSON.stringify(mn)}`);
  }
}

function testPlannerSurfacesMissingSlots() {
  const vague = analyzeAgentIntent("비자 서류랑 학교 추천해줘", "ko");
  if (vague.confidence === "high") {
    fail(`vague planner should not be high confidence: ${JSON.stringify(vague)}`);
  }
  const expectedSlots: AgentMissingSlot[] = ["region", "program", "visa_type", "nationality"];
  for (const slot of expectedSlots) {
    if (!vague.missingSlots.includes(slot)) {
      fail(`vague planner missing slot ${slot}: ${JSON.stringify(vague)}`);
    }
  }

  const specific = analyzeAgentIntent("베트남 학생 D-4 서울 어학당 500만원 예산으로 추천해줘", "ko");
  if (specific.confidence !== "high" || specific.missingSlots.length > 0) {
    fail(`specific planner should be high confidence: ${JSON.stringify(specific)}`);
  }
}

function testPlannerUsesSchoolNameRefinement() {
  const refined = analyzeAgentIntent(
    "다음 조건을 반영해서 다시 추천/계산해줘.\n- 예산: 500만원\n- 학교명: 연세대학교\n\n원래 요청: 비용 계산해줘",
    "ko"
  );
  const schoolSearch = refined.plan.find((item) => item.tool === "search_schools");

  if (!schoolSearch) {
    fail(`refined planner should search schools: ${JSON.stringify(refined)}`);
  }
  if (schoolSearch.args.school_name !== "연세대학교") {
    fail(`refined planner should pass school_name: ${JSON.stringify(refined)}`);
  }
  if (schoolSearch.args.max_tuition !== 5_000_000) {
    fail(`refined planner should parse budget: ${JSON.stringify(refined)}`);
  }
  if (refined.missingSlots.includes("region") || refined.missingSlots.includes("program")) {
    fail(`exact school refinement should not require region/program: ${JSON.stringify(refined)}`);
  }
}

async function testSchoolToolFiltersByName() {
  const tool = TOOL_MAP.search_schools;
  if (!tool) fail("search_schools tool missing");

  const { result, summary } = await tool.execute(
    {
      school_name: "연세대학교",
      limit: 5,
    },
    { lang: "ko", leadId: "local-agent-guard", dryRun: true }
  );

  if (!Array.isArray(result) || result.length === 0) {
    fail(`school name filter should return matches: ${summary}`);
  }
  if (!result.every((school) => isRecord(school) && String(school.name || "").includes("연세대학교"))) {
    fail(`school name filter returned unrelated schools: ${JSON.stringify(result)}`);
  }
}

async function testPreflightUsesDiagnosisPlanner() {
  const result = await runAgentPreflight(
    "고졸이고 TOPIK 2급, 예산 500만원인데 한국 유학 맞춤 로드맵 진단해줘",
    "ko",
    { lang: "ko", leadId: "local-agent-guard" }
  );

  if (!result.toolResults.some((item) => item.tool === "diagnose_path")) {
    fail(`preflight should call diagnose_path for personalized roadmap: ${JSON.stringify(result)}`);
  }
}

async function testPreflightCarriesPlannerContext() {
  const result = await runAgentPreflight(
    "비자 서류랑 학교 추천해줘",
    "ko",
    { lang: "ko", leadId: "local-agent-guard" }
  );

  if (!result.groundingContext.includes("Intent confidence") || !result.groundingContext.includes("Missing slots")) {
    fail(`preflight should include planner context: ${JSON.stringify(result)}`);
  }
  if (!result.groundingContext.includes("Detected signals") || !result.groundingContext.includes("Resolved slots")) {
    fail(`preflight should include planner evidence: ${JSON.stringify(result)}`);
  }
  if (!result.groundedQuestion.includes("KAXI server-side tool context")) {
    fail(`grounded question should include tool context: ${result.groundedQuestion}`);
  }
}

async function testFallbackPartnerRequestStaysDraft() {
  const { db } = await import("../src/lib/db");
  const before = await db.partnerRequest.count();
  const result = await runFallbackAgent(
    "D-2 거절 상담을 행정사에게 연결해줘. user@example.com 으로 연락 가능해.",
    "ko",
    { lang: "ko", leadId: "local-agent-guard" }
  );
  const after = await db.partnerRequest.count();
  const serialized = JSON.stringify(result);

  if (after !== before) {
    fail(`fallback persisted partner request: before=${before}, after=${after}`);
  }
  if (!result.toolResults.some((item) => item.tool === "request_partner" && resultHasStatus(item, "draft"))) {
    fail(`fallback partner request should stay draft: ${serialized}`);
  }
  if (serialized.includes("user@example.com")) {
    fail("fallback partner response leaked raw email");
  }
}

async function testFallbackAnswerIncludesCitationMarkers() {
  const result = await runFallbackAgent(
    "서울 어학당 500만원 예산으로 추천해줘",
    "ko",
    { lang: "ko", leadId: "local-agent-guard" }
  );

  if (!result.toolResults.some((item) => item.tool === "search_schools")) {
    fail(`fallback citation test expected school search: ${JSON.stringify(result)}`);
  }
  if (!/\[\d+\]/.test(result.answer)) {
    fail(`fallback answer should include citation markers: ${result.answer}`);
  }
}

async function testAgentStatusRoute() {
  const snapshot = { ...process.env };
  try {
    Object.assign(process.env, {
      AGENT_BACKEND: "remote-bridge",
      CODEX_REMOTE_BRIDGE_ENABLED: "true",
      CODEX_REMOTE_BRIDGE_URL: "https://user:pass@bridge.example.test/api/ai/agent?token=query-secret#hash",
      CODEX_REMOTE_BRIDGE_TOKEN: "bridge-secret-token",
      CODEX_REMOTE_BRIDGE_TIMEOUT_MS: "12345",
      CODEX_API_KEY: "codex-secret-key",
    });

    const route = await import("../src/app/api/ai/agent/route");
    const res = await route.GET();
    if (res.status !== 200) fail(`agent status expected 200, got ${res.status}`);
    const body = await res.json();
    if (!body.backend || !body.preflight || !body.limits || !body.remoteBridge?.stats) {
      fail(`agent status shape incomplete: ${JSON.stringify(body)}`);
    }
    if (!body.backendPolicy?.agent || !body.backendPolicy?.consult || !body.backendPolicy?.fallbackPolicy) {
      fail(`agent status should expose backend policy diagnostics: ${JSON.stringify(body)}`);
    }
    if (!body.remoteBridge.tokenConfigured || body.remoteBridge.timeoutMs !== 12345) {
      fail(`agent status should expose safe bridge configuration flags: ${JSON.stringify(body.remoteBridge)}`);
    }
    if (body.remoteBridge.url?.endpoint !== "https://bridge.example.test/api/ai/agent") {
      fail(`agent status should redact remote bridge credentials/query/hash: ${JSON.stringify(body.remoteBridge.url)}`);
    }
    const serialized = JSON.stringify(body);
    for (const secret of ["codex-secret-key", "bridge-secret-token", "query-secret", "user:pass"]) {
      if (serialized.includes(secret)) fail(`agent status leaked secret material: ${secret}`);
    }
  } finally {
    restoreEnv(snapshot);
  }
}

async function testRemoteBridgeFailureFallsBackToTools() {
  const snapshot = { ...process.env };
  try {
    Object.assign(process.env, {
      AGENT_BACKEND: "remote-bridge",
      CODEX_REMOTE_BRIDGE_URL: "http://127.0.0.1:9/api/ai/agent",
      CODEX_REMOTE_BRIDGE_ENABLED: "true",
      AI_AGENT_ALLOW_TOOL_FALLBACK: "true",
      AI_AGENT_RATE_LIMIT: "0",
      AI_AGENT_DAILY_QUOTA: "0",
      AI_AGENT_PREFLIGHT_TIMEOUT_MS: "1000",
      AI_AGENT_LOGGING_ENABLED: "false",
      AI_AGENT_LEDGER_ENABLED: "false",
    });

    const route = await import("../src/app/api/ai/agent/route");
    const req = new NextRequest("http://localhost/api/ai/agent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        question: "행정사 AI 에이전트",
        lang: "ko",
        history: [],
      }),
    });
    const res = await route.POST(req);
    const body = await res.json();

    if (res.status !== 200 || body.backend !== "tool-fallback" || !body.answer) {
      fail(`remote bridge failure should fall back to tools: status=${res.status} body=${JSON.stringify(body)}`);
    }
  } finally {
    restoreEnv(snapshot);
  }
}

async function testConsultRouteDoesNotRequireSharedLimiterWhenDisabled() {
  const snapshot = { ...process.env };
  try {
    Object.assign(process.env, {
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      VERCEL: "1",
      DATABASE_URL: "file:./db/custom.db",
      RATE_LIMIT_BACKEND: "auto",
      AI_CONSULT_RATE_LIMIT: "0",
      AI_CONSULT_DAILY_QUOTA: "0",
      AI_EMBEDDING_INIT_TIMEOUT_MS: "1",
      AI_LLM_TIMEOUT_MS: "1000",
      ZAI_ENABLED: "false",
    });
    delete process.env.TURSO_DATABASE_URL;
    delete process.env.TURSO_AUTH_TOKEN;
    delete process.env.DATABASE_AUTH_TOKEN;
    delete process.env.DATA_ENCRYPTION_KEY;

    const route = await import("../src/app/api/ai/consult/route");
    const req = new NextRequest("https://kaxi.local/api/ai/consult", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.77",
      },
      body: JSON.stringify({
        question: "행정사 AI",
        lang: "ko",
        history: [],
        mode: "general",
      }),
    });
    const res = await route.POST(req);
    const body = await res.json();

    if (res.status !== 200 || !body.answer || body.error === "Shared rate limit backend unavailable") {
      fail(`consult route should answer when limits are disabled: status=${res.status} body=${JSON.stringify(body)}`);
    }
    if (String(body.answer).includes("일시적 오류가 발생했습니다")) {
      fail(`consult route should not return temporary error fallback: ${JSON.stringify(body)}`);
    }
  } finally {
    restoreEnv(snapshot);
  }
}

async function testConsultOfficialSummaryPrioritizesQuestionDocuments() {
  const snapshot = { ...process.env };
  try {
    Object.assign(process.env, {
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      VERCEL: "1",
      DATABASE_URL: "file:./db/custom.db",
      RATE_LIMIT_BACKEND: "auto",
      AI_CONSULT_RATE_LIMIT: "0",
      AI_CONSULT_DAILY_QUOTA: "0",
      AI_CONSULT_BACKEND: "zai",
      AI_EMBEDDING_INIT_TIMEOUT_MS: "1",
      AI_LLM_TIMEOUT_MS: "1000",
      ZAI_ENABLED: "false",
    });
    delete process.env.TURSO_DATABASE_URL;
    delete process.env.TURSO_AUTH_TOKEN;
    delete process.env.DATABASE_AUTH_TOKEN;
    delete process.env.DATA_ENCRYPTION_KEY;

    const route = await import("../src/app/api/ai/consult/route");
    const req = new NextRequest("https://kaxi.local/api/ai/consult", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.78",
      },
      body: JSON.stringify({
        question: "D-2 비자 연장에 필요한 핵심 서류는 뭐야?",
        lang: "ko",
        history: [],
        mode: "documents",
      }),
    });
    const res = await route.POST(req);
    const body = await res.json();
    const answer = String(body.answer || "");

    if (res.status !== 200 || body.backend !== "official-summary" || !answer) {
      fail(`consult route should return official-summary fallback: status=${res.status} body=${JSON.stringify(body)}`);
    }
    if (!/서류|첨부|체류기간 연장|제출/.test(answer)) {
      fail(`consult official summary should prioritize document/extension sources: ${answer.slice(0, 600)}`);
    }
    if (!body.retrievedDocs?.[0]?.basis || !body.retrievedDocs?.[0]?.sourceMeta?.url) {
      fail(`consult response should expose source basis and URL annotations: ${JSON.stringify(body).slice(0, 1200)}`);
    }
    if (/^## 출입국관리법 최근공포/.test(answer.trim())) {
      fail(`consult official summary should not lead with recent promulgation monitor: ${answer.slice(0, 600)}`);
    }
  } finally {
    restoreEnv(snapshot);
  }
}

async function testConsultRouteUsesRemoteCodexBridge() {
  const snapshot = { ...process.env };
  let seenBody = "";
  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk.toString("utf8");
    });
    req.on("end", () => {
      seenBody = raw;
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          answer: "mocked consult bridge answer",
          backend: "codex-cli-local-bridge",
          codexMode: "local-auth",
          steps: [],
          toolResults: [],
          iterations: 1,
          durationMs: 12,
        })
      );
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;

  try {
    Object.assign(process.env, {
      NODE_ENV: "test",
      VERCEL_ENV: "",
      VERCEL: "",
      DATABASE_URL: "file:./db/custom.db",
      AI_CONSULT_RATE_LIMIT: "0",
      AI_CONSULT_DAILY_QUOTA: "0",
      AI_CONSULT_BACKEND: "zai",
      AGENT_BACKEND: "remote-bridge",
      AI_EMBEDDING_INIT_TIMEOUT_MS: "1",
      AI_LLM_TIMEOUT_MS: "5000",
      CODEX_REMOTE_BRIDGE_URL: `http://127.0.0.1:${address.port}/api/ai/agent`,
      CODEX_REMOTE_BRIDGE_TIMEOUT_MS: "3000",
      ZAI_ENABLED: "false",
    });
    delete process.env.CODEX_REMOTE_BRIDGE_TOKEN;

    const route = await import("../src/app/api/ai/consult/route");
    const req = new NextRequest("https://kaxi.local/api/ai/consult", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.88",
      },
      body: JSON.stringify({
        question: "행정사 AI",
        lang: "ko",
        history: [],
        mode: "general",
      }),
    });
    const res = await route.POST(req);
    const body = await res.json();

    const answer = String(body.answer || "");
    if (res.status !== 200 || !answer.startsWith("mocked consult bridge answer")) {
      fail(`consult route should use remote bridge: status=${res.status} body=${JSON.stringify(body)}`);
    }
    if (!answer.includes("[1]") || !answer.includes("📚 출처:")) {
      fail(`consult route should normalize bridge answers with citations and source links: ${answer}`);
    }
    if (body.backend !== "codex-cli-local-bridge" || body.codexMode !== "local-auth") {
      fail(`consult route should expose bridge backend metadata: ${JSON.stringify(body)}`);
    }
    if (String(body.disclaimer).includes("외부 LLM 없이")) {
      fail(`consult route should not expose external LLM configuration fallback: ${JSON.stringify(body)}`);
    }
    const payload = JSON.parse(seenBody);
    const prompt = String(payload.question || "");
    if (payload.promptMode !== "raw") {
      fail(`consult bridge payload should request raw Codex prompt mode, got ${seenBody}`);
    }
    if (!prompt.includes("Role: KAXI") || !prompt.includes("Base the answer only on the official excerpts")) {
      fail(`consult bridge payload should include consult guardrails, got ${seenBody}`);
    }
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    restoreEnv(snapshot);
  }
}

function testAgentMetaDoesNotEchoPii() {
  const meta = buildAgentMeta({
    lang: "ko",
    question: "D-4 비자 서류 알려줘. user@example.com 으로 연락줘.",
    backend: "tool-fallback",
    grounded: true,
    durationMs: 1234,
    toolResults: [
      {
        tool: "search_knowledge",
        args: { query: "D-4 서류" },
        result: [
          {
            id: "visa-documents",
            title: "비자 신청 필수 서류",
            category: "documents",
            source: "Study in Korea",
            content: "비자 신청에는 사증발급신청서, 여권, 표준입학허가서 등 공식 제출서류 확인이 필요합니다.",
            sourceMeta: {
              label: "Study in Korea",
              url: "https://www.studyinkorea.go.kr",
              owner: "official",
              verifiedAt: "2026-06-30",
              reviewAfter: "2026-09-30",
            },
            ragMeta: {
              doc_id: "visa-documents",
              last_checked_at: "2026-06-30",
              review_status: "approved",
            },
          },
        ],
        summary: "1개 관련 문서 검색",
        success: true,
      },
    ],
  });
  const serialized = JSON.stringify(meta);

  if (meta.sources.length !== 1 || meta.sources[0].url !== "https://www.studyinkorea.go.kr") {
    fail(`agent meta source extraction failed: ${serialized}`);
  }
  if (!meta.sources[0].basis?.includes("확인일 2026-06-30")) {
    fail(`agent meta source should include answer basis: ${serialized}`);
  }
  if (meta.quality.officialSourceCount !== 1 || !meta.plan.includes("공식 정보 검색")) {
    fail(`agent meta quality/plan incomplete: ${serialized}`);
  }
  if (!meta.quality.intentConfidence || typeof meta.quality.missingSlotCount !== "number") {
    fail(`agent meta quality missing intent diagnostics: ${serialized}`);
  }
  if (!meta.intentEvidence.detectedSignals.includes("documents") || meta.intentEvidence.resolvedSlots.length === 0) {
    fail(`agent meta should expose planner evidence: ${serialized}`);
  }
  if (serialized.includes("user@example.com")) {
    fail("agent meta leaked raw email from question");
  }
}

function testAgentMetaClarifyingQuestions() {
  const meta = buildAgentMeta({
    lang: "ko",
    question: "비자 서류랑 학교 추천해줘",
    backend: "tool-fallback",
    grounded: true,
    toolResults: [],
  });

  if (meta.clarifyingQuestions.length === 0 || meta.quality.missingSlotCount === 0) {
    fail(`agent meta should expose clarifying questions: ${JSON.stringify(meta)}`);
  }
  if (!meta.clarifyingQuestions.some((item) => item.slot === "visa_type")) {
    fail(`agent meta should ask for visa type: ${JSON.stringify(meta)}`);
  }
}

function testVercelModelCacheDefaultsToTmp() {
  const defaultLocal = resolveModelCacheDir({});
  const defaultVercel = resolveModelCacheDir({ VERCEL: "1" });
  const configured = resolveModelCacheDir({ VERCEL: "1", MODEL_CACHE_DIR: "/custom/cache" });
  const diagnostics = getTransformerRuntimeInfo({ VERCEL: "1", MODEL_CACHE_DIR: "/custom/cache" });

  if (!defaultLocal.endsWith("data/model-cache")) {
    fail(`local model cache default should be data/model-cache, got ${defaultLocal}`);
  }
  if (defaultVercel !== "/tmp/kaxi-model-cache") {
    fail(`Vercel model cache default should use /tmp, got ${defaultVercel}`);
  }
  if (configured !== "/custom/cache") {
    fail(`MODEL_CACHE_DIR override not respected, got ${configured}`);
  }
  if (diagnostics.cache.location !== "custom" || diagnostics.cache.configured !== true) {
    fail(`model cache diagnostics should expose safe location metadata: ${JSON.stringify(diagnostics)}`);
  }
  if (JSON.stringify(diagnostics).includes("/custom/cache")) {
    fail(`model cache diagnostics should not expose absolute configured path: ${JSON.stringify(diagnostics)}`);
  }
}

testAgentToolTypeBoundaries();
testBackendSelectorContracts();
await testPartnerToolDryRun();
await testPreflightDoesNotPersistPartnerRequest();
testPlannerUnderstandsMultilingualRequests();
testPlannerSurfacesMissingSlots();
testPlannerUsesSchoolNameRefinement();
await testSchoolToolFiltersByName();
await testPreflightUsesDiagnosisPlanner();
await testPreflightCarriesPlannerContext();
await testFallbackPartnerRequestStaysDraft();
await testFallbackAnswerIncludesCitationMarkers();
await testAgentStatusRoute();
await testRemoteBridgeFailureFallsBackToTools();
await testConsultRouteDoesNotRequireSharedLimiterWhenDisabled();
await testConsultOfficialSummaryPrioritizesQuestionDocuments();
await testConsultRouteUsesRemoteCodexBridge();
testAgentMetaDoesNotEchoPii();
testAgentMetaClarifyingQuestions();
testVercelModelCacheDefaultsToTmp();
console.log("PASS agent guards");
