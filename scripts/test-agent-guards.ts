import { runAgentPreflight } from "../src/lib/agent/preflight";
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

await testPartnerToolDryRun();
await testPreflightDoesNotPersistPartnerRequest();
await testAgentStatusRoute();
console.log("PASS agent guards");
