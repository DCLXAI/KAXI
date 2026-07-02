import { createHash } from "crypto";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { prepareLocalDb } from "./prepare-local-db";
import type { OfficialKnowledgeSource } from "../src/lib/knowledge/source-monitor";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

function contentHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

const tmpDir = mkdtempSync(join(tmpdir(), "kaxi-knowledge-monitor-test-"));
process.env.DATABASE_URL = `file:${join(tmpDir, "knowledge-monitor.db")}`;
process.env.RESTORE_SQLITE_DEMO_DB = "false";
process.env.TRANSFORMERS_ALLOW_REMOTE = "false";
prepareLocalDb(process.env.DATABASE_URL);

const { db } = await import("../src/lib/db");
const {
  approveKnowledgeDocument,
  listApprovedKnowledgeDocsForRag,
} = await import("../src/lib/knowledge/repository");
const {
  OFFICIAL_KNOWLEDGE_SOURCE_WATCHLIST,
  runOfficialKnowledgeSourceMonitor,
} = await import("../src/lib/knowledge/source-monitor");
const {
  buildKnowledgeMonitorAlertPayload,
  sendKnowledgeMonitorAlert,
} = await import("../src/lib/knowledge/monitor-alerts");

try {
  const requiredWatchlistIds = [
    "immigration-law-recent-promulgations",
    "immigration-act-stay-status-scope",
    "immigration-decree-current-text",
    "immigration-decree-long-term-status-table",
    "immigration-rule-documents-attachments",
    "hikorea-homepage-urgent-notices",
    "hikorea-integrated-status-manual",
    "hikorea-policy-notice-monitor",
    "moj-immigration-policy-news",
  ];
  for (const docId of requiredWatchlistIds) {
    const source = OFFICIAL_KNOWLEDGE_SOURCE_WATCHLIST.find((item) => item.docId === docId);
    assert(source, `official watchlist missing required source: ${docId}`);
    assert(source.monitorCadence === "daily", `${docId} must be monitored daily`);
    assert(source.sourceType.startsWith("official_"), `${docId} must use an official source type`);
  }
  assert(
    OFFICIAL_KNOWLEDGE_SOURCE_WATCHLIST.some((item) => item.docId === "immigration-law-recent-promulgations" && item.legalPriority === 1),
    "recent promulgation monitor must be top legal priority"
  );

  const source: OfficialKnowledgeSource = {
    docId: "monitor-base-law-doc",
    title: "감시 대상 출입국 법령",
    sourceUrl: "https://www.law.go.kr/monitor-test",
    sourceType: "official_law",
    topic: "legal",
  };
  const oldContent = "old immigration rule content";
  await db.knowledgeDocument.create({
    data: {
      docId: source.docId,
      title: source.title,
      sourceUrl: source.sourceUrl,
      sourceType: source.sourceType,
      language: "ko",
      jurisdiction: "KR",
      topic: source.topic,
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      validTo: null,
      lastCheckedAt: new Date("2026-07-01T00:00:00.000Z"),
      checkedBy: "test_agent",
      reviewStatus: "APPROVED",
      supersedes: [],
      supersededBy: null,
      chunks: {
        create: [{ chunkIndex: 0, content: oldContent, contentHash: contentHash(oldContent) }],
      },
    },
  });

  const fetchImpl = async () =>
    new Response("<html><body><h1>출입국 규정 최신본</h1><p>D-2 D-4 변경 감지 문장</p></body></html>", {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });

  const preview = await runOfficialKnowledgeSourceMonitor({
    actor: "test-monitor",
    persistCandidates: false,
    sources: [source],
    fetchImpl,
    now: new Date("2026-07-02T00:00:00.000Z"),
  });
  assert(preview.changed === 1, "preview should detect changed official source");
  assert(preview.candidatesCreated === 0, "preview must not create candidates");
  assert(await db.knowledgeDocument.count() === 1, "preview must not mutate knowledge documents");

  const persisted = await runOfficialKnowledgeSourceMonitor({
    actor: "test-monitor",
    persistCandidates: true,
    sources: [source],
    fetchImpl,
    now: new Date("2026-07-02T00:00:00.000Z"),
  });
  const candidateDocId = persisted.results[0]?.candidateDocId;
  assert(candidateDocId, "changed monitor result should expose candidate doc id");
  assert(persisted.candidatesCreated === 1, "persisted run should create one pending candidate");

  const alertPayload = buildKnowledgeMonitorAlertPayload(persisted, {
    actor: "test-monitor",
    trigger: "test",
    now: new Date("2026-07-02T00:05:00.000Z"),
  });
  assert(alertPayload.summary.changed === 1, "alert payload should include changed count");
  assert(alertPayload.changedSources[0]?.docId === source.docId, "alert payload should include changed source");
  assert(alertPayload.adminUrl.endsWith("/admin/knowledge"), "alert payload should link to admin knowledge review");

  delete process.env.KNOWLEDGE_MONITOR_ALERT_WEBHOOK_URL;
  const skippedAlert = await sendKnowledgeMonitorAlert(persisted, {
    actor: "test-monitor",
    trigger: "test",
  });
  assert(skippedAlert.skippedReason === "not_configured", "missing webhook should skip monitor alert");

  process.env.KNOWLEDGE_MONITOR_ALERT_WEBHOOK_URL = "https://ops.example.test/kaxi-monitor";
  process.env.KNOWLEDGE_MONITOR_ALERT_SIGNING_SECRET = "monitor-alert-test-secret";
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const sentAlert = await sendKnowledgeMonitorAlert(persisted, {
    actor: "test-monitor",
    trigger: "test",
    fetchImpl: async (input, init) => {
      capturedUrl = input;
      capturedInit = init;
      return new Response("accepted", { status: 202, statusText: "Accepted" });
    },
  });
  assert(sentAlert.sent === true, "configured webhook should send monitor alert");
  assert(capturedUrl === process.env.KNOWLEDGE_MONITOR_ALERT_WEBHOOK_URL, "alert should call configured webhook");
  assert(capturedInit?.method === "POST", "alert webhook should use POST");
  const capturedHeaders = new Headers(capturedInit.headers as HeadersInit);
  assert(capturedHeaders.get("x-kaxi-signature")?.startsWith("sha256="), "alert should include HMAC signature");
  const capturedBody = JSON.parse(String(capturedInit.body));
  assert(capturedBody.kind === "knowledge_monitor_alert", "alert body should use generic JSON format");
  assert(capturedBody.changedSources[0]?.candidateDocId === candidateDocId, "alert should include candidate doc id");

  const failedAlert = await sendKnowledgeMonitorAlert(persisted, {
    actor: "test-monitor",
    trigger: "test",
    fetchImpl: async () => new Response("down", { status: 503, statusText: "Service Unavailable" }),
  });
  assert(failedAlert.sent === false && failedAlert.status === 503, "alert failure should be reported without throwing");
  delete process.env.KNOWLEDGE_MONITOR_ALERT_WEBHOOK_URL;
  delete process.env.KNOWLEDGE_MONITOR_ALERT_SIGNING_SECRET;

  const candidate = await db.knowledgeDocument.findUnique({
    where: { docId: candidateDocId },
    include: { chunks: true },
  });
  assert(candidate?.reviewStatus === "PENDING", "candidate should be PENDING until admin approval");
  assert(candidate.chunks.some((chunk) => chunk.content.includes("D-2 D-4 변경 감지 문장")), "candidate should keep fetched content");

  const beforeApproval = await listApprovedKnowledgeDocsForRag(new Date("2026-07-02T00:00:00.000Z"));
  assert(beforeApproval.some((doc) => doc.id === source.docId), "existing approved source should remain active before approval");
  assert(!beforeApproval.some((doc) => doc.id === candidateDocId), "pending candidate must not be production searchable");

  await approveKnowledgeDocument({
    docId: candidateDocId,
    actor: "admin-test",
    now: new Date("2026-07-02T01:00:00.000Z"),
  });

  const baseAfterApproval = await db.knowledgeDocument.findUnique({ where: { docId: source.docId } });
  assert(baseAfterApproval?.supersededBy === candidateDocId, "approving candidate should supersede previous source doc");

  const afterApproval = await listApprovedKnowledgeDocsForRag(new Date("2026-07-02T02:00:00.000Z"));
  assert(afterApproval.some((doc) => doc.id === candidateDocId), "approved candidate should become production searchable");
  assert(!afterApproval.some((doc) => doc.id === source.docId), "superseded source doc must not remain production searchable");

  console.log("PASS knowledge monitor: official diff, pending candidate, alert webhook, approval supersedes previous RAG");
} finally {
  await db.$disconnect();
  rmSync(tmpDir, { recursive: true, force: true });
}
