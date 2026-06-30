import { readPiiField } from "@/lib/privacy/pii";

type AnyRecord = Record<string, any>;

export interface PiiResponseOptions {
  revealPii?: boolean;
}

function displayPii(
  plaintext: string | null | undefined,
  ciphertext: string | null | undefined,
  options: PiiResponseOptions
): string | null {
  return options.revealPii ? readPiiField(plaintext, ciphertext) : plaintext || null;
}

export function serializePartnerRequestForResponse(
  request: AnyRecord | null | undefined,
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

export function serializeLeadForResponse(
  lead: AnyRecord | null | undefined,
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
      ? partnerRequests.map((request) => serializePartnerRequestForResponse(request, options))
      : partnerRequests,
  };
}
