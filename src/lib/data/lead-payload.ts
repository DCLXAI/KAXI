import { z } from "zod";
import { localizedTextArraySchema } from "@/lib/data/localized-text";

// Prisma's DiagnosisLead.age/budget/brokerCost/estimatedCost are all Int
// columns, so every numeric field here is coerced and validated as an
// integer — a decimal like 25.5 must be rejected (400) rather than fail
// later as a 500 at db.create.
export const leadSchema = z.object({
  nickname: z.string().min(1).max(80),
  nationality: z.string().min(1),
  pathKey: z.string().min(1),
  age: z.coerce.number().int().min(0).max(150).optional().default(0),
  education: z.string().optional().default(""),
  koreanLevel: z.string().optional().default(""),
  goal: z.string().optional().default(""),
  currentVisa: z.enum(["D-2", "D-4", ""]).optional().default(""),
  budget: z.coerce.number().int().min(0).optional().default(0),
  region: z.string().optional().default(""),
  // NOTE: z.coerce.boolean() is JS-truthiness (Boolean(x)) — the STRING "false"
  // coerces to true. That matches this route's prior Boolean(x) behavior, but do
  // not copy it for fields that receive "true"/"false" strings; parse those
  // explicitly instead.
  usingBroker: z.coerce.boolean().optional().default(false),
  brokerCost: z.coerce.number().int().min(0).optional().default(0),
  hasHistory: z.coerce.boolean().optional().default(false),
  estimatedCost: z.coerce.number().int().min(0).optional().default(0),
  prepTime: z.string().optional().default(""),
  requiredDocs: z.array(z.string()).optional().default([]),
  // These carry the four-locale objects recommendPath() emits, which is what the
  // Prisma column comment has always said (`JSON array of {ko,vi,mn,en}`). They
  // were declared as z.array(z.string()) here, so every completed diagnosis was
  // rejected 400 and the store turned that into a local-only "saved" lead.
  warnings: localizedTextArraySchema.optional().default([]),
  nextActions: localizedTextArraySchema.optional().default([]),
  contact: z.string().max(160).optional(),
  contactType: z.string().optional(),
});

export type LeadWritePayload = z.infer<typeof leadSchema>;
