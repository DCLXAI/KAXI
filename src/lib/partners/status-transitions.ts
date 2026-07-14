// Admin-facing PartnerRequest status transition allow-map.
//
// `PartnerRequest.status` is a plain string column (see
// prisma/postgres/schema.prisma), not a Prisma enum, so adding "contacted"
// requires no schema migration — only this code-level allow-map plus the
// route that enforces it.

// Statuses an admin may explicitly set via PATCH /api/partner-requests/[id].
// (matched/accepted remain reachable only through the existing
// assignPartnerRequest/updatePartnerRequestStatus flows.)
export const ADMIN_SETTABLE_STATUSES = ["contacted", "closed"] as const;
export type AdminSettablePartnerRequestStatus = (typeof ADMIN_SETTABLE_STATUSES)[number];

// from -> allowed next statuses. Any pair not listed here (including a
// status transitioning to itself, and any unknown status) is rejected.
const ALLOWED_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  pending: ["contacted", "closed"],
  contacted: ["closed"],
  matched: ["closed"],
  accepted: ["closed"],
};

export function canTransitionPartnerRequestStatus(from: string, to: string): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
