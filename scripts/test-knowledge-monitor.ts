import { createHash } from "crypto";
import { mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { prepareTestDb } from "./prepare-test-db";
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
process.env.TRANSFORMERS_ALLOW_REMOTE = "false";
prepareTestDb("knowledge monitor");

const { db } = await import("../src/lib/db");
const {
  approveKnowledgeDocument,
  discardKnowledgeDocument,
  listApprovedKnowledgeDocsForRag,
} = await import("../src/lib/knowledge/repository");
const {
  OFFICIAL_KNOWLEDGE_SOURCE_WATCHLIST,
  DEFAULT_CRON_KNOWLEDGE_SOURCE_IDS,
  getCronOfficialKnowledgeSources,
  runOfficialKnowledgeSourceMonitor,
} = await import("../src/lib/knowledge/source-monitor");
const {
  getKnowledgeDocsWithMetadata,
  getRagDocumentMetadata,
} = await import("../src/lib/data/knowledge");
const {
  buildKnowledgeMonitorAlertPayload,
  sendKnowledgeMonitorAlert,
} = await import("../src/lib/knowledge/monitor-alerts");

try {
  const requiredWatchlistIds = [
    "immigration-law-recent-promulgations",
    "immigration-law-interpretation-hierarchy",
    "immigration-act-stay-status-scope",
    "immigration-act-visa-passport-requirement",
    "immigration-act-visa-issuance-certificate",
    "immigration-act-general-stay-status",
    "immigration-act-permanent-residence-status",
    "immigration-act-entry-ban",
    "immigration-act-entry-inspection",
    "immigration-act-employment-restriction",
    "immigration-act-employer-reporting-duty",
    "immigration-act-student-management-reporting",
    "immigration-act-outside-status-activity",
    "immigration-act-workplace-change-addition",
    "immigration-act-activity-scope-restriction",
    "immigration-act-false-application-documents",
    "immigration-act-status-grant",
    "immigration-act-status-change",
    "immigration-act-stay-extension",
    "immigration-act-marriage-immigrant-extension-special",
    "immigration-act-emergency-extension-special",
    "immigration-act-departure-inspection",
    "immigration-act-departure-suspension",
    "immigration-act-reentry-permit",
    "immigration-act-alien-registration",
    "immigration-act-registration-change-report",
    "immigration-act-address-change-report",
    "immigration-act-arc-return-duty",
    "immigration-act-biometric-information-duty",
    "immigration-act-deportation-grounds",
    "immigration-act-detention-order",
    "immigration-act-deportation-objection",
    "immigration-act-deportation-detention",
    "immigration-act-detention-temporary-release",
    "immigration-act-departure-recommendation-order",
    "immigration-act-permit-cancellation-change",
    "immigration-decree-current-text",
    "immigration-decree-long-term-status-table",
    "immigration-decree-short-term-status-table",
    "immigration-decree-permanent-residence-table",
    "immigration-rule-stay-permission-review-criteria",
    "immigration-rule-documents-attachments",
    "hikorea-homepage-urgent-notices",
    "hikorea-integrated-status-manual",
    "hikorea-d2-d4-d10-e7-f2-f5-requirements",
    "hikorea-stay-extension",
    "hikorea-status-change",
    "hikorea-activity-permit",
    "hikorea-forms-document-checklist",
    "hikorea-online-visit-application",
    "hikorea-fees-processing-authentication",
    "hikorea-policy-notice-monitor",
    "moj-immigration-policy-news",
    "moj-notice-board-visa-policy",
    "moj-e7-wage-requirement-2026",
    "moj-f6-marriage-visa-criteria",
    "moj-f4-employment-restriction-preannouncement",
    "moj-skilled-worker-points-visa",
    "moj-seasonal-worker-program",
    "moj-online-stay-visa-center",
    "moj-stay-management-policy",
    "moj-tax-health-arrears-extension-restriction",
    "moj-social-integration-program-kiip",
    "moj-k-eta-entry-authorization",
    "moj-k-eta-scam-warning",
    "moj-e-arrival-card",
    "moj-e-arrival-card-notice",
    "moj-office-jurisdiction-seoul-incheon-gyeonggi",
    "moj-office-jurisdiction-busan-gyeongnam",
    "moj-office-jurisdiction-gwangju-jeolla-jeju",
    "moj-office-jurisdiction-daegu-gyeongbuk-gangwon",
    "moj-office-jurisdiction-daejeon-chungcheong",
    "moj-mobile-immigration-office",
    "accredited-university",
    "visa-portal-visa-types",
  ];
  for (const docId of requiredWatchlistIds) {
    const source = OFFICIAL_KNOWLEDGE_SOURCE_WATCHLIST.find((item) => item.docId === docId);
    assert(source, `official watchlist missing required source: ${docId}`);
    assert(source.monitorCadence === "daily", `${docId} must be monitored daily`);
    assert(source.sourceType.startsWith("official_"), `${docId} must use an official source type`);
  }

  const watchlistIds = new Set(OFFICIAL_KNOWLEDGE_SOURCE_WATCHLIST.map((item) => item.docId));
  const officialDocIds = getKnowledgeDocsWithMetadata()
    .filter((doc) =>
      doc.id.startsWith("immigration-") ||
      doc.id.startsWith("hikorea-") ||
      doc.id.startsWith("moj-") ||
      doc.id === "accredited-university" ||
      doc.id === "visa-portal-visa-types"
    )
    .filter((doc) => getRagDocumentMetadata(doc, "ko").source_type.startsWith("official_"))
    .map((doc) => doc.id);
  for (const docId of officialDocIds) {
    assert(watchlistIds.has(docId), `official RAG doc is not monitored: ${docId}`);
  }

  const workflowText = readFileSync(".github/workflows/official-source-monitor.yml", "utf8");
  const workflowSourceIds = new Set<string>();
  for (const match of workflowText.matchAll(/source_ids:\s*([^\n]+)/g)) {
    for (const id of match[1].split(",").map((item) => item.trim()).filter(Boolean)) {
      workflowSourceIds.add(id);
    }
  }
  for (const docId of watchlistIds) {
    assert(workflowSourceIds.has(docId), `official source watchlist is not scheduled in workflow: ${docId}`);
  }
  for (const docId of workflowSourceIds) {
    assert(watchlistIds.has(docId), `workflow monitors unknown official source id: ${docId}`);
  }
  assert(
    OFFICIAL_KNOWLEDGE_SOURCE_WATCHLIST.some((item) => item.docId === "immigration-law-recent-promulgations" && item.legalPriority === 1),
    "recent promulgation monitor must be top legal priority"
  );
  const cronSources = getCronOfficialKnowledgeSources({ NODE_ENV: "test" } as NodeJS.ProcessEnv);
  assert(
    cronSources.length === DEFAULT_CRON_KNOWLEDGE_SOURCE_IDS.length,
    "daily Vercel cron should use the bounded critical-source set",
  );
  const configuredCronSources = getCronOfficialKnowledgeSources({
    NODE_ENV: "test",
    KNOWLEDGE_MONITOR_CRON_SOURCE_IDS: "visa-portal-visa-types,unknown-source",
  } as NodeJS.ProcessEnv);
  assert(
    configuredCronSources.length === 1 && configuredCronSources[0]?.docId === "visa-portal-visa-types",
    "cron source override should preserve known IDs and ignore unknown IDs",
  );

  let activeFetches = 0;
  let maxActiveFetches = 0;
  const concurrencySources: OfficialKnowledgeSource[] = ["a", "b", "c"].map((suffix) => ({
    docId: `monitor-concurrency-${suffix}`,
    title: `Monitor concurrency ${suffix}`,
    sourceUrl: `https://www.law.go.kr/monitor-concurrency-${suffix}`,
    sourceType: "official_law",
    topic: "legal",
  }));
  const concurrencyRun = await runOfficialKnowledgeSourceMonitor({
    actor: "test-monitor",
    persistCandidates: false,
    sources: concurrencySources,
    concurrency: 2,
    fetchImpl: async () => {
      activeFetches += 1;
      maxActiveFetches = Math.max(maxActiveFetches, activeFetches);
      await new Promise((resolve) => setTimeout(resolve, 20));
      activeFetches -= 1;
      return new Response("<html><body>concurrency test</body></html>", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    },
  });
  assert(maxActiveFetches === 2, "knowledge monitor should honor bounded concurrency");
  assert(
    concurrencyRun.results.map((result) => result.docId).join(",") === concurrencySources.map((source) => source.docId).join(","),
    "concurrent monitor should preserve source result order",
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

  await db.complianceRule.create({
    data: {
      code: "monitor-impact-rule",
      domain: "immigration_law",
      visaType: "D-2/D-4",
      ruleType: "source_monitor_impact",
      status: "ACTIVE",
      versions: {
        create: [
          {
            version: 1,
            effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
            conditionAst: { op: "always" },
            outputAst: {
              riskLevel: "LOW",
              resultType: "knowledge_monitor",
              messageKey: "monitor-impact-rule",
              requiresHumanReview: true,
            },
            requiredInputs: ["visa_type"],
            sourceRefs: [source.docId],
            fallbackPolicy: "If this source changes, route affected answers to admin review before relying on prior guidance.",
            reviewStatus: "APPROVED",
            reviewedBy: "test_agent",
            reviewedAt: new Date("2026-07-01T00:00:00.000Z"),
          },
        ],
      },
    },
  });

  await db.chatLog.create({
    data: {
      lang: "ko",
      question: "monitor impact source question",
      answer: "answer",
      source: "rag",
      retrievedDocs: JSON.stringify({ docIds: [source.docId] }),
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
  assert(
    persisted.results[0]?.diff?.impact.sourceDocIds.includes(source.docId),
    "monitor diff impact should include source doc id"
  );
  assert(persisted.results[0]?.diff?.impact.ruleCount === 1, "monitor diff should include impacted rule count");
  assert(persisted.results[0]?.diff?.impact.userCount === 1, "monitor diff should include impacted chat log count");

  const alertPayload = buildKnowledgeMonitorAlertPayload(persisted, {
    actor: "test-monitor",
    trigger: "test",
    now: new Date("2026-07-02T00:05:00.000Z"),
  });
  assert(alertPayload.summary.changed === 1, "alert payload should include changed count");
  assert(alertPayload.changedSources[0]?.docId === source.docId, "alert payload should include changed source");
  assert(
    alertPayload.changedSources[0]?.sourceDocIds.includes(source.docId),
    "alert payload should include impacted source doc ids"
  );
  assert(
    alertPayload.changedSources[0]?.impactedRuleCodes.includes("monitor-impact-rule@v1"),
    "alert payload should include impacted rule codes"
  );
  assert(
    alertPayload.changedSources[0]?.impactedChatLogIds.length === 1,
    "alert payload should include impacted chat log ids"
  );
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
  assert(
    capturedBody.changedSources[0]?.impactedRuleCodes.includes("monitor-impact-rule@v1"),
    "sent alert body should include impacted rule codes"
  );

  const failedAlert = await sendKnowledgeMonitorAlert(persisted, {
    actor: "test-monitor",
    trigger: "test",
    fetchImpl: async () => new Response("down", { status: 503, statusText: "Service Unavailable" }),
  });
  assert(failedAlert.sent === false && failedAlert.status === 503, "alert failure should be reported without throwing");
  delete process.env.KNOWLEDGE_MONITOR_ALERT_WEBHOOK_URL;
  delete process.env.KNOWLEDGE_MONITOR_ALERT_SIGNING_SECRET;

  const rejectedSource: OfficialKnowledgeSource = {
    docId: "monitor-rejected-source",
    title: "반복 반려 후보 테스트",
    sourceUrl: "https://www.hikorea.go.kr/rejected-monitor-test",
    sourceType: "official_government",
    topic: "process",
  };
  const rejectedFetchImpl = async () =>
    new Response("<html><body><p>rejected candidate body</p></body></html>", {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  const rejectedRun = await runOfficialKnowledgeSourceMonitor({
    actor: "test-monitor",
    persistCandidates: true,
    sources: [rejectedSource],
    fetchImpl: rejectedFetchImpl,
    now: new Date("2026-07-02T00:10:00.000Z"),
  });
  const rejectedCandidateDocId = rejectedRun.results[0]?.candidateDocId;
  assert(rejectedCandidateDocId, "rejected monitor setup should create a candidate doc id");
  assert(rejectedRun.candidatesCreated === 1, "first rejected monitor setup should create a pending candidate");
  await discardKnowledgeDocument({
    docId: rejectedCandidateDocId,
    actor: "admin-test",
    now: new Date("2026-07-02T00:15:00.000Z"),
  });
  const rejectedRepeat = await runOfficialKnowledgeSourceMonitor({
    actor: "test-monitor",
    persistCandidates: true,
    sources: [rejectedSource],
    fetchImpl: rejectedFetchImpl,
    now: new Date("2026-07-02T00:20:00.000Z"),
  });
  const rejectedAfterRepeat = await db.knowledgeDocument.findUnique({ where: { docId: rejectedCandidateDocId } });
  assert(rejectedRepeat.candidatesCreated === 0, "same rejected candidate content must not reopen as pending");
  assert(rejectedAfterRepeat?.reviewStatus === "REJECTED", "same rejected candidate should remain rejected");

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
    now: new Date("2026-07-02T15:30:00.000Z"),
  });

  const baseAfterApproval = await db.knowledgeDocument.findUnique({ where: { docId: source.docId } });
  assert(baseAfterApproval?.supersededBy === candidateDocId, "approving candidate should supersede previous source doc");

  const afterApproval = await listApprovedKnowledgeDocsForRag(new Date("2026-07-02T16:00:00.000Z"));
  const approvedReplacement = afterApproval.find((doc) => doc.id === source.docId);
  assert(approvedReplacement, "approved candidate should publish under the canonical source doc id");
  assert(!afterApproval.some((doc) => doc.id === candidateDocId), "candidate doc id must not leak into production RAG ids");
  assert(!approvedReplacement.title.ko.includes("검토 후보"), "production RAG title must not expose review-candidate prefix");
  assert(approvedReplacement.ragMeta?.doc_id === source.docId, "production RAG metadata must use canonical doc id");
  assert(approvedReplacement.ragMeta?.last_checked_at === "2026-07-03", "production RAG checked date should use Korea local date");

  console.log("PASS knowledge monitor: official diff, pending candidate, alert webhook, approval supersedes previous RAG");
} finally {
  await db.$disconnect();
  rmSync(tmpDir, { recursive: true, force: true });
}
