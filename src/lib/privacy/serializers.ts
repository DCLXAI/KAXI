import { readPiiField } from "@/lib/privacy/pii";

export interface PiiResponseOptions {
  revealPii?: boolean;
}

type PartnerRequestResponseRecord = object & {
  question?: string | null;
  questionCiphertext?: string | null;
  questionHash?: unknown;
  lead?: LeadResponseRecord | null;
};

type LeadResponseRecord = object & {
  contact?: string | null;
  contactCiphertext?: string | null;
  contactHash?: unknown;
  partnerRequests?: unknown;
  requiredDocs?: unknown;
  warningsJson?: unknown;
  nextActionsJson?: unknown;
};

// DiagnosisLead keeps the three diagnosis-result fields as JSON *strings*
// (prisma/postgres/schema.prisma), and two of them are stored under a different
// name than the client reads: warningsJson/nextActionsJson vs warnings/
// nextActions. Every lead that leaves the server passes through this file, so
// this is the one boundary that can owe the client the shape `Lead` in
// src/store/kbridge.ts actually declares — an array, under the field name the
// admin modal maps over. Before this decode, requiredDocs arrived as the string
// '["docs_doc_passport",...]', which cleared the `.length > 0` guard and then
// threw on `.map` during render.
function decodeStoredJsonArray(value: unknown, column: string): unknown[] {
  // Locally-built leads (store fallback, fixtures) already hold real arrays.
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // A row we cannot decode must not take the admin inbox down with it.
    console.error(`[serializeLeadForResponse] ${column} is not decodable JSON; serving []`);
    return [];
  }
}

function displayPii(
  plaintext: string | null | undefined,
  ciphertext: string | null | undefined,
  options: PiiResponseOptions
): string | null {
  return options.revealPii ? readPiiField(plaintext, ciphertext) : plaintext || null;
}

export function serializePartnerRequestForResponse<T extends PartnerRequestResponseRecord>(
  request: T | null | undefined,
  options: PiiResponseOptions = {}
) {
  if (!request) return request;
  const {
    questionCiphertext: _questionCiphertext,
    questionHash: _questionHash,
    lead,
    ...safeRequest
  } = request;

  return {
    ...safeRequest,
    question: displayPii(request.question, request.questionCiphertext, options),
    lead: lead ? serializeLeadForResponse(lead, options) : lead,
  };
}

export function serializeLeadForResponse<T extends LeadResponseRecord>(
  lead: T | null | undefined,
  options: PiiResponseOptions = {}
) {
  if (!lead) return lead;
  const {
    contactCiphertext: _contactCiphertext,
    contactHash: _contactHash,
    partnerRequests,
    requiredDocs,
    warningsJson,
    nextActionsJson,
    ...safeLead
  } = lead;

  // A field the caller never selected stays absent rather than being invented
  // as an empty array — partner-request payloads embed partial leads.
  const decoded: { requiredDocs?: unknown[]; warnings?: unknown[]; nextActions?: unknown[] } = {};
  if (requiredDocs !== undefined) decoded.requiredDocs = decodeStoredJsonArray(requiredDocs, "requiredDocs");
  if (warningsJson !== undefined) decoded.warnings = decodeStoredJsonArray(warningsJson, "warningsJson");
  if (nextActionsJson !== undefined) {
    decoded.nextActions = decodeStoredJsonArray(nextActionsJson, "nextActionsJson");
  }

  return {
    ...safeLead,
    ...decoded,
    contact: displayPii(lead.contact, lead.contactCiphertext, options),
    partnerRequests: Array.isArray(partnerRequests)
      ? partnerRequests.map((request) =>
          typeof request === "object" && request
            ? serializePartnerRequestForResponse(request, options)
            : request
        )
      : partnerRequests,
  };
}
