import { createHash } from "crypto";
import { DocumentStatus, Prisma, ReviewStatus } from "@prisma/client";
import { db } from "../src/lib/db";
import { seedComplianceRules } from "./seed-compliance-rules";
import { evaluateVisaRulesFromDb } from "../src/lib/rules/visa-rule-engine";

const ORG_ID = "org_kaxi_demo_agent_office";
const STUDENTS = [
  {
    userId: "user_demo_student_new",
    profileId: "profile_demo_student_new",
    email: "new.case@student.example",
    nationality: "VN",
    visaType: "D-2",
    schoolName: "연세대학교",
    programType: "degree",
    caseId: "case_demo_new",
    status: "NEW",
    riskLevel: "MEDIUM",
    category: "D-2 신규 서류 검토",
    summary: "D-2 학위과정 표준입학허가서와 재정능력 증빙 검토 필요",
  },
  {
    userId: "user_demo_student_due",
    profileId: "profile_demo_student_due",
    email: "due.case@student.example",
    nationality: "MN",
    visaType: "D-4",
    schoolName: "서강대학교 한국어교육원",
    programType: "language",
    caseId: "case_demo_due_soon",
    status: "NEW",
    riskLevel: "MEDIUM",
    category: "D-4 접수 마감 임박",
    summary: "D-4 어학연수 접수 마감 전 결핵진단서와 잔고증명 보완 필요",
  },
  {
    userId: "user_demo_student_high",
    profileId: "profile_demo_student_high",
    email: "risk.case@student.example",
    nationality: "CN",
    visaType: "D-2",
    schoolName: "고려대학교",
    programType: "degree",
    caseId: "case_demo_high_risk",
    status: "HIGH_RISK",
    riskLevel: "HIGH",
    category: "거절 이력 고위험",
    summary: "과거 비자 거절 이력이 있어 행정사 직접 상담 필요",
  },
  {
    userId: "user_demo_student_docs",
    profileId: "profile_demo_student_docs",
    email: "docs.case@student.example",
    nationality: "UZ",
    visaType: "D-4",
    schoolName: "건국대학교 언어교육원",
    programType: "language",
    caseId: "case_demo_more_documents",
    status: "NEEDS_MORE_DOCUMENTS",
    riskLevel: "MEDIUM",
    category: "추가서류 요청",
    summary: "학력서류 번역공증본과 최신 은행잔고증명서 추가 요청",
  },
  {
    userId: "user_demo_student_approved",
    profileId: "profile_demo_student_approved",
    email: "approved.case@student.example",
    nationality: "VN",
    visaType: "D-2",
    schoolName: "한양대학교",
    programType: "degree",
    caseId: "case_demo_approved",
    status: "APPROVED",
    riskLevel: "LOW",
    category: "승인 완료",
    summary: "D-2 제출 전 서류 체크리스트 승인 완료",
  },
] as const;

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function futureDate(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function upsertDocument(
  profileId: string,
  userId: string,
  type: string,
  status: DocumentStatus,
  reviewStatus: ReviewStatus,
  index: number
) {
  const fileId = `file_${profileId}_${type}`;
  const expiresAt = type === "financial_proof" ? futureDate(profileId.includes("_due") ? 7 : 60) : null;
  await db.uploadedFile.upsert({
    where: { id: fileId },
    update: {
      originalName: `${type}.pdf`,
      sizeBytes: 480_000 + index * 1000,
      sha256: sha(`${profileId}:${type}`),
      piiClass: "student_visa_document",
    },
    create: {
      id: fileId,
      ownerUserId: userId,
      storageKey: `demo/${profileId}/${type}.pdf`,
      originalName: `${type}.pdf`,
      mimeType: "application/pdf",
      sizeBytes: 480_000 + index * 1000,
      sha256: sha(`${profileId}:${type}`),
      piiClass: "student_visa_document",
    },
  });

  await db.documentItem.upsert({
    where: { id: `doc_${profileId}_${type}` },
    update: {
      status,
      reviewStatus,
      fileId,
      expiresAt,
      reviewNote: reviewStatus === "REJECTED" ? "최신본 재제출 필요" : null,
    },
    create: {
      id: `doc_${profileId}_${type}`,
      studentProfileId: profileId,
      documentType: type,
      required: true,
      status,
      reviewStatus,
      fileId,
      expiresAt,
      reviewNote: reviewStatus === "REJECTED" ? "최신본 재제출 필요" : null,
    },
  });
}

export async function seedAdminDemo() {
  await seedComplianceRules();

  await db.organization.upsert({
    where: { id: ORG_ID },
    update: { name: "KAXI Demo 행정사 사무소", type: "PARTNER_AGENT_OFFICE" },
    create: { id: ORG_ID, name: "KAXI Demo 행정사 사무소", type: "PARTNER_AGENT_OFFICE" },
  });

  await db.agentReview.deleteMany({ where: { escalationCaseId: { in: STUDENTS.map((student) => student.caseId) } } });
  await db.caseTimelineEvent.deleteMany({ where: { escalationCaseId: { in: STUDENTS.map((student) => student.caseId) } } });
  await db.caseDocumentLink.deleteMany({ where: { escalationCaseId: { in: STUDENTS.map((student) => student.caseId) } } });
  await db.auditEvent.deleteMany({ where: { caseId: { in: STUDENTS.map((student) => student.caseId) } } });
  await db.complianceEvaluation.deleteMany({ where: { studentProfileId: { in: STUDENTS.map((student) => student.profileId) } } });
  await db.consent.deleteMany({
    where: {
      userId: { in: STUDENTS.map((student) => student.userId) },
      scope: "THIRD_PARTY_PROVISION",
    },
  });

  for (const [index, student] of STUDENTS.entries()) {
    await db.user.upsert({
      where: { id: student.userId },
      update: {
        organizationId: ORG_ID,
        role: "STUDENT",
        email: student.email,
        locale: "ko",
      },
      create: {
        id: student.userId,
        organizationId: ORG_ID,
        role: "STUDENT",
        email: student.email,
        locale: "ko",
      },
    });

    await db.studentProfile.upsert({
      where: { id: student.profileId },
      update: {
        nationality: student.nationality,
        visaType: student.visaType,
        schoolName: student.schoolName,
        programType: student.programType,
        semesterStatus: index === 4 ? "ready_to_file" : "preparing",
        topikLevel: student.visaType === "D-2" ? 3 : 1,
        visaExpiryDate: futureDate(index === 1 ? 9 : 60),
      },
      create: {
        id: student.profileId,
        userId: student.userId,
        nationality: student.nationality,
        visaType: student.visaType,
        schoolName: student.schoolName,
        programType: student.programType,
        semesterStatus: index === 4 ? "ready_to_file" : "preparing",
        topikLevel: student.visaType === "D-2" ? 3 : 1,
        visaExpiryDate: futureDate(index === 1 ? 9 : 60),
      },
    });

    await db.consent.create({
      data: {
        userId: student.userId,
        scope: "THIRD_PARTY_PROVISION",
        status: "GRANTED",
        version: "phase3-demo",
        locale: "ko",
        evidenceJson: jsonValue({ source: "seed-admin-demo", caseId: student.caseId }),
      },
    });

    await upsertDocument(student.profileId, student.userId, "passport", "UPLOADED", "APPROVED", index);
    await upsertDocument(
      student.profileId,
      student.userId,
      "standard_admission",
      index === 0 ? "NEEDS_REVIEW" : "UPLOADED",
      index === 0 ? "PENDING" : "APPROVED",
      index
    );
    await upsertDocument(
      student.profileId,
      student.userId,
      "financial_proof",
      index === 3 ? "MISSING" : "UPLOADED",
      index === 3 ? "REJECTED" : "PENDING",
      index
    );

    const evaluation = await evaluateVisaRulesFromDb(
      {
        visa_type: student.visaType,
        nationality: student.nationality.toLowerCase(),
        has_refusal_history: student.status === "HIGH_RISK",
      },
      { studentProfileId: student.profileId, persistEvaluation: true }
    );

    await db.escalationCase.upsert({
      where: { id: student.caseId },
      update: {
        organizationId: ORG_ID,
        status: student.status,
        riskLevel: student.riskLevel,
        category: student.category,
        summary: student.summary,
        conversationSummary: `${student.schoolName} ${student.programType} 과정 준비 중. ${student.summary}`,
        ruleSnapshot: jsonValue(evaluation),
        aiDraft: `${student.email} 학생에게 안내할 초안입니다.\n\n${evaluation.documents
          .slice(0, 5)
          .map((doc) => `- ${doc.label}: ${doc.note}`)
          .join("\n")}\n\n이 안내는 2026-07-01에 확인된 Study in Korea / 법무부 출처 기준입니다.`,
        matchedAt: student.status === "APPROVED" ? new Date() : null,
        acceptedAt: student.status === "APPROVED" ? new Date() : null,
        closedAt: student.status === "APPROVED" ? new Date() : null,
        closedReason: student.status === "APPROVED" ? "데모 승인 완료" : null,
      },
      create: {
        id: student.caseId,
        organizationId: ORG_ID,
        studentProfileId: student.profileId,
        status: student.status,
        riskLevel: student.riskLevel,
        category: student.category,
        summary: student.summary,
        conversationSummary: `${student.schoolName} ${student.programType} 과정 준비 중. ${student.summary}`,
        ruleSnapshot: jsonValue(evaluation),
        aiDraft: `${student.email} 학생에게 안내할 초안입니다.\n\n${evaluation.documents
          .slice(0, 5)
          .map((doc) => `- ${doc.label}: ${doc.note}`)
          .join("\n")}\n\n이 안내는 2026-07-01에 확인된 Study in Korea / 법무부 출처 기준입니다.`,
        matchedAt: student.status === "APPROVED" ? new Date() : null,
        acceptedAt: student.status === "APPROVED" ? new Date() : null,
        closedAt: student.status === "APPROVED" ? new Date() : null,
        closedReason: student.status === "APPROVED" ? "데모 승인 완료" : null,
      },
    });

    await db.caseTimelineEvent.create({
      data: {
        escalationCaseId: student.caseId,
        actorRole: "admin",
        eventType: "case.demo_seed",
        message: student.summary,
        metadata: jsonValue({ status: student.status, riskLevel: student.riskLevel }),
      },
    });

    if (student.status === "APPROVED") {
      await db.agentReview.create({
        data: {
          escalationCaseId: student.caseId,
          decision: "APPROVED",
          note: "데모 승인 완료",
          responseDraft: "학생에게 발송 가능한 상태입니다.",
        },
      });
    }

    await db.auditEvent.create({
      data: {
        organizationId: ORG_ID,
        actorRole: "admin",
        action: "case.demo_seed",
        targetType: "case",
        targetId: student.caseId,
        caseId: student.caseId,
        success: true,
        metadata: jsonValue({ status: student.status, riskLevel: student.riskLevel }),
      },
    });
  }

  return { cases: STUDENTS.length };
}

if (import.meta.main) {
  seedAdminDemo()
    .then(async (result) => {
      console.log(`[seed-admin-demo] seeded ${result.cases} demo admin case(s)`);
      await db.$disconnect();
    })
    .catch(async (err) => {
      console.error(`[seed-admin-demo] ${err instanceof Error ? err.message : String(err)}`);
      await db.$disconnect();
      process.exit(1);
    });
}
