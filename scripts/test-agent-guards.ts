import { readFileSync } from "node:fs";
import type { AgentMissingSlot } from "../src/lib/agent/planner";
import { NextRequest } from "next/server";
import { prepareTestDb } from "./prepare-test-db";

prepareTestDb("agent guards");

const { runAgentPreflight } = await import("../src/lib/agent/preflight");
const { runAgent } = await import("../src/lib/agent/agent");
const { runFallbackAgent } = await import("../src/lib/agent/fallback");
const { buildAgentMeta } = await import("../src/lib/agent/meta");
const { analyzeAgentIntent } = await import("../src/lib/agent/planner");
const {
  explainAgentBackendDecision,
  explainConsultBackendDecision,
  getAgentBackend,
  getAiBackendDiagnostics,
  getConsultBackend,
  shouldRequireAgentLlm,
  shouldRequireConsultLlm,
} = await import("../src/lib/ai/backend-selector");
const { getTransformerRuntimeInfo, resolveModelCacheDir } = await import(
  "../src/lib/embeddings/transformer-embedder"
);
const { TOOL_MAP } = await import("../src/lib/agent/tools");

function deterministicQueryEmbedding(seedText: string): number[] {
  let seed = 0;
  for (let i = 0; i < seedText.length; i += 1) {
    seed = (seed * 31 + seedText.charCodeAt(i)) >>> 0;
  }
  return Array.from({ length: 1536 }, () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed / 0xffffffff) * 2 - 1;
  });
}

