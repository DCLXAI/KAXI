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
const { slaDefaultMinutes, slaTierForMinutes } = await import("../src/lib/ops/sla-policy");
const actionRoute = await import("../src/app/api/admin/cases/[id]/actions/route");
const detailRoute = await import("../src/app/api/admin/cases/[id]/route");
const partnerRequestPatchRoute = await import("../src/app/api/partner-requests/[id]/route");
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
const {
  assignPartnerRequest,
  listPartnerRequestInbox,
  updatePartnerRequestStatus,
} = await import("../src/lib/partners/assignment");

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

  const diagnosisLead = await db.diagnosisLead.create({
    data: {
      nickname: "퍼널 테스트",
      nationality: "vn",
      age: 22,
      education: "university",
      koreanLevel: "topik2",
      goal: "degree",
      budget: 15_000_000,
      region: "seoul",
      pathKey: "goal_degree",
      estimatedCost: 12_000_000,
      prepTime: "6 months",
      requiredDocs: "[]",
      warningsJson: "[]",
      nextActionsJson: "[]",
    },
  });
  const partnerRequest = await db.partnerRequest.create({
    data: {
      leadId: diagnosisLead.id,
      partnerType: "admin",
      question: "D-2 상담 요청",
      status: "pending",
    },
  });
  const leadConsentUser = await db.user.create({
    data: {
      role: "STUDENT",
      email: "funnel-consent@consent.kaxi.local",
      zaloUid: `lead:${diagnosisLead.id}`,
      locale: "vi",
    },
  });
  await db.consent.createMany({
    data: ["THIRD_PARTY_PROVISION", "PROCESSING_CONSIGNMENT", "OVERSEAS_TRANSFER"].map((scope) => ({
      userId: leadConsentUser.id,
      scope: scope as "THIRD_PARTY_PROVISION" | "PROCESSING_CONSIGNMENT" | "OVERSEAS_TRANSFER",
      status: "GRANTED" as const,
      version: "funnel-test",
      locale: "vi",
    })),
  });
  const matchedRequest = await assignPartnerRequest({
    requestId: partnerRequest.id,
    organizationId: partnerA.organization.id,
    assignedUserId: partnerA.user.id,
    actor: "test-admin",
  });
  assert(matchedRequest.status === "matched", "partner request assignment should set matched status");
  const partnerRequestSlaMinutes = slaDefaultMinutes({ riskLevel: null, leadStage: null });
  assert(
    matchedRequest.slaTier === slaTierForMinutes(partnerRequestSlaMinutes),
    "partner request assignment should set the SLA tier from the shared policy"
  );
  assert(matchedRequest.matchedAt !== null && matchedRequest.slaDueAt !== null, "assignment should set matchedAt and slaDueAt");
  assert(
    Math.abs(matchedRequest.slaDueAt!.getTime() - matchedRequest.matchedAt!.getTime() - partnerRequestSlaMinutes * 60_000) < 5_000,
    "SLA due date should be ~ the policy minutes after matchedAt"
  );
  const partnerInbox = await listPartnerRequestInbox(partnerA.organization.id);
  assert(partnerInbox.some((item) => item.id === partnerRequest.id), "assigned request should appear in partner inbox");
  const acceptedRequest = await updatePartnerRequestStatus({
    requestId: partnerRequest.id,
    organizationId: partnerA.organization.id,
    userId: partnerA.user.id,
    action: "accept",
  });
  assert(acceptedRequest.status === "accepted" && acceptedRequest.acceptedAt, "partner should accept assigned request");
  // FIX 1 regression: slaFirstResponseAt is unreachable for an assigned
  // PartnerRequest unless the partner's own "accept" stamps it (matched ->
  // contacted is not an allowed admin transition, so the admin-PATCH stamp
  // below can never fire for this row) -- every SLA-bearing assigned request
  // would otherwise be guaranteed to breach.
  assert(acceptedRequest.slaFirstResponseAt !== null, "accepting an assigned partner request must stamp slaFirstResponseAt");
  const firstResponseAtFirstPartnerAccept = acceptedRequest.slaFirstResponseAt!.getTime();
  await expectCaseError(
    updatePartnerRequestStatus({
      requestId: partnerRequest.id,
      organizationId: partnerA.organization.id,
      userId: partnerA.user.id,
      action: "accept",
    }),
    "request_transition_conflict",
  );
  const requestAfterConflict = await db.partnerRequest.findUniqueOrThrow({ where: { id: partnerRequest.id } });
  assert(
    requestAfterConflict.slaFirstResponseAt?.getTime() === firstResponseAtFirstPartnerAccept,
    "slaFirstResponseAt must never move once written (write-once within the assignment window)"
  );
  const closedRequest = await updatePartnerRequestStatus({
    requestId: partnerRequest.id,
    organizationId: partnerA.organization.id,
    userId: partnerA.user.id,
    action: "close",
  });
  assert(closedRequest.status === "closed" && closedRequest.closedAt, "partner should close accepted request");

  // FIX 2 regression: reassigning a PartnerRequest to a different office must
  // reset the whole SLA window (slaFirstResponseAt + slaBreachAlertedAt), not
  // just slaDueAt -- otherwise classifySlaItem short-circuits on the stale
  // firstResponseAt from the previous office and a stale slaBreachAlertedAt
  // permanently suppresses the new window's alert.
  const reassignmentLead = await db.diagnosisLead.create({
    data: {
      nickname: "재배정 테스트",
      nationality: "vn",
      age: 23,
      education: "university",
      koreanLevel: "topik2",
      goal: "degree",
      budget: 15_000_000,
      region: "seoul",
      pathKey: "goal_degree",
      estimatedCost: 12_000_000,
      prepTime: "6 months",
      requiredDocs: "[]",
      warningsJson: "[]",
      nextActionsJson: "[]",
    },
  });
  const reassignmentConsentUser = await db.user.create({
    data: {
      role: "STUDENT",
      email: "reassignment-consent@consent.kaxi.local",
      zaloUid: `lead:${reassignmentLead.id}`,
      locale: "vi",
    },
  });
  await db.consent.createMany({
    data: ["THIRD_PARTY_PROVISION", "PROCESSING_CONSIGNMENT", "OVERSEAS_TRANSFER"].map((scope) => ({
      userId: reassignmentConsentUser.id,
      scope: scope as "THIRD_PARTY_PROVISION" | "PROCESSING_CONSIGNMENT" | "OVERSEAS_TRANSFER",
      status: "GRANTED" as const,
      version: "reassignment-test",
      locale: "vi",
    })),
  });
  const reassignmentRequest = await db.partnerRequest.create({
    data: {
      leadId: reassignmentLead.id,
      partnerType: "admin",
      question: "재배정 SLA 초기화 테스트",
      status: "pending",
    },
  });
  const firstAssignment = await assignPartnerRequest({
    requestId: reassignmentRequest.id,
    organizationId: partnerA.organization.id,
    assignedUserId: partnerA.user.id,
    actor: "test-admin",
  });
  const acceptedBeforeReassignment = await updatePartnerRequestStatus({
    requestId: reassignmentRequest.id,
    organizationId: partnerA.organization.id,
    userId: partnerA.user.id,
    action: "accept",
  });
  assert(
    acceptedBeforeReassignment.slaFirstResponseAt !== null,
    "request must have a stamped first response before the reassignment regression check is meaningful"
  );
  await db.partnerRequest.update({
    where: { id: reassignmentRequest.id },
    data: { slaBreachAlertedAt: new Date("2020-01-01T00:00:00.000Z") },
  });
  const reassignment = await assignPartnerRequest({
    requestId: reassignmentRequest.id,
    organizationId: partnerB.organization.id,
    assignedUserId: partnerB.user.id,
    actor: "test-admin",
  });
  assert(reassignment.slaFirstResponseAt === null, "reassigning a partner request must reset slaFirstResponseAt to null for the new window");
  assert(reassignment.slaBreachAlertedAt === null, "reassigning a partner request must reset slaBreachAlertedAt to null for the new window");
  assert(
    reassignment.slaDueAt !== null && reassignment.slaDueAt.getTime() > firstAssignment.slaDueAt!.getTime(),
    "reassignment should move slaDueAt forward to a fresh window"
  );

  // Admin "contacted" transition (distinct from the accept/close flow above,
  // see src/app/api/partner-requests/[id]/route.ts) must set slaFirstResponseAt
  // the first time, and never move it on any later write.
  const contactRequest = await db.partnerRequest.create({
    data: {
      leadId: diagnosisLead.id,
      partnerType: "admin",
      question: "SLA 최초 응답 테스트",
      status: "pending",
    },
  });
  const contactedResult = await json(
    await partnerRequestPatchRoute.PATCH(
      adminRequest(`/api/partner-requests/${contactRequest.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "contacted" }),
      }),
      { params: Promise.resolve({ id: contactRequest.id }) }
    )
  );
  assert(contactedResult.ok, `partner request contacted transition should succeed: ${JSON.stringify(contactedResult.body)}`);
  assert(contactedResult.body.request.slaFirstResponseAt, "contacted transition should set slaFirstResponseAt");

  const sentinelFirstResponse = new Date("2020-01-01T00:00:00.000Z");
  const preRespondedRequest = await db.partnerRequest.create({
    data: {
      leadId: diagnosisLead.id,
      partnerType: "admin",
      question: "SLA 최초 응답 재기록 방지 테스트",
      status: "pending",
      slaFirstResponseAt: sentinelFirstResponse,
    },
  });
  const secondContactedResult = await json(
    await partnerRequestPatchRoute.PATCH(
      adminRequest(`/api/partner-requests/${preRespondedRequest.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "contacted" }),
      }),
      { params: Promise.resolve({ id: preRespondedRequest.id }) }
    )
  );
  assert(
    secondContactedResult.ok,
    `partner request contacted transition should succeed even with a pre-set slaFirstResponseAt: ${JSON.stringify(secondContactedResult.body)}`
  );
  assert(
    new Date(secondContactedResult.body.request.slaFirstResponseAt).getTime() === sentinelFirstResponse.getTime(),
    "contacted transition must never overwrite an existing slaFirstResponseAt"
  );

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
  const escalationCaseSlaMinutes = slaDefaultMinutes({ riskLevel: "high" });
  assert(
    assign.body.case.slaTier === slaTierForMinutes(escalationCaseSlaMinutes),
    "high-risk case assignment should set the urgent-2h SLA tier via the shared policy"
  );
  assert(assign.body.case.slaDueAt, "case assignment should set an SLA due date");
  assert(
    Math.abs(
      new Date(assign.body.case.slaDueAt).getTime()
        - new Date(assign.body.case.matchedAt).getTime()
        - escalationCaseSlaMinutes * 60_000
    ) < 5_000,
    "case SLA due date should be ~ the urgent policy minutes after matchedAt"
  );

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
  assert(accept.body.case.slaFirstResponseAt, "accepting a case should set slaFirstResponseAt");
  const firstResponseAtFirstAccept = accept.body.case.slaFirstResponseAt as string;

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
  assert(
    reaccept.case.slaFirstResponseAt?.toISOString() === firstResponseAtFirstAccept,
    "reaccepting a case must never overwrite an existing slaFirstResponseAt"
  );

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
  const studentNotifications = await db.userNotification.findMany({ where: { userId: consented.user.id } });
  for (const eventPart of ["created", "assigned", "accepted", "supplement", "comment", "closed"]) {
    assert(studentNotifications.some((notification) => notification.eventKey.includes(eventPart)), `missing student ${eventPart} notification`);
  }
  const partnerNotifications = await db.userNotification.findMany({ where: { userId: partnerA.user.id } });
  assert(partnerNotifications.some((notification) => notification.eventKey.includes(`partner-request:${partnerRequest.id}:matched`)), "partner request assignment should notify the partner");
  assert(partnerNotifications.some((notification) => notification.eventKey.includes(`case:${hookCase.id}:assigned`)), "case assignment should notify the partner");

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

  // FIX 2 regression: reassigning an EscalationCase to a different partner
  // office must reset the whole SLA window (slaFirstResponseAt +
  // slaBreachAlertedAt), not just slaDueAt -- otherwise classifySlaItem
  // short-circuits on the stale firstResponseAt from the previous office and
  // a stale slaBreachAlertedAt permanently suppresses the new window's alert.
  const acceptedScopedCase = await acceptAssignedCase({
    caseId: scopedCase.case.id,
    organizationId: partnerA.organization.id,
    reviewerUserId: partnerA.user.id,
    note: "재배정 전 수임",
  });
  assert(
    acceptedScopedCase.case.slaFirstResponseAt !== null,
    "case must have a stamped first response before the reassignment regression check is meaningful"
  );
  const slaDueAtBeforeReassignment = acceptedScopedCase.case.slaDueAt!;
  await db.escalationCase.update({
    where: { id: scopedCase.case.id },
    data: { slaBreachAlertedAt: new Date("2020-01-01T00:00:00.000Z") },
  });
  const reassignedCase = await assignCaseToPartnerOffice({
    caseId: scopedCase.case.id,
    organizationId: partnerB.organization.id,
    assignedUserId: partnerB.user.id,
  });
  assert(reassignedCase.case.slaFirstResponseAt === null, "reassigning a case must reset slaFirstResponseAt to null for the new window");
  assert(reassignedCase.case.slaBreachAlertedAt === null, "reassigning a case must reset slaBreachAlertedAt to null for the new window");
  assert(
    reassignedCase.case.slaDueAt !== null && reassignedCase.case.slaDueAt.getTime() > slaDueAtBeforeReassignment.getTime(),
    "reassignment should move slaDueAt forward to a fresh window"
  );

  console.log("PASS case pipeline: lifecycle, lead routing, notifications, consent gating, organization scope, document links, and audits verified");
} finally {
  await db.$disconnect();
}
