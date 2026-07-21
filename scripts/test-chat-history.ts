import { strict as assert } from "assert";
import { NextRequest } from "next/server";

Object.assign(process.env, { NODE_ENV: "test" });
delete process.env.VERCEL;
delete process.env.VERCEL_ENV;
process.env.CHAT_SESSION_SIGNING_SECRET = "chat-history-test-signing-secret-that-is-longer-than-thirty-two-characters";
process.env.DATA_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.PII_HASH_SECRET = "chat-history-test-keyed-hash-secret-that-is-long-enough";

const { preparePiiField } = await import("../src/lib/privacy/pii");
const firstQuestion = preparePiiField("D-4 비자 준비 서류를 알려주세요.", { kind: "text" });
const firstAnswer = preparePiiField("여권과 입학허가서 등 공식 서류를 확인하세요.", { kind: "text" });
const failedQuestion = preparePiiField("첨부한 서류도 같이 확인해 주세요.", { kind: "text" });
const sessionKey = "kaxi-3d8a30ce-9b17-4a71-8678-4fbfd16a1111";
const failedRequestId = "86d859c4-fb4d-4c74-b5c9-15e35c331ad4";
const serviceRoleKey = "chat-history-fake-service-role-key";
const observedQueries: Array<{ table: string; sessionKey?: string }> = [];

