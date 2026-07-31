// The partner types a request may be stored with. This is the write-side
// validation set (createPartnerRequest rejects anything else) and it lives in
// its own leaf module so client surfaces can derive from it without pulling in
// repository.ts, which imports Prisma.
//
// The admin inbox previously kept a second hand-written copy for labelling, and
// a partner type missing from that copy renders as a DIFFERENT partner type
// rather than as an unknown one — so the copies must not be allowed to drift.
export const PARTNER_TYPES = new Set(["admin", "translation", "academy", "admission", "settlement"]);
