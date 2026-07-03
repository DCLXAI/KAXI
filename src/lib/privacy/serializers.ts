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
};

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
    ...safeLead
  } = lead;

  return {
    ...safeLead,
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
