import { runAgentPreflight } from "../src/lib/agent/preflight";
import { runFallbackAgent } from "../src/lib/agent/fallback";
import { buildAgentMeta } from "../src/lib/agent/meta";
import { analyzeAgentIntent } from "../src/lib/agent/planner";
import { resolveModelCacheDir } from "../src/lib/embeddings/transformer-embedder";
import { TOOL_MAP } from "../src/lib/agent/tools";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
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
  if (result.status !== "draft" || result.persisted !== false) {
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
  if (!result.toolResults.some((item) => item.tool === "request_partner" && item.result?.status === "draft")) {
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
  if (!result.toolResults.some((item) => item.tool === "request_partner" && item.result?.status === "draft")) {
    fail(`fallback partner request should stay draft: ${serialized}`);
  }
  if (serialized.includes("user@example.com")) {
    fail("fallback partner response leaked raw email");
  }
}

async function testAgentStatusRoute() {
  const route = await import("../src/app/api/ai/agent/route");
  const res = await route.GET();
  if (res.status !== 200) fail(`agent status expected 200, got ${res.status}`);
  const body = await res.json();
  if (!body.backend || !body.preflight || !body.limits) {
    fail(`agent status shape incomplete: ${JSON.stringify(body)}`);
  }
  if (JSON.stringify(body).includes(process.env.CODEX_API_KEY || "__never__")) {
    fail("agent status leaked CODEX_API_KEY");
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
            sourceMeta: {
              label: "Study in Korea",
              url: "https://www.studyinkorea.go.kr",
              owner: "official",
              verifiedAt: "2026-06-30",
              reviewAfter: "2026-09-30",
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
  if (meta.quality.officialSourceCount !== 1 || !meta.plan.includes("공식 정보 검색")) {
    fail(`agent meta quality/plan incomplete: ${serialized}`);
  }
  if (serialized.includes("user@example.com")) {
    fail("agent meta leaked raw email from question");
  }
}

function testVercelModelCacheDefaultsToTmp() {
  const defaultLocal = resolveModelCacheDir({});
  const defaultVercel = resolveModelCacheDir({ VERCEL: "1" });
  const configured = resolveModelCacheDir({ VERCEL: "1", MODEL_CACHE_DIR: "/custom/cache" });

  if (!defaultLocal.endsWith("data/model-cache")) {
    fail(`local model cache default should be data/model-cache, got ${defaultLocal}`);
  }
  if (defaultVercel !== "/tmp/kaxi-model-cache") {
    fail(`Vercel model cache default should use /tmp, got ${defaultVercel}`);
  }
  if (configured !== "/custom/cache") {
    fail(`MODEL_CACHE_DIR override not respected, got ${configured}`);
  }
}

await testPartnerToolDryRun();
await testPreflightDoesNotPersistPartnerRequest();
testPlannerUnderstandsMultilingualRequests();
await testPreflightUsesDiagnosisPlanner();
await testFallbackPartnerRequestStaysDraft();
await testAgentStatusRoute();
testAgentMetaDoesNotEchoPii();
testVercelModelCacheDefaultsToTmp();
console.log("PASS agent guards");
