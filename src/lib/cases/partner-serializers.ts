import type { Prisma } from "@prisma/client";

export type PartnerCasePayload = Prisma.EscalationCaseGetPayload<{
  include: {
    studentProfile: { include: { user: true; documents: { include: { file: true } } } };
    reviews: true;
    timelineEvents: true;
    documentLinks: { include: { documentItem: { include: { file: true } } } };
  };
}>;

function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export function toPartnerCaseListItem(caseItem: PartnerCasePayload) {
  return {
    id: caseItem.id,
    status: caseItem.status,
    riskLevel: caseItem.riskLevel,
    category: caseItem.category,
    summary: caseItem.summary,
    studentName:
      caseItem.studentProfile.user.email || caseItem.studentProfile.user.phone || caseItem.studentProfile.id,
    nationality: caseItem.studentProfile.nationality,
    visaType: caseItem.studentProfile.visaType,
    schoolName: caseItem.studentProfile.schoolName,
    matchedAt: iso(caseItem.matchedAt),
    acceptedAt: iso(caseItem.acceptedAt),
    closedAt: iso(caseItem.closedAt),
    updatedAt: caseItem.updatedAt.toISOString(),
  };
}

export function toPartnerCaseDetail(caseItem: PartnerCasePayload) {
  return {
    ...toPartnerCaseListItem(caseItem),
    conversationSummary: caseItem.conversationSummary,
    aiDraft: caseItem.aiDraft,
    closedReason: caseItem.closedReason,
    documents: caseItem.studentProfile.documents.map((doc) => ({
      id: doc.id,
      documentType: doc.documentType,
      required: doc.required,
      status: doc.status,
      reviewStatus: doc.reviewStatus,
      reviewNote: doc.reviewNote,
      expiresAt: iso(doc.expiresAt),
      fileName: doc.file?.originalName || null,
    })),
    caseDocumentLinks: caseItem.documentLinks.map((link) => ({
      id: link.id,
      documentItemId: link.documentItemId,
      documentType: link.documentItem.documentType,
      purpose: link.purpose,
      requested: link.requested,
      note: link.note,
      createdAt: link.createdAt.toISOString(),
    })),
    reviews: caseItem.reviews.map((review) => ({
      id: review.id,
      decision: review.decision,
      note: review.note,
      reviewedAt: review.reviewedAt.toISOString(),
    })),
    timelineEvents: caseItem.timelineEvents.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      message: event.message,
      actorRole: event.actorRole,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}
