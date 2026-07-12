import { prepareTestDb } from "./prepare-test-db";

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

async function responseJson(res: Response) {
  const body = await res.json();
  return { ok: res.ok, status: res.status, body };
}

process.env.ADMIN_API_KEY = "test-admin-key";
process.env.KNOWLEDGE_MONITOR_PERSIST_CANDIDATES = "false";
prepareTestDb("admin dashboard");

const { NextRequest } = await import("next/server");
const { db } = await import("../src/lib/db");
const { seedAdminDemo } = await import("./seed-admin-demo");
const { PGVECTOR_EMBEDDING_DIM, PGVECTOR_EMBEDDING_MODEL } = await import("../src/lib/embeddings/pgvector-rag");

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

function vectorLiteral(dim: number): string {
  return `[${Array.from({ length: dim }, (_, index) => (index === 0 ? "1" : "0")).join(",")}]`;
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
  const opsRoute = await import("../src/app/api/admin/ops/route");
  const handoffsRoute = await import("../src/app/api/admin/handoffs/route");

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

  const knowledgeResponse = await knowledgeRoute.GET(adminRequest("/api/admin/knowledge"));
  assert(knowledgeResponse.headers.get("server-timing")?.includes("enrichment;dur="), "admin knowledge should expose server timing");
  const knowledge = await json(knowledgeResponse);
  assert(knowledge.documents.length >= 1, "admin knowledge should list source documents");
  assert(knowledge.pagination?.page === 1, "admin knowledge should return the current page");
  assert(knowledge.pagination?.pageSize === 25, "admin knowledge should use the bounded default page size");
  assert(knowledge.pagination?.total >= knowledge.documents.length, "admin knowledge should return the total document count");
  const pagedKnowledge = await json(
    await knowledgeRoute.GET(adminRequest("/api/admin/knowledge?page=1&pageSize=1"))
  );
  assert(pagedKnowledge.documents.length === 1, "admin knowledge should enforce requested page size");
  assert(pagedKnowledge.pagination.pageSize === 1, "admin knowledge pagination should echo page size");
  assert(typeof pagedKnowledge.documents[0]?.impact?.ruleCount === "number", "paged knowledge should include batch impact data");
  assert(pagedKnowledge.documents[0]?.impact?.users.length === 0, "paged knowledge should return compact impact summaries");
  assert(knowledge.readiness?.candidateApproval, "admin knowledge should expose candidate approval readiness");
  assert(knowledge.readiness?.corpus, "admin knowledge should expose production corpus readiness");
  assert(
    typeof knowledge.readiness.corpus.approvedEmbeddedChunks === "number",
    "admin knowledge corpus readiness should include approved embedded chunk count"
  );
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

    const pausedPersist = await json(
      await knowledgeMonitorRoute.POST(
        adminRequest("/api/knowledge/monitor", {
          method: "POST",
          body: JSON.stringify({ persistCandidates: true, maxSources: 1 }),
        })
      )
    );
    assert(pausedPersist.candidateWritePaused === true, "candidate kill switch should keep admin runs audit-only");
    assert(pausedPersist.candidatesCreated === 0, "paused candidate writes must not create a pending candidate");

    process.env.KNOWLEDGE_MONITOR_PERSIST_CANDIDATES = "true";
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
    const knowledgeWithCandidate = await json(await knowledgeRoute.GET(adminRequest("/api/admin/knowledge")));
    assert(
      knowledgeWithCandidate.readiness.candidateApproval.pendingCandidates >= 1,
      "admin knowledge readiness should count pending candidates"
    );
    assert(
      knowledgeWithCandidate.readiness.candidateApproval.pendingCandidateChunks >= 1,
      "admin knowledge readiness should count pending candidate chunks"
    );
    assert(
      !knowledgeWithCandidate.readiness.candidateApproval.allPendingCandidateChunksEmbedded,
      "admin knowledge readiness should show unembedded candidates before pre-embedding"
    );

    const emptyBulkApproved = await json(
      await knowledgeRoute.PATCH(
        adminRequest("/api/admin/knowledge", {
          method: "PATCH",
          body: JSON.stringify({ action: "bulkApproveCandidates", docIds: [] }),
        })
      )
    );
    assert(emptyBulkApproved.processed === 0, "empty bulk candidate approve should not process all candidates");
    const stillPendingCandidate = await db.knowledgeDocument.findUnique({ where: { docId: candidateDocId } });
    assert(stillPendingCandidate?.reviewStatus === "PENDING", "empty bulk candidate approve must leave candidates pending");

    const singleApproveWithoutReviewer = await responseJson(
      await knowledgeRoute.PATCH(
        adminRequest("/api/admin/knowledge", {
          method: "PATCH",
          body: JSON.stringify({ docId: candidateDocId, action: "approve" }),
        })
      )
    );
    assert(singleApproveWithoutReviewer.status === 400, "single candidate approve should require reviewer identity");

    const singleApproveWithoutEmbedding = await responseJson(
      await knowledgeRoute.PATCH(
        adminRequest("/api/admin/knowledge", {
          method: "PATCH",
          body: JSON.stringify({
            docId: candidateDocId,
            action: "approve",
            checkedBy: "김검수 행정사 12-3456",
            checkedAt: "2026-07-09",
          }),
        })
      )
    );
    assert(singleApproveWithoutEmbedding.status === 409, "single candidate approve should require actual pgvector embeddings");
    assert(
      JSON.stringify(singleApproveWithoutEmbedding.body).includes("pgvector"),
      "single candidate approve should explain missing pgvector embeddings"
    );

    const bulkApproveWithoutReviewer = await responseJson(
      await knowledgeRoute.PATCH(
        adminRequest("/api/admin/knowledge", {
          method: "PATCH",
          body: JSON.stringify({ action: "bulkApproveCandidates", docIds: [candidateDocId] }),
        })
      )
    );
    assert(bulkApproveWithoutReviewer.status === 400, "bulk candidate approve should require reviewer identity");

    const bulkApproveBelowThreshold = await responseJson(
      await knowledgeRoute.PATCH(
        adminRequest("/api/admin/knowledge", {
          method: "PATCH",
          body: JSON.stringify({
            action: "bulkApproveCandidates",
            docIds: [candidateDocId],
            checkedBy: "김검수 행정사 12-3456",
            checkedAt: "2026-07-09",
          }),
        })
      )
    );
    assert(bulkApproveBelowThreshold.status === 409, "bulk candidate approve should reject unsafe approval before promotion");

    const bulkApproveWithoutEmbedding = await responseJson(
      await knowledgeRoute.PATCH(
        adminRequest("/api/admin/knowledge", {
          method: "PATCH",
          body: JSON.stringify({
            action: "bulkApproveCandidates",
            docIds: [candidateDocId],
            checkedBy: "김검수 행정사 12-3456",
            checkedAt: "2026-07-09",
            minApprovedCandidateChunks: 1,
          }),
        })
      )
    );
    assert(bulkApproveWithoutEmbedding.status === 409, "bulk candidate approve should require actual pgvector embeddings");
    assert(
      JSON.stringify(bulkApproveWithoutEmbedding.body).includes("pgvector"),
      "bulk candidate approve should explain missing pgvector embeddings"
    );

    await db.$executeRawUnsafe(
      `UPDATE "KnowledgeChunk"
       SET embedding = $1::vector,
           "embeddingModel" = $2,
           "embeddingDim" = $3
       WHERE "documentId" IN (
         SELECT id FROM "KnowledgeDocument"
         WHERE "docId" = $4
       )`,
      vectorLiteral(PGVECTOR_EMBEDDING_DIM),
      PGVECTOR_EMBEDDING_MODEL,
      PGVECTOR_EMBEDDING_DIM,
      candidateDocId
    );

    const bulkApproveProjectionTooLow = await responseJson(
      await knowledgeRoute.PATCH(
        adminRequest("/api/admin/knowledge", {
          method: "PATCH",
          body: JSON.stringify({
            action: "bulkApproveCandidates",
            docIds: [candidateDocId],
            checkedBy: "김검수 행정사 12-3456",
            checkedAt: "2026-07-09",
            minApprovedCandidateChunks: 1,
          }),
        })
      )
    );
    assert(bulkApproveProjectionTooLow.status === 409, "bulk candidate approve should enforce projected approved corpus threshold");
    assert(
      JSON.stringify(bulkApproveProjectionTooLow.body).includes("projection"),
      "bulk candidate approve should explain projected corpus threshold failure"
    );

    const bulkApproved = await json(
      await knowledgeRoute.PATCH(
        adminRequest("/api/admin/knowledge", {
          method: "PATCH",
          body: JSON.stringify({
            action: "bulkApproveCandidates",
            docIds: [candidateDocId],
            checkedBy: "김검수 행정사 12-3456",
            checkedAt: "2026-07-09",
            minApprovedCandidateChunks: 1,
            minProjectedApprovedChunks: 1,
          }),
        })
      )
    );
    assert(bulkApproved.processed === 1, "bulk candidate approve should process one candidate");
    assert(bulkApproved.failed === 0, "bulk candidate approve should not fail");
    assert(bulkApproved.readiness?.projection?.ok, "bulk candidate approve should return pre-approval projection readiness");
    assert(bulkApproved.readiness?.corpus?.ok, "bulk candidate approve should return post-approval corpus readiness");
    const approvedCandidate = await db.knowledgeDocument.findUnique({ where: { docId: candidateDocId } });
    assert(approvedCandidate?.reviewStatus === "APPROVED", "bulk candidate approve should mark candidate APPROVED");
    assert(approvedCandidate?.checkedBy === "김검수 행정사 12-3456", "bulk candidate approve should persist legal reviewer identity");
    const bulkApproveAudit = await db.adminAuditLog.findFirst({
      where: { action: "knowledge.bulk_approve_candidates", targetType: "knowledgeDocument" },
      orderBy: { createdAt: "desc" },
    });
    assert(bulkApproveAudit, "bulk candidate approve should write an admin audit log");
    const bulkApproveAuditMetadata = JSON.parse(bulkApproveAudit.metadata || "{}") as Record<string, unknown>;
    assert(bulkApproveAuditMetadata.docIdCount === 1, "bulk candidate approve audit should record target doc count");
    assert(Array.isArray(bulkApproveAuditMetadata.docIdsSample), "bulk candidate approve audit should store a bounded doc id sample");
    assert(!("docIds" in bulkApproveAuditMetadata), "bulk candidate approve audit should avoid unbounded doc id arrays");
    assert(
      (bulkApproveAuditMetadata.projection as { projectedApprovedEmbeddedChunks?: number } | null)?.projectedApprovedEmbeddedChunks ===
        bulkApproved.readiness.projection.projectedApprovedEmbeddedChunks,
      "bulk candidate approve audit should record projection evidence"
    );
    assert(
      (bulkApproveAuditMetadata.postApprovalCorpus as { approvedEmbeddedChunks?: number } | null)?.approvedEmbeddedChunks ===
        bulkApproved.readiness.corpus.approvedEmbeddedChunks,
      "bulk candidate approve audit should record post-approval corpus evidence"
    );

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
          body: JSON.stringify({ action: "bulkDiscardCandidates", allPendingCandidates: true }),
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

  const ops = await json(await opsRoute.GET(adminRequest("/api/admin/ops")));
  assert(ops.aiBackend.agent.backend, "admin ops should expose agent backend diagnostics");
  assert(Array.isArray(ops.aiBackend.agent.decisionTable), "admin ops should expose agent decision table");
  assert(Array.isArray(ops.aiBackend.consult.decisionTable), "admin ops should expose consult decision table");
  assert(ops.readiness.aiBackendPolicyCheck, "admin ops should expose readiness ai backend policy check");
  assert(Array.isArray(ops.readiness.checks), "admin ops should expose readiness checks");
  assert(Array.isArray(ops.openEvents), "admin ops should expose open operations events");
  const invalidOpsAck = await responseJson(
    await opsRoute.PATCH(
      adminRequest("/api/admin/ops", {
        method: "PATCH",
        body: JSON.stringify({ eventId: "not-a-uuid" }),
      })
    )
  );
  assert(invalidOpsAck.status === 400, "admin ops acknowledgement should reject invalid event ids");
  const serializedOps = JSON.stringify(ops);
  for (const secret of ["test-admin-key", process.env.ADMIN_API_KEY]) {
    assert(!serializedOps.includes(String(secret)), "admin ops diagnostics must not leak admin secrets");
  }
  const opsAudit = await db.adminAuditLog.findFirst({
    where: { action: "admin.ops.read", targetType: "AdminOps", targetId: "ai.backend_policy" },
    orderBy: { createdAt: "desc" },
  });
  assert(opsAudit, "admin ops diagnostics read should create an audit log");
  assert(opsAudit.actor === "admin-api-key", "admin ops audit should include the admin actor");
  const opsAuditMetadata = JSON.parse(opsAudit.metadata || "{}") as Record<string, unknown>;
  assert(
    opsAuditMetadata.agentBackend === ops.aiBackend.agent.backend,
    "admin ops audit should record selected agent backend"
  );
  assert(
    opsAuditMetadata.consultBackend === ops.aiBackend.consult.backend,
    "admin ops audit should record selected consult backend"
  );
  const serializedOpsAudit = JSON.stringify(opsAuditMetadata);
  for (const secret of ["test-admin-key", process.env.ADMIN_API_KEY]) {
    assert(!serializedOpsAudit.includes(String(secret)), "admin ops audit metadata must not leak admin secrets");
  }

  const handoffs = await json(await handoffsRoute.GET(adminRequest("/api/admin/handoffs")));
  assert(Array.isArray(handoffs.tasks), "admin handoffs should expose a task list");
  assert(Array.isArray(handoffs.assignees), "admin handoffs should expose validated partner assignees");
  assert(typeof handoffs.counts.active === "number", "admin handoffs should expose queue counts");
  assert(typeof handoffs.counts.overdue === "number", "admin handoffs should expose overdue SLA counts");
  assert(typeof handoffs.counts.noContext === "number", "admin handoffs should expose no-context review counts");
  assert(typeof handoffs.counts.lowConfidence === "number", "admin handoffs should expose low-confidence review counts");
  assert(typeof handoffs.counts.pendingEvaluation === "number", "admin handoffs should expose pending evaluation counts");
  const invalidHandoffAction = await responseJson(
    await handoffsRoute.PATCH(
      adminRequest("/api/admin/handoffs", {
        method: "PATCH",
        body: JSON.stringify({ id: "not-a-number", action: "start" }),
      })
    )
  );
  assert(invalidHandoffAction.status === 400, "admin handoff updates should reject invalid task ids");

  console.log("PASS admin dashboard API: cases, actions, rules, knowledge, audit, ops, handoffs");
} finally {
  delete process.env.KNOWLEDGE_MONITOR_PERSIST_CANDIDATES;
  await db.$disconnect();
}
