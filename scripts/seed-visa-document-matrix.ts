import { Prisma } from "@prisma/client";
import { db } from "../src/lib/db";
import {
  VISA_DOCUMENT_REQUIREMENT_SEEDS,
  matrixCompletenessSummary,
  type VisaDocumentRequirementSeed,
} from "../src/lib/documents/visa-document-matrix";

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function shouldPreserveReview(existing: { checkedBy: string; reviewStatus: string; lastCheckedAt: Date } | null, seed: VisaDocumentRequirementSeed) {
  return Boolean(existing && existing.checkedBy !== seed.checkedBy);
}

export async function seedVisaDocumentMatrix() {
  let created = 0;
  let updated = 0;
  let preservedReview = 0;

  for (const seed of VISA_DOCUMENT_REQUIREMENT_SEEDS) {
    const existing = await db.visaDocumentRequirement.findUnique({
      where: { code: seed.code },
      select: { checkedBy: true, reviewStatus: true, lastCheckedAt: true },
    });
    const preserveReview = shouldPreserveReview(existing, seed);
    if (preserveReview) preservedReview++;

    const data = {
      visaType: seed.visaType,
      stayAction: seed.stayAction,
      applicantContext: seed.applicantContext,
      documentType: seed.documentType,
      labelKo: seed.labelKo,
      labelEn: seed.labelEn,
      required: seed.required,
      validityDays: seed.validityDays,
      issuer: seed.issuer,
      requiredFields: jsonValue(seed.requiredFields),
      validationRules: jsonValue(seed.validationRules),
      sourceRefs: jsonValue(seed.sourceRefs),
      sourceUrl: seed.sourceUrl,
      sourceType: seed.sourceType,
      notes: seed.notes || null,
      ...(preserveReview
        ? {}
        : {
            lastCheckedAt: new Date(seed.lastCheckedAt),
            checkedBy: seed.checkedBy,
            reviewStatus: seed.reviewStatus,
          }),
    };

    await db.visaDocumentRequirement.upsert({
      where: { code: seed.code },
      update: data,
      create: {
        code: seed.code,
        ...data,
        lastCheckedAt: preserveReview && existing ? existing.lastCheckedAt : new Date(seed.lastCheckedAt),
        checkedBy: preserveReview && existing ? existing.checkedBy : seed.checkedBy,
        reviewStatus: preserveReview && existing ? existing.reviewStatus : seed.reviewStatus,
      },
    });

    if (existing) updated++;
    else created++;
  }

  return {
    ...matrixCompletenessSummary(),
    created,
    updated,
    preservedReview,
  };
}

if (import.meta.main) {
  seedVisaDocumentMatrix()
    .then(async (result) => {
      console.log(
        `[seed-visa-document-matrix] rows=${result.totalRows} created=${result.created} updated=${result.updated} ` +
          `validationRules=${result.validationRuleRows} visaTypes=${result.visaTypes.join(",")} preservedReview=${result.preservedReview}`
      );
      await db.$disconnect();
    })
    .catch(async (err) => {
      console.error(`[seed-visa-document-matrix] ${err instanceof Error ? err.message : String(err)}`);
      await db.$disconnect();
      process.exit(1);
    });
}