// Populated once the unified-agent session key is minted below; the mock
// keeps a tiny in-memory chat_messages table scoped to that session so the
// persist -> snapshot round trip is a real assertion, not a canned fixture.
let agentSessionKey = "";
const agentMessages: Array<Record<string, unknown>> = [];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Content-Range": "0-10/*" },
  });
}

const server = Bun.serve({
  port: 0,
  async fetch(request) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/rest/v1/")) return json({ error: "not found" }, 404);
    if (
      request.headers.get("apikey") !== serviceRoleKey
      || request.headers.get("authorization") !== `Bearer ${serviceRoleKey}`
    ) {
      return json({ message: "unauthorized" }, 401);
    }

    const table = url.pathname.slice("/rest/v1/".length);
    observedQueries.push({ table, sessionKey: url.searchParams.get("session_key") || undefined });
    if (table === "chat_sessions") {
      return json({
        id: "history-session",
        metadata: {
          ownership: "signed-http-only-cookie",
          profile: { version: "session-profile-v1", targetVisa: "D-2" },
        },
      });
    }
    if (table === "chat_messages") {
      if (request.method === "POST") {
        // persistChatExchange's insert().select("id").single() call: store the
        // row against the in-memory agent session table and hand back its id.
        const payload = asRecord(await request.json());
        const id = agentMessages.length + 1;
        agentMessages.push({ ...payload, id, created_at: new Date().toISOString() });
        return json({ id });
      }
      if (url.searchParams.has("idempotency_key")) {
        // persistChatExchange's pre-insert existing-row lookup: these
        // fabricated idempotency keys never collide with a prior row.
        return json([]);
      }
      if (url.searchParams.get("session_id") === `eq.${agentSessionKey}`) {
        return json(agentMessages.map((row) => ({
          id: row.id,
          request_id: row.request_id,
          question: row.question,
          question_ciphertext: row.question_ciphertext,
          answer: row.answer,
          answer_ciphertext: row.answer_ciphertext,
          status: row.status,
          error_code: row.error_code,
          next_step: row.next_step,
          sources: row.sources,
          sources_json: row.sources_json,
          workflow_id: row.workflow_id,
          workflow_version_id: row.workflow_version_id,
          model_version: row.model_version,
          prompt_version: row.prompt_version,
          created_at: row.created_at,
        })));
      }
      return json([
        {
          id: 2,
          request_id: failedRequestId,
          question: failedQuestion.plaintext,
          question_ciphertext: failedQuestion.ciphertext,
          answer: "",
          answer_ciphertext: null,
          status: "failed",
          error_code: "n8n_unavailable",
          workflow_id: "workflow-history",
          workflow_version_id: "workflow-history-v1",
          model_version: "model-history-v1",
          prompt_version: "prompt-history-v1",
          next_step: null,
          sources: null,
          sources_json: "[]",
          created_at: "2026-07-10T00:01:00.000Z",
        },
        {
          id: 1,
          request_id: "2d92674b-333b-4a13-8930-e926caa324ec",
          question: firstQuestion.plaintext,
          question_ciphertext: firstQuestion.ciphertext,
          answer: firstAnswer.plaintext,
          answer_ciphertext: firstAnswer.ciphertext,
          status: "completed",
          error_code: null,
          workflow_id: "workflow-history",
          workflow_version_id: "workflow-history-v1",
          model_version: "model-history-v1",
          prompt_version: "prompt-history-v1",
          next_step: "학교 발급 서류의 최신 양식을 확인하세요.",
          sources: null,
          sources_json: "[]",
          created_at: "2026-07-10T00:00:00.000Z",
        },
      ]);
    }
    if (table === "n8n_audit_messages") {
      // persistN8nAuditMetadataBestEffort's insert; the row itself is never
      // read back in this test, so a bare success response is enough.
      return json({}, 201);
    }
    if (table === "retrieval_runs") {
      return json([
        {
          message_id: 1,
          sources: [
            {
              title: "D-4 비자 공식 안내",
              source: "HiKorea",
              sourceUrl: "https://www.hikorea.go.kr/",
              checkedAt: "2026-07-10T00:00:00.000Z",
            },
            { title: "위조 링크", sourceUrl: "javascript:alert(1)" },
          ],
        },
      ]);
    }
    if (table === "chat_attachments") {
      return json([
        {
          id: "history-failed",
          message_id: null,
          bucket: "private-chat",
          storage_key: "chat-attachments/quarantine/history-failed.png",
          original_name: "failed.png",
          size_bytes: 4096,
          mime_type: "image/png",
          sha256: "c".repeat(64),
          status: "quarantined",
          processing_status: "failed",
          created_at: "2026-07-10T00:04:00.000Z",
        },
        {
          id: "history-processing",
          message_id: null,
          bucket: "private-chat",
          storage_key: "chat-attachments/quarantine/history-processing.pdf",
          original_name: "processing.pdf",
          size_bytes: 2048,
          mime_type: "application/pdf",
          sha256: "b".repeat(64),
          status: "processing",
          processing_status: "processing",
          created_at: "2026-07-10T00:03:00.000Z",
        },
        {
          id: "history-ready-failed-turn",
          message_id: 2,
          bucket: "private-chat",
          storage_key: "chat-attachments/processed/history-ready.pdf",
          original_name: "ready.pdf",
          size_bytes: 1024,
          mime_type: "application/pdf",
          sha256: "a".repeat(64),
          status: "ready",
          processing_status: "completed",
          created_at: "2026-07-10T00:02:00.000Z",
        },
        {
          id: "history-completed-linked",
          message_id: 1,
          bucket: "private-chat",
          storage_key: "chat-attachments/processed/history-completed.pdf",
          original_name: "completed.pdf",
          size_bytes: 512,
          mime_type: "application/pdf",
          sha256: "d".repeat(64),
          status: "ready",
          processing_status: "completed",
          created_at: "2026-07-10T00:01:30.000Z",
        },
      ]);
    }
    return json({ message: "unknown table" }, 404);
  },
});

process.env.NEXT_PUBLIC_SUPABASE_URL = server.url.origin;
process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey;

try {
  const { loadChatSessionSnapshot, normalizeChatHistorySources } = await import("../src/lib/chat/history");
  const { persistChatExchange } = await import("../src/lib/chat/persistence");
  const {
    CHAT_SESSION_COOKIE,
    createKaxiSessionId,
    issueChatSessionToken,
  } = await import("../src/lib/chat/session-token");
  const sessionRoute = await import("../src/app/api/chat-session/route");

  agentSessionKey = createKaxiSessionId();
  const agentQuestion = "국비유학 비자 신청 절차가 궁금합니다.";
  const agentAnswer = "국비유학 비자는 학교 발급 서류와 정부 지원 확인서가 필요합니다.";
  await persistChatExchange({
    requestId: crypto.randomUUID(),
    idempotencyKey: `unified-${crypto.randomUUID()}`,
    sessionKey: agentSessionKey,
    tenantId: "default",
    locale: "ko",
    source: "kaxi-site",
    question: agentQuestion,
    answer: agentAnswer,
    needsHuman: false,
    provenance: {
      workflowId: "kaxi-unified-chat",
      workflowVersionId: "kaxi-unified-chat@2026-07-21.v1",
      modelVersion: "unknown",
      promptVersion: "kaxi-unified-expert@v1",
    },
    sources: [],
    searchMeta: { retrievedCount: 0 },
    latencyMs: 42,
  });

  const agentSnapshot = await loadChatSessionSnapshot(agentSessionKey);
  assert(agentSnapshot, "a persisted unified agent turn should be restorable from the cookie session");
  assert.equal(agentSnapshot.messages.length, 1);
  assert.equal(agentSnapshot.messages[0].question, agentQuestion);
  assert.equal(agentSnapshot.messages[0].answer, agentAnswer);
  assert.equal(agentSnapshot.messages[0].workflowId, "kaxi-unified-chat");
  assert.equal(agentSnapshot.messages[0].workflowVersionId, "kaxi-unified-chat@2026-07-21.v1");
  assert.equal(agentSnapshot.messages[0].status, "completed");

  const snapshot = await loadChatSessionSnapshot(sessionKey);
  assert(snapshot, "owned KAXI session should produce a snapshot");
  assert.equal(snapshot.messages.length, 2);
  assert.equal(snapshot.messages[0].question, "D-4 비자 준비 서류를 알려주세요.");
  assert.equal(snapshot.messages[0].answer, "여권과 입학허가서 등 공식 서류를 확인하세요.");
  assert.equal(snapshot.messages[0].workflowId, "workflow-history");
  assert.equal(snapshot.messages[0].workflowVersionId, "workflow-history-v1");
  assert.equal(snapshot.messages[0].modelVersion, "model-history-v1");
  assert.equal(snapshot.messages[0].promptVersion, "prompt-history-v1");
  assert.equal(snapshot.messages[0].sources.length, 1, "unsafe citation URLs must be removed");
  assert.equal(snapshot.messages[0].sources[0].sourceUrl, "https://www.hikorea.go.kr/");
  assert.equal(snapshot.messages[1].status, "failed");
  assert.equal(snapshot.messages[1].requestId, failedRequestId);
  assert.equal(snapshot.attachments.length, 3, "unlinked and failed-turn attachments should be restorable");
  assert.equal(snapshot.attachments.find((item) => item.id === "history-ready-failed-turn")?.status, "ready");
  assert.equal(snapshot.attachments.find((item) => item.id === "history-processing")?.status, "processing");
  assert.equal(snapshot.attachments.find((item) => item.id === "history-failed")?.status, "error");
  assert.equal(snapshot.attachments.some((item) => item.id === "history-completed-linked"), false);
  assert.equal(
    (snapshot.metadata as { profile?: { targetVisa?: string } } | null)?.profile?.targetVisa,
    "D-2",
    "the snapshot must expose stored session metadata for the runtime",
  );

  const snakeCaseSources = normalizeChatHistorySources([
    { title: "법무부", source_url: "https://www.moj.go.kr/", checked_at: "2026-07-10" },
  ]);
  assert.equal(snakeCaseSources[0]?.checkedAt, "2026-07-10");

  const token = issueChatSessionToken(sessionKey);
  const response = await sessionRoute.GET(new NextRequest("http://localhost/api/chat-session", {
    headers: { cookie: `${CHAT_SESSION_COOKIE}=${token}` },
  }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const responseBody = await response.json() as {
    sessionId?: string;
    messages?: Array<{ question?: string }>;
    attachments?: Array<{ id?: string }>;
  };
  assert.equal(responseBody.sessionId, sessionKey);
  assert.equal(responseBody.messages?.[0]?.question, "D-4 비자 준비 서류를 알려주세요.");
  assert.equal(responseBody.attachments?.length, 3);
  assert.equal(
    "metadata" in (responseBody as Record<string, unknown>),
    false,
    "the chat-session response must never expose raw session metadata (stored profile) to the client",
  );

  const unauthorized = await sessionRoute.GET(new NextRequest("http://localhost/api/chat-session"));
  assert.equal(unauthorized.status, 401);
  assert.equal(unauthorized.headers.get("cache-control"), "private, no-store");
  assert(
    observedQueries.some((query) => query.table === "chat_sessions" && query.sessionKey === `eq.${sessionKey}`),
    "history must scope the canonical session query",
  );
} finally {
  await server.stop(true);
}

console.log("PASS chat history: canonical Supabase restore, signed ownership, encrypted text, citations, retry identity, attachment resume state, and unified agent turn persistence round-trip");
