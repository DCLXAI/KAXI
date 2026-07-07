import { prepareTestDb } from "./prepare-test-db";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

async function expectCaseError(operation: Promise<unknown>, code: string) {
  try {
    await operation;
  } catch (err) {
    const actual = err && typeof err === "object" && "code" in err ? String(err.code) : "";
    assert(actual === code, `expected ${code}, got ${actual || String(err)}`);
    return;
  }
  fail(`expected ${code} error`);
}

process.env.ADMIN_API_KEY = "test-admin-key";
prepareTestDb("case pipeline");

const { NextRequest } = await import("next/server");
const { db } = await import("../src/lib/db");
const actionRoute = await import("../src/app/api/admin/cases/[id]/actions/route");
const detailRoute = await import("../src/app/api/admin/cases/[id]/route");
const {
  acceptAssignedCase,
  addCaseComment,
  assignCaseToPartnerOffice,
  closeCase,
  createHighRiskEscalationCase,
  listPartnerCases,
  requestCaseSupplement,
} = await import("../src/lib/cases/repository");
const { maybeCreateHighRiskEscalationCase } = await import("../src/lib/cases/high-risk-hook");

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

async function json(res: Response) {
  const body = await res.json();
  return { ok: res.ok, status: res.status, body };
}

async function seedPartnerOffice(id: string, name: string) {
  const organization = await db.organization.create({
    data: { id, name, type: "PARTNER_AGENT_OFFICE" },
  });
  const user = await db.user.create({
    data: {
      id: `${id}_agent`,
      organizationId: id,
      role: "PARTNER_AGENT",
      email: `${id}@partner.example`,
      locale: "ko",
    },
  });
  return { organization, user };
}

async function seedStudent(id: string, withThirdPartyConsent: boolean) {
  const user = await db.user.create({
    data: {
      id: `user_${id}`,
      role: "STUDENT",
      email: `${id}@student.example`,
      locale: "ko",
    },
  });
  const profile = await db.studentProfile.create({
    data: {
      id: `profile_${id}`,
      userId: user.id,
      nationality: "VN",
      visaType: "D-2",
      schoolName: "Phase 3 Test University",
      programType: "degree",
      semesterStatus: "preparing",
      topikLevel: 2,
    },
  });
  const document = await db.documentItem.create({
    data: {
      id: `doc_${id}_financial`,
      studentProfileId: profile.id,
      documentType: "financial_proof",
      required: true,
      status: "MISSING",
      reviewStatus: "PENDING",
    },
  });
  if (withThirdPartyConsent) {
    await db.consent.create({
      data: {
        userId: user.id,
        scope: "THIRD_PARTY_PROVISION",
        status: "GRANTED",
        version: "phase3-test",
        locale: "ko",
        evidenceJson: { source: "test-case-pipeline" },
      },
    });
  }
  return { user, profile, document };
}

