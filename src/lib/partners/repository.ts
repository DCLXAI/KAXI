import { db } from "@/lib/db";
import { parsePositiveInt } from "@/lib/api/security";
import { preparePiiField, retentionUntil } from "@/lib/privacy/pii";

export interface CreatePartnerRequestInput {
  leadId?: string | null;
  partnerType: string;
  question?: string | null;
}

const PARTNER_TYPES = new Set(["admin", "translation", "academy", "admission", "settlement"]);

async function createAnonymousLead() {
  return db.lead.create({
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

export async function createPartnerRequest(input: CreatePartnerRequestInput) {
  const partnerType = String(input.partnerType || "").trim();
  if (!PARTNER_TYPES.has(partnerType)) throw new Error("Invalid partner type");

  const question = input.question ? String(input.question).slice(0, 1000) : null;
  const protectedQuestion = preparePiiField(question, { kind: "text", maxPlainLength: 240 });
  let finalLeadId = input.leadId || "anonymous";

  if (finalLeadId === "anonymous") {
    const lead = await createAnonymousLead();
    finalLeadId = lead.id;
  }

  return db.partnerRequest.create({
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
}
