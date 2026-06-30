import { db } from "@/lib/db";

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
    },
  });
}

export async function createPartnerRequest(input: CreatePartnerRequestInput) {
  const partnerType = String(input.partnerType || "").trim();
  if (!PARTNER_TYPES.has(partnerType)) throw new Error("Invalid partner type");

  const question = input.question ? String(input.question).slice(0, 1000) : null;
  let finalLeadId = input.leadId || "anonymous";

  if (finalLeadId === "anonymous") {
    const lead = await createAnonymousLead();
    finalLeadId = lead.id;
  }

  return db.partnerRequest.create({
    data: {
      leadId: finalLeadId,
      partnerType,
      question,
    },
  });
}
