import { canWriteRuntimeDatabase, db } from "@/lib/db";
import { parsePositiveInt } from "@/lib/api/security";
import { canPersistPiiValue, preparePiiField, retentionUntil } from "@/lib/privacy/pii";
import type { PartnerRequest } from "@prisma/client";
import {
  ensurePartnerRoutingConsentForLead,
  recordPrivacyProcessingEvent,
  type PartnerRoutingConsentInput,
  type PrivacyAuditContext,
} from "@/lib/privacy/consent";

export interface CreatePartnerRequestInput {
  leadId?: string | null;
  partnerType: string;
  question?: string | null;
  consent?: PartnerRoutingConsentInput | null;
  auditContext?: PrivacyAuditContext;
}

export interface UnpersistedPartnerRequest {
  id: string;
  createdAt: Date;
  leadId: string;
  partnerType: string;
  question: string | null;
  questionCiphertext: string | null;
  questionHash: string | null;
  questionRedacted: boolean;
  retentionUntil: null;
  deleteRequestedAt: null;
  deletedAt: null;
  status: "unpersisted";
  persisted: false;
  reason: string;
}

export type PartnerRequestResult = PartnerRequest | UnpersistedPartnerRequest;

const PARTNER_TYPES = new Set(["admin", "translation", "academy", "admission", "settlement"]);

async function createAnonymousLead() {
  return db.diagnosisLead.create({
    data: {
      nickname: "익명",
      nationality: "unknown",
      age: 0,
      education: "unknown",
      koreanLevel: "unknown",
      goal: "unknown",
      budget: 0,
      region: "unknown",
      pathKey: "unknown",
      estimatedCost: 0,
      prepTime: "",
      requiredDocs: "[]",
      warningsJson: "[]",
      nextActionsJson: "[]",
      retentionUntil: retentionUntil(parsePositiveInt(process.env.PRIVACY_LEAD_RETENTION_DAYS, 365)),
    },
  });
}

export function isUnpersistedPartnerRequest(request: PartnerRequestResult): request is UnpersistedPartnerRequest {
  return "persisted" in request && request.persisted === false;
}

export async function createPartnerRequest(input: CreatePartnerRequestInput): Promise<PartnerRequestResult> {
  const partnerType = String(input.partnerType || "").trim();
  if (!PARTNER_TYPES.has(partnerType)) throw new Error("Invalid partner type");

  const question = input.question ? String(input.question).slice(0, 1000) : null;
  const protectedQuestion = preparePiiField(question, { kind: "text", maxPlainLength: 240 });
  let finalLeadId = input.leadId || "anonymous";

  if (!canWriteRuntimeDatabase() || !canPersistPiiValue(question)) {
    return {
      id: `unpersisted-${Date.now()}`,
      createdAt: new Date(),
      leadId: finalLeadId,
      partnerType,
      question: protectedQuestion.plaintext,
      questionCiphertext: protectedQuestion.ciphertext,
      questionHash: protectedQuestion.hash,
      questionRedacted: protectedQuestion.redacted,
      retentionUntil: null,
      deleteRequestedAt: null,
      deletedAt: null,
      status: "unpersisted",
      persisted: false,
      reason: !canWriteRuntimeDatabase()
        ? "Writable production database is not configured"
        : "PII encryption is required before storing partner questions in production",
    };
  }

  if (finalLeadId === "anonymous" || finalLeadId.startsWith("local-")) {
    const lead = await createAnonymousLead();
    finalLeadId = lead.id;
  }

  const context = input.auditContext || {
    actor: "public-user",
    actorRole: "user",
  };
  const consentSnapshot = await ensurePartnerRoutingConsentForLead({
    leadId: finalLeadId,
    partnerType,
    consent: input.consent || null,
    context,
  });

  const request = await db.partnerRequest.create({
    data: {
      leadId: finalLeadId,
      partnerType,
      question: protectedQuestion.plaintext,
      questionCiphertext: protectedQuestion.ciphertext,
      questionHash: protectedQuestion.hash,
      questionRedacted: protectedQuestion.redacted,
      retentionUntil: retentionUntil(parsePositiveInt(process.env.PRIVACY_PARTNER_REQUEST_RETENTION_DAYS, 180)),
    },
  });

  await recordPrivacyProcessingEvent({
    action: "partner.routing.created",
    targetType: "PartnerRequest",
    targetId: request.id,
    actorUserId: consentSnapshot.userId,
    context,
    metadata: {
      leadId: finalLeadId,
      partnerType,
      consentUserId: consentSnapshot.userId,
      consentScopes: consentSnapshot.scopes,
      consentGrantedNow: consentSnapshot.grantedNow,
      consentVersion: consentSnapshot.version,
      retentionUntil: request.retentionUntil?.toISOString() || null,
      questionRedacted: request.questionRedacted,
      questionHashStored: Boolean(request.questionHash),
    },
  });

  return request;
}
