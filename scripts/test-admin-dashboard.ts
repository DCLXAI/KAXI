import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { prepareLocalDb } from "./prepare-local-db";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

async function json(res: Response) {
  const body = await res.json();
  if (!res.ok) fail(`${res.status}: ${JSON.stringify(body)}`);
  return body;
}

const tmpDir = mkdtempSync(join(tmpdir(), "kaxi-admin-test-"));
process.env.DATABASE_URL = `file:${join(tmpDir, "admin.db")}`;
process.env.ADMIN_API_KEY = "test-admin-key";
process.env.RESTORE_SQLITE_DEMO_DB = "false";
prepareLocalDb(process.env.DATABASE_URL);

const { NextRequest } = await import("next/server");
const { db } = await import("../src/lib/db");
const { seedAdminDemo } = await import("./seed-admin-demo");

function adminRequest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("x-admin-key", "test-admin-key");
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  return new NextRequest(`http://localhost${path}`, {
    method: init.method,
    headers,
    body: init.body || undefined,
  });
}

try {
  await seedAdminDemo();

  const casesRoute = await import("../src/app/api/admin/cases/route");
  const caseRoute = await import("../src/app/api/admin/cases/[id]/route");
  const caseActionRoute = await import("../src/app/api/admin/cases/[id]/actions/route");
  const rulesRoute = await import("../src/app/api/admin/rules/route");
  const knowledgeRoute = await import("../src/app/api/admin/knowledge/route");
  const knowledgeMonitorRoute = await import("../src/app/api/knowledge/monitor/route");
  const auditRoute = await import("../src/app/api/admin/audit/route");

  const caseList = await json(await casesRoute.GET(adminRequest("/api/admin/cases")));
  assert(caseList.counts.total >= 5, `expected at least 5 cases, got ${caseList.counts.total}`);
  assert(caseList.counts.new >= 1, "expected new cases bucket");
  assert(caseList.counts.due_soon >= 1, "expected due soon bucket");
  assert(caseList.counts.high_risk >= 1, "expected high risk bucket");
  assert(caseList.counts.needs_more_documents >= 1, "expected needs_more_documents bucket");
  assert(caseList.counts.approved >= 1, "expected approved bucket");

  const newCase = caseList.cases.find((item: { bucket: string }) => item.bucket === "new") || caseList.cases[0];
  assert(newCase?.id, "expected case list item with id");

  const detail = await json(
    await caseRoute.GET(adminRequest(`/api/admin/cases/${newCase.id}`), {
      params: Promise.resolve({ id: newCase.id }),
    })
  );
  assert(detail.case.student.profileId, "case detail should include student profile");
  assert(detail.case.documents.length >= 3, "case detail should include uploaded documents");
  assert(detail.case.evaluations.length >= 5, "case detail should include rule engine evaluations");
  assert(typeof detail.case.aiDraft === "string", "case detail should include AI draft");

  const actionResult = await json(
    await caseActionRoute.POST(
      adminRequest(`/api/admin/cases/${newCase.id}/actions`, {
        method: "POST",
        body: JSON.stringify({
          action: "request_more_documents",
          note: "테스트 보완 요청",
          responseDraft: detail.case.aiDraft,
        }),
      }),
      { params: Promise.resolve({ id: newCase.id }) }
    )
  );
  assert(actionResult.case.status === "NEEDS_MORE_DOCUMENTS", "case action should update status");

  const rules = await json(await rulesRoute.GET(adminRequest("/api/admin/rules")));
  assert(rules.rules.length >= 5, "admin rules should list seeded compliance rules");
  const versionId = rules.rules[0]?.versions[0]?.id;
  assert(versionId, "admin rules should include versions");
  const rejectedVersion = await json(
    await rulesRoute.PATCH(
      adminRequest("/api/admin/rules", {
        method: "PATCH",
        body: JSON.stringify({ versionId, reviewStatus: "REJECTED" }),
      })
    )
  );
  assert(rejectedVersion.version.reviewStatus === "REJECTED", "rule review status should update to REJECTED");
  const approvedVersion = await json(
    await rulesRoute.PATCH(
      adminRequest("/api/admin/rules", {
        method: "PATCH",
        body: JSON.stringify({ versionId, reviewStatus: "APPROVED" }),
      })
    )
  );
  assert(approvedVersion.version.reviewStatus === "APPROVED", "rule review status should update to APPROVED");

  const knowledge = await json(await knowledgeRoute.GET(adminRequest("/api/admin/knowledge")));
  assert(knowledge.documents.length >= 1, "admin knowledge should list source documents");
  const docId = knowledge.documents[0].docId;
  const approvedDoc = await json(
    await knowledgeRoute.PATCH(
      adminRequest("/api/admin/knowledge", {
        method: "PATCH",
        body: JSON.stringify({ docId, action: "approve" }),
      })
    )
  );
  assert(approvedDoc.document.reviewStatus === "APPROVED", "knowledge approve should persist APPROVED status");
  assert(approvedDoc.document.chunkCount > 0, "knowledge approve should create searchable chunks");
  const diffDoc = await json(
    await knowledgeRoute.PATCH(
      adminRequest("/api/admin/knowledge", {
        method: "PATCH",
        body: JSON.stringify({ docId, action: "diff" }),
      })
    )
  );
  assert(typeof diffDoc.diff.changed === "boolean", "knowledge diff should return change status");
  assert(diffDoc.diff.currentChunkCount > 0, "knowledge diff should inspect existing chunks without mutating approval");

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response("<html><body><h1>출입국 최신 변경 테스트</h1><p>D-10 E-7 정책 변경 후보</p></body></html>", {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    })) as unknown as typeof fetch;
  try {
    const monitorPreview = await json(
      await knowledgeMonitorRoute.POST(
        adminRequest("/api/knowledge/monitor", {
          method: "POST",
          body: JSON.stringify({ persistCandidates: false, maxSources: 1 }),
        })
      )
    );
    assert(monitorPreview.changed === 1, "admin monitor preview should detect source changes");
    assert(monitorPreview.candidatesCreated === 0, "admin monitor preview must not persist candidates");

    const sourceFilteredPreview = await json(
      await knowledgeMonitorRoute.POST(
        adminRequest("/api/knowledge/monitor", {
          method: "POST",
          body: JSON.stringify({
            persistCandidates: false,
            sourceIds: ["hikorea-policy-notice-monitor"],
          }),
        })
      )
    );
    assert(sourceFilteredPreview.total === 1, "admin monitor should support sourceIds batch filtering");
    assert(
      sourceFilteredPreview.results[0]?.docId === "hikorea-policy-notice-monitor",
      "admin monitor sourceIds should select the requested source"
    );

    const monitorPersist = await json(
      await knowledgeMonitorRoute.POST(
        adminRequest("/api/knowledge/monitor", {
          method: "POST",
          body: JSON.stringify({ persistCandidates: true, maxSources: 1 }),
        })
      )
    );
    assert(monitorPersist.changed === 1, "admin monitor persist should detect source changes");
    assert(monitorPersist.candidatesCreated === 1, "admin monitor persist should create a pending candidate");
    const candidateDocId = monitorPersist.results[0]?.candidateDocId;
    assert(candidateDocId, "admin monitor persist should expose candidate doc id");
    const pendingCandidate = await db.knowledgeDocument.findUnique({ where: { docId: candidateDocId } });
    assert(pendingCandidate?.reviewStatus === "PENDING", "admin monitor candidate must stay pending until approval");

    const bulkApproved = await json(
      await knowledgeRoute.PATCH(
        adminRequest("/api/admin/knowledge", {
          method: "PATCH",
          body: JSON.stringify({ action: "bulkApproveCandidates", docIds: [candidateDocId] }),
        })
      )
    );
    assert(bulkApproved.processed === 1, "bulk candidate approve should process one candidate");
    assert(bulkApproved.failed === 0, "bulk candidate approve should not fail");
    const approvedCandidate = await db.knowledgeDocument.findUnique({ where: { docId: candidateDocId } });
    assert(approvedCandidate?.reviewStatus === "APPROVED", "bulk candidate approve should mark candidate APPROVED");

    const discardCandidateDocId = "manual-policy-update__candidate__discard";
    await db.knowledgeDocument.create({
      data: {
        docId: discardCandidateDocId,
        title: "[검토 후보] 폐기 테스트",
        sourceUrl: "https://www.hikorea.go.kr/manual-discard-test",
        sourceType: "official_government",
        language: "ko",
        jurisdiction: "KR",
        topic: "process",
        validFrom: new Date("2026-07-02T00:00:00.000Z"),
        validTo: null,
        lastCheckedAt: new Date("2026-07-02T00:00:00.000Z"),
        checkedBy: "test-monitor",
        reviewStatus: "PENDING",
        supersedes: [],
        supersededBy: null,
        chunks: {
          create: [{ chunkIndex: 0, content: "discard candidate content", contentHash: "discard-candidate-content" }],
        },
      },
    });
    const bulkDiscarded = await json(
      await knowledgeRoute.PATCH(
        adminRequest("/api/admin/knowledge", {
          method: "PATCH",
          body: JSON.stringify({ action: "bulkDiscardCandidates", docIds: [discardCandidateDocId] }),
        })
      )
    );
    assert(bulkDiscarded.processed === 1, "bulk candidate discard should process one candidate");
    const discardedCandidate = await db.knowledgeDocument.findUnique({
      where: { docId: discardCandidateDocId },
      include: { chunks: true },
    });
    assert(discardedCandidate?.reviewStatus === "REJECTED", "bulk candidate discard should mark candidate REJECTED");
    assert(discardedCandidate.chunks.length === 0, "bulk candidate discard should remove searchable chunks");
  } finally {
    globalThis.fetch = originalFetch;
  }

  const audit = await json(await auditRoute.GET(adminRequest(`/api/admin/audit?caseId=${newCase.id}`)));
  assert(
    audit.events.some((event: { action: string }) => event.action === "case.request_more_documents"),
    "case action should be visible in audit events"
  );

  console.log("PASS admin dashboard API: cases, actions, rules, knowledge, audit");
} finally {
  await db.$disconnect();
  rmSync(tmpDir, { recursive: true, force: true });
}