try {
  const partnerA = await seedPartnerOffice("org_phase3_partner_a", "Phase 3 Partner A");
  const partnerB = await seedPartnerOffice("org_phase3_partner_b", "Phase 3 Partner B");
  const consented = await seedStudent("consented", true);
  const unconsented = await seedStudent("unconsented", false);

  const hookCase = await maybeCreateHighRiskEscalationCase({
    studentProfileId: consented.profile.id,
    category: "diagnosis:D-2",
    summary: "진단 고위험 테스트",
    conversationSummary: "거절 이력과 서류 보완 필요",
    ruleSnapshot: { riskLevel: "high" },
    source: "diagnosis",
  });
  assert(hookCase?.status === "HIGH_RISK", "high-risk hook should create HIGH_RISK case");
  const duplicatedHookCase = await maybeCreateHighRiskEscalationCase({
    studentProfileId: consented.profile.id,
    category: "diagnosis:D-2",
    summary: "진단 고위험 테스트",
    source: "diagnosis",
  });
  assert(duplicatedHookCase?.id === hookCase.id, "high-risk hook should reuse matching open case");

  const assign = await json(
    await actionRoute.POST(
      adminRequest(`/api/admin/cases/${hookCase.id}/actions`, {
        method: "POST",
        body: JSON.stringify({
          action: "assign_partner",
          organizationId: partnerA.organization.id,
          assignedUserId: partnerA.user.id,
          note: "파트너 A 배정",
        }),
      }),
      { params: Promise.resolve({ id: hookCase.id }) }
    )
  );
  assert(assign.ok, `assign_partner should succeed: ${JSON.stringify(assign.body)}`);
  assert(assign.body.case.organizationId === partnerA.organization.id, "case should be assigned to partner A");
  assert(assign.body.case.matchedAt, "assignment should set matchedAt");

  const partnerAVisible = await listPartnerCases(partnerA.organization.id);
  assert(partnerAVisible.some((item) => item.id === hookCase.id), "consented assigned case should be visible to partner A");
  const partnerBVisible = await listPartnerCases(partnerB.organization.id);
  assert(!partnerBVisible.some((item) => item.id === hookCase.id), "case should not be visible to unassigned partner B");

  const accept = await json(
    await actionRoute.POST(
      adminRequest(`/api/admin/cases/${hookCase.id}/actions`, {
        method: "POST",
        body: JSON.stringify({
          action: "accept_case",
          organizationId: partnerA.organization.id,
          assignedUserId: partnerA.user.id,
          note: "수임합니다",
        }),
      }),
      { params: Promise.resolve({ id: hookCase.id }) }
    )
  );
  assert(accept.ok, `accept_case should succeed: ${JSON.stringify(accept.body)}`);
  assert(accept.body.case.status === "APPROVED", "accepted case should use APPROVED status");
  assert(accept.body.case.acceptedAt, "acceptance should set acceptedAt");

  const supplement = await json(
    await actionRoute.POST(
      adminRequest(`/api/admin/cases/${hookCase.id}/actions`, {
        method: "POST",
        body: JSON.stringify({
          action: "request_supplement",
          organizationId: partnerA.organization.id,
          documentItemIds: [consented.document.id],
          note: "은행 잔고증명 최신본 보완 요청",
        }),
      }),
      { params: Promise.resolve({ id: hookCase.id }) }
    )
  );
  assert(supplement.ok, `request_supplement should succeed: ${JSON.stringify(supplement.body)}`);
  assert(supplement.body.case.status === "NEEDS_MORE_DOCUMENTS", "supplement should set NEEDS_MORE_DOCUMENTS");

  const comment = await json(
    await actionRoute.POST(
      adminRequest(`/api/admin/cases/${hookCase.id}/actions`, {
        method: "POST",
        body: JSON.stringify({
          action: "add_comment",
          organizationId: partnerA.organization.id,
          note: "학생에게 최신 잔고증명 발급일 확인 요청",
        }),
      }),
      { params: Promise.resolve({ id: hookCase.id }) }
    )
  );
  assert(comment.ok, `add_comment should succeed: ${JSON.stringify(comment.body)}`);

  const reaccept = await acceptAssignedCase({
    caseId: hookCase.id,
    organizationId: partnerA.organization.id,
    reviewerUserId: partnerA.user.id,
    note: "보완 후 재수임 상태 확인",
  });
  assert(reaccept.case.status === "APPROVED", "case can be returned to accepted state after supplement");

  const closed = await json(
    await actionRoute.POST(
      adminRequest(`/api/admin/cases/${hookCase.id}/actions`, {
        method: "POST",
        body: JSON.stringify({
          action: "close_case",
          organizationId: partnerA.organization.id,
          note: "서류 확인 완료 후 종결",
        }),
      }),
      { params: Promise.resolve({ id: hookCase.id }) }
    )
  );
  assert(closed.ok, `close_case should succeed: ${JSON.stringify(closed.body)}`);
  assert(closed.body.case.status === "CLOSED", "close should set CLOSED status");
  assert(closed.body.case.closedAt, "closure should set closedAt");

  const detail = await json(
    await detailRoute.GET(adminRequest(`/api/admin/cases/${hookCase.id}`), {
      params: Promise.resolve({ id: hookCase.id }),
    })
  );
  assert(detail.ok, `case detail should load: ${JSON.stringify(detail.body)}`);
  assert(detail.body.case.caseDocumentLinks.length === 1, "case detail should include linked supplement document");
  assert(
    detail.body.case.timelineEvents.some((event: { eventType: string }) => event.eventType === "case.closed"),
    "case detail should include lifecycle timeline"
  );

  const auditActions = await db.auditEvent.findMany({
    where: { caseId: hookCase.id },
    select: { action: true },
  });
  const auditActionSet = new Set(auditActions.map((item) => item.action));
  for (const action of [
    "case.created",
    "case.assigned",
    "case.accepted",
    "case.documents_requested",
    "case.comment_added",
    "case.closed",
  ]) {
    assert(auditActionSet.has(action), `missing AuditEvent ${action}`);
  }

  const unconsentedCase = await createHighRiskEscalationCase({
    studentProfileId: unconsented.profile.id,
    category: "diagnosis:D-2",
    summary: "동의 없는 케이스",
    actor: { actorRole: "test" },
  });
  await assignCaseToPartnerOffice({
    caseId: unconsentedCase.case.id,
    organizationId: partnerA.organization.id,
    assignedUserId: partnerA.user.id,
  });
  const visibleAfterNoConsent = await listPartnerCases(partnerA.organization.id);
  assert(
    !visibleAfterNoConsent.some((item) => item.id === unconsentedCase.case.id),
    "case without third-party consent must not be visible to partner"
  );
  await expectCaseError(
    acceptAssignedCase({
      caseId: unconsentedCase.case.id,
      organizationId: partnerA.organization.id,
      reviewerUserId: partnerA.user.id,
    }),
    "third_party_consent_required"
  );

  const scopedCase = await createHighRiskEscalationCase({
    studentProfileId: consented.profile.id,
    category: "agent:high-risk",
    summary: "조직 스코프 테스트",
    actor: { actorRole: "test" },
  });
  await assignCaseToPartnerOffice({
    caseId: scopedCase.case.id,
    organizationId: partnerA.organization.id,
    assignedUserId: partnerA.user.id,
  });
  await expectCaseError(
    acceptAssignedCase({
      caseId: scopedCase.case.id,
      organizationId: partnerB.organization.id,
      reviewerUserId: partnerB.user.id,
    }),
    "case_scope_forbidden"
  );
  await expectCaseError(
    closeCase({
      caseId: scopedCase.case.id,
      organizationId: partnerA.organization.id,
      reason: "수임 전 종결 시도",
    }),
    "case_not_accepted"
  );

  await requestCaseSupplement({
    caseId: scopedCase.case.id,
    organizationId: partnerA.organization.id,
    documentItemIds: [consented.document.id],
    note: "리포지토리 보완 요청",
  });
  await addCaseComment({
    caseId: scopedCase.case.id,
    organizationId: partnerA.organization.id,
    message: "리포지토리 코멘트",
  });
  const scopedTimeline = await db.caseTimelineEvent.findMany({ where: { escalationCaseId: scopedCase.case.id } });
  assert(scopedTimeline.length >= 4, "repository transitions should write timeline events");

  console.log("PASS case pipeline: lifecycle, consent gating, organization scope, document links, and audits verified");
} finally {
  await db.$disconnect();
}