// CI runs without an OpenAI embedding credential, and the shared OpenAI RAG
// core fail-closes in that case. Serve deterministic stub embeddings so
// retrieval-behavior tests stay hermetic in every environment. Outage tests
// blank OPENAI_EMBEDDING_API_KEY explicitly to exercise the fail-close path,
// which short-circuits before any fetch happens.
process.env.OPENAI_EMBEDDING_API_KEY ||= "agent-guard-embedding-key";
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.includes("api.openai.com") && url.includes("/embeddings")) {
    const body = typeof init?.body === "string" ? JSON.parse(init.body) as { input?: unknown } : {};
    const seedText = typeof body.input === "string" ? body.input : "";
    return new Response(
      JSON.stringify({ data: [{ embedding: deterministicQueryEmbedding(seedText) }] }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }
  return realFetch(input, init);
}) as typeof fetch;

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
      AI_PROVIDER: "claude",
      ANTHROPIC_API_KEY: "anthropic-secret",
      ANTHROPIC_MODEL: "claude-opus-4-8",
      AI_REQUIRE_LLM: "false",
      AI_ALLOW_LLM_FALLBACK: "true",
    });

    if (getAgentBackend() !== "claude") fail("agent backend selector should always use Claude");
    if (getConsultBackend() !== "claude") fail("consult backend selector should always use Claude");
    if (shouldRequireAgentLlm()) fail("fallback policy should allow agent fallback by default");
    if (shouldRequireConsultLlm()) fail("fallback policy should allow consult fallback by default");
    const diagnostics = getAiBackendDiagnostics();
    if (
      diagnostics.agent.backend !== "claude" ||
      diagnostics.consult.backend !== "claude" ||
      !diagnostics.claude.apiKeyConfigured ||
      diagnostics.issues.length !== 0
    ) {
      fail(`Claude diagnostics should show managed API backend: ${JSON.stringify(diagnostics)}`);
    }
    if (
      !diagnostics.agent.decisionTable.some(
        (item) => item.code === "agent.backend.claude" && item.outcome === "selected"
      ) ||
      !diagnostics.consult.decisionTable.some(
        (item) => item.code === "consult.backend.claude" && item.outcome === "selected"
      )
    ) {
      fail(`diagnostics should expose selected Claude decision path: ${JSON.stringify(diagnostics)}`);
    }

    if (explainAgentBackendDecision().requireLlm || explainConsultBackendDecision().requireLlm) {
      fail("decision explanations should mirror LLM fallback requirement policy");
    }

    Object.assign(process.env, {
      AI_PROVIDER: "kimi",
      OPENAI_API_KEY: "kimi-secret",
      OPENAI_BASE_URL: "https://api.moonshot.ai/v1",
      OPENAI_MODEL: "kimi-k2.6",
      ANTHROPIC_API_KEY: "",
    });
    const kimiDiagnostics = getAiBackendDiagnostics();
    if (
      getAgentBackend() !== "kimi" ||
      getConsultBackend() !== "kimi" ||
      kimiDiagnostics.llm.backend !== "kimi" ||
      !kimiDiagnostics.kimi.apiKeyConfigured ||
      kimiDiagnostics.llm.model !== "kimi-k2.6"
    ) {
      fail(`Kimi diagnostics should expose the OpenAI-compatible backend: ${JSON.stringify(kimiDiagnostics)}`);
    }
    if (
      !kimiDiagnostics.agent.decisionTable.some(
        (item) => item.code === "agent.backend.kimi" && item.outcome === "selected"
      )
    ) {
      fail(`Kimi decision path missing: ${JSON.stringify(kimiDiagnostics)}`);
    }

    Object.assign(process.env, {
      VERCEL: "1",
      VERCEL_ENV: "production",
      AI_PROVIDER: "kimi",
      OPENAI_API_KEY: "",
      AI_REQUIRE_LLM: "false",
      AI_ALLOW_LLM_FALLBACK: "true",
    });

    const hostedDiagnostics = getAiBackendDiagnostics();
    if (!hostedDiagnostics.warnings.some((item) => item.includes("OPENAI_API_KEY")) || hostedDiagnostics.issues.length !== 0) {
      fail(`hosted fallback diagnostics should warn, not fail strict readiness: ${JSON.stringify(hostedDiagnostics)}`);
    }

    Object.assign(process.env, {
      AI_REQUIRE_LLM: "true",
      AI_ALLOW_LLM_FALLBACK: "false",
    });
    const strictDiagnostics = getAiBackendDiagnostics();
    if (strictDiagnostics.issues.length === 0 || !shouldRequireAgentLlm() || !shouldRequireConsultLlm()) {
      fail(`strict mode without key should be blocking: ${JSON.stringify(strictDiagnostics)}`);
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
  const snapshot = { ...process.env };
  const { db } = await import("../src/lib/db");
  try {
    Object.assign(process.env, {
      OPENAI_EMBEDDING_API_KEY: "",
      KAXI_QUERY_EMBEDDINGS_USE_OPENAI_KEY: "false",
      OPENAI_API_KEY: "",
    });
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
    if (!result.toolResults.some((item) => item.tool === "search_knowledge" && !item.success)) {
      fail(`fallback should record unavailable grounded search without aborting: ${serialized}`);
    }
    if (!result.toolResults.some((item) => item.tool === "request_partner" && resultHasStatus(item, "draft"))) {
      fail(`fallback partner request should stay draft: ${serialized}`);
    }
    if (serialized.includes("user@example.com")) {
      fail("fallback partner response leaked raw email");
    }
  } finally {
    restoreEnv(snapshot);
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

async function testAgentEscalatesTransientLlmFailure() {
  let thrownMessage = "";
  try {
    await runAgent(
      "D-10 변경 요건을 알려줘",
      "ko",
      [],
      { lang: "ko", leadId: "local-agent-guard" },
      {
        generateText: async () => {
          throw new Error("simulated upstream timeout");
        },
      },
    );
  } catch (error) {
    thrownMessage = error instanceof Error ? error.message : String(error);
  }
  if (!thrownMessage.includes("simulated upstream timeout")) {
    fail(`transient LLM errors must reach the route fallback: ${thrownMessage || "not thrown"}`);
  }
}

async function testD10KnowledgeKeepsQuestionSpecificDocuments() {
  const snapshot = { ...process.env };
  try {
    process.env.AI_AGENT_USE_TRANSFORMER_RAG = "false";
    const tool = TOOL_MAP.search_knowledge;
    if (!tool) fail("search_knowledge tool missing");
    const { result } = await tool.execute(
      {
        query: "D-10 구직 체류자격으로 변경할 때 핵심 요건과 제출 서류",
        top_k: 4,
      },
      { lang: "ko", leadId: "local-agent-guard", dryRun: true },
    );
    const ids = Array.isArray(result)
      ? result.flatMap((item) => isRecord(item) && typeof item.id === "string" ? [item.id] : [])
      : [];
    if (!ids.includes("d10-overview") || !ids.includes("study-in-korea-d10-change-documents")) {
      fail(`D-10 agent retrieval lost question-specific documents: ${JSON.stringify(ids)}`);
    }
  } finally {
    restoreEnv(snapshot);
  }
}

async function testAgentStatusRoute() {
  const snapshot = { ...process.env };
  try {
    Object.assign(process.env, {
      AI_PROVIDER: "kimi",
      OPENAI_API_KEY: "kimi-secret-key",
      OPENAI_BASE_URL: "https://api.moonshot.ai/v1",
      OPENAI_MODEL: "kimi-k2.6",
    });

    const route = await import("../src/app/api/ai/agent/route");
    const res = await route.GET();
    if (res.status !== 200) fail(`agent status expected 200, got ${res.status}`);
    const body = await res.json();
    if (!body.backend || !body.preflight || !body.limits || !body.llm || !body.kimi) {
      fail(`agent status shape incomplete: ${JSON.stringify(body)}`);
    }
    if (!body.backendPolicy?.agent || !body.backendPolicy?.consult || !body.backendPolicy?.fallbackPolicy) {
      fail(`agent status should expose backend policy diagnostics: ${JSON.stringify(body)}`);
    }
    if (body.backend !== "kimi" || !body.llm.apiKeyConfigured || !body.kimi.apiKeyConfigured) {
      fail(`agent status should expose Kimi backend metadata: ${JSON.stringify(body)}`);
    }
    for (const secret of ["kimi-secret-key"]) {
      const serialized = JSON.stringify(body);
      if (serialized.includes(secret)) fail(`agent status leaked secret material: ${secret}`);
    }
  } finally {
    restoreEnv(snapshot);
  }
}

async function testClaudeMissingKeyFallsBackToTools() {
  const snapshot = { ...process.env };
  try {
    Object.assign(process.env, {
      AI_PROVIDER: "kimi",
      OPENAI_API_KEY: "",
      AI_REQUIRE_LLM: "false",
      AI_ALLOW_LLM_FALLBACK: "true",
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
      fail(`missing Claude key should fall back to tools: status=${res.status} body=${JSON.stringify(body)}`);
    }
  } finally {
    restoreEnv(snapshot);
  }
}

async function testClaudeStrictModeBlocksWithoutKey() {
  const snapshot = { ...process.env };
  try {
    Object.assign(process.env, {
      AI_PROVIDER: "kimi",
      OPENAI_API_KEY: "",
      AI_REQUIRE_LLM: "true",
      AI_ALLOW_LLM_FALLBACK: "false",
      AI_AGENT_RATE_LIMIT: "0",
      AI_AGENT_DAILY_QUOTA: "0",
      AI_AGENT_PREFLIGHT_ENABLED: "false",
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

    if (res.status !== 503 || body.backend !== "llm-unavailable") {
      fail(`strict mode without Claude key should return 503: status=${res.status} body=${JSON.stringify(body)}`);
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
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/kaxi",
      RATE_LIMIT_BACKEND: "auto",
      AI_CONSULT_RATE_LIMIT: "0",
      AI_CONSULT_DAILY_QUOTA: "0",
      AI_EMBEDDING_INIT_TIMEOUT_MS: "1",
      AI_LLM_TIMEOUT_MS: "1000",
      AI_PROVIDER: "kimi",
      OPENAI_API_KEY: "",
      AI_REQUIRE_LLM: "false",
      AI_ALLOW_LLM_FALLBACK: "true",
    });
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
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/kaxi",
      RATE_LIMIT_BACKEND: "auto",
      AI_CONSULT_RATE_LIMIT: "0",
      AI_CONSULT_DAILY_QUOTA: "0",
      AI_EMBEDDING_INIT_TIMEOUT_MS: "1",
      AI_LLM_TIMEOUT_MS: "1000",
      AI_PROVIDER: "kimi",
      OPENAI_API_KEY: "",
      AI_REQUIRE_LLM: "false",
      AI_ALLOW_LLM_FALLBACK: "true",
    });
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
await testAgentEscalatesTransientLlmFailure();
await testD10KnowledgeKeepsQuestionSpecificDocuments();
await testAgentStatusRoute();
await testClaudeMissingKeyFallsBackToTools();
await testClaudeStrictModeBlocksWithoutKey();
await testConsultRouteDoesNotRequireSharedLimiterWhenDisabled();
await testConsultOfficialSummaryPrioritizesQuestionDocuments();
testAgentMetaDoesNotEchoPii();
testAgentMetaClarifyingQuestions();
testVercelModelCacheDefaultsToTmp();
console.log("PASS agent guards");
