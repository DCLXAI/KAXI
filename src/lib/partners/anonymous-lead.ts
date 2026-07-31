// createAnonymousLead() in ./repository.ts writes this literal into nationality,
// education, koreanLevel, goal, region and pathKey on the stub DiagnosisLead rows
// it creates. Those rows exist only so a partner request from a visitor with no
// saved diagnosis has something to hang on — nobody answered anything on them.
//
// It lives in its own module because the admin lead inbox has to recognise it and
// that code is a client component: importing repository.ts would drag Prisma, the
// notification queue and the ops alert client into the browser bundle.
export const ANONYMOUS_LEAD_PLACEHOLDER = "unknown";
