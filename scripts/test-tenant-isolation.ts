import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { prepareTestDb } from "./prepare-test-db";

prepareTestDb("tenant isolation");
process.env.NODE_ENV = "test";
process.env.DATA_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.PII_HASH_SECRET = "tenant-isolation-hash-secret-with-sufficient-length";

const { db } = await import("../src/lib/db");
const {
  assertTenantContext,
  signTenantClaim,
  tenantContextFromOrganizationAssignment,
  tenantContextFromVerifiedChannelPayload,
  verifyTenantClaim,
} = await import("../src/application/tenancy/tenant-context");
const { persistAtomicChatTurn } = await import("../src/infrastructure/chat/prisma-chat-unit-of-work");
const {
  buildTenantExportManifest,
  findTenantAttachment,
  findTenantCase,
  findTenantHandoff,
  findTenantMessage,
  purgeExpiredTenantData,
} = await import("../src/infrastructure/tenancy/tenant-repository");
const { collectTenantWriteEvidence } = await import("../src/infrastructure/tenancy/tenant-write-evidence");

const tenantAId = "partner_alpha";
const tenantBId = "partner_beta";
await db.tenant.createMany({
  data: [
    { id: tenantAId, slug: "partner-alpha", name: "Partner Alpha", retentionDays: 30 },
    { id: tenantBId, slug: "partner-beta", name: "Partner Beta", retentionDays: 60 },
  ],
});
await db.organization.createMany({
  data: [
    { id: "org_alpha", tenantId: tenantAId, name: "Alpha Office", type: "PARTNER_AGENT_OFFICE" },
    { id: "org_beta", tenantId: tenantBId, name: "Beta Office", type: "PARTNER_AGENT_OFFICE" },
  ],
});

const tenantA = tenantContextFromOrganizationAssignment({
  tenantId: tenantAId,
  userId: "agent_alpha",
  organizationId: "org_alpha",
});
const tenantB = tenantContextFromOrganizationAssignment({
  tenantId: tenantBId,
  userId: "agent_beta",
  organizationId: "org_beta",
});

assert.throws(
  () => assertTenantContext({ tenantId: tenantAId, principalId: "forged" }),
  /TENANT_CONTEXT_REQUIRED/,
  "plain request data must not be accepted as a trusted TenantContext",
);
assert.throws(
  () => tenantContextFromVerifiedChannelPayload({
    tenantId: tenantAId,
    purpose: "typebot-runtime",
    nonce: crypto.randomUUID(),
    verified: false as true,
  }),
  /SIGNED_TENANT_CLAIM_INVALID/,
  "an unverified body tenant must be rejected",
);

const workerClaim = signTenantClaim(tenantA, {
  audience: "worker",
  subject: "worker-job:test:same-key",
  now: Date.now(),
}, process.env);
assert.equal(
  verifyTenantClaim(workerClaim, { audience: "worker", subject: "worker-job:test:same-key" }, process.env).tenantId,
  tenantAId,
);
assert.throws(
  () => verifyTenantClaim(workerClaim, { audience: "n8n" }, process.env),
  /SIGNED_TENANT_CLAIM_INVALID/,
  "a Worker claim must not be replayable as an n8n claim",
);

function turn(tenantContext: typeof tenantA, answer: string) {
  return {
    requestId: crypto.randomUUID(),
    idempotencyKey: "same-logical-idempotency-key",
    traceId: `trace-${crypto.randomUUID()}`,
    sessionKey: "same-external-session-key",
    tenantContext,
    locale: "ko",
    source: "typebot",
    question: "D-4 체류 연장 서류를 알려주세요.",
    answer,
    riskLevel: "medium",
    needsHuman: true,
    leadStage: "review",
    provenance: {
      workflowId: "tenant-isolation-test",
      workflowVersionId: "tenant-isolation-test@v1",
      modelVersion: "fixture",
      promptVersion: "fixture@v1",
    },
    sources: [{ id: "official-source" }],
    searchMeta: { type: "hybrid", category: "visa", retrievedCount: 1, topScore: 0.9 },
  };
}

const resultA = await persistAtomicChatTurn(turn(tenantA, "Alpha answer"));
const resultB = await persistAtomicChatTurn(turn(tenantB, "Beta answer"));
assert.notEqual(resultA.id, resultB.id, "the same idempotency key must be independent across tenants");
assert.equal(await db.chatMessage.count({ where: { idempotencyKey: "same-logical-idempotency-key" } }), 2);
assert.equal((await findTenantMessage(tenantA, resultA.id))?.answer, "Alpha answer");
assert.equal(await findTenantMessage(tenantB, resultA.id), null, "a guessed message id must not cross tenants");
assert.equal(await findTenantHandoff(tenantB, resultA.handoffTaskId!), null, "a guessed handoff id must not cross tenants");

const attachment = await db.chatAttachment.create({
  data: {
    tenantId: tenantAId,
    sessionKey: "same-external-session-key",
    bucket: "tenant-private",
    storageKey: `tenant-alpha/${crypto.randomUUID()}.pdf`,
    originalName: "alpha.pdf",
    mimeType: "application/pdf",
    sizeBytes: 128,
    sha256: "a".repeat(64),
  },
});
assert.equal(await findTenantAttachment(tenantB, attachment.id), null, "a guessed attachment id must not cross tenants");

const student = await db.user.create({
  data: { id: "tenant_case_student", role: "STUDENT", email: "tenant-case@student.example" },
});
const profile = await db.studentProfile.create({
  data: { id: "tenant_case_profile", userId: student.id, nationality: "VN" },
});
const tenantCase = await db.escalationCase.create({
  data: {
    id: "tenant_alpha_case",
    organizationId: "org_alpha",
    studentProfileId: profile.id,
    category: "visa",
    summary: "Alpha scoped case",
  },
});
assert.equal((await findTenantCase(tenantA, tenantCase.id))?.id, tenantCase.id);
assert.equal(await findTenantCase(tenantB, tenantCase.id), null, "a guessed case id must not cross tenants");

const exportA = await buildTenantExportManifest(tenantA);
const exportB = await buildTenantExportManifest(tenantB);
assert(exportA.messageIds.includes(resultA.id.toString()) && !exportA.messageIds.includes(resultB.id.toString()));
assert(exportB.messageIds.includes(resultB.id.toString()) && !exportB.messageIds.includes(resultA.id.toString()));
assert.equal(exportA.tenant.retentionDays, 30);
assert.equal(exportB.tenant.retentionDays, 60);

const expiredAt = new Date(Date.now() - 60_000);
await db.chatSession.update({
  where: { tenantId_sessionKey: { tenantId: tenantAId, sessionKey: "same-external-session-key" } },
  data: { retentionUntil: expiredAt },
});
await db.chatSession.update({
  where: { tenantId_sessionKey: { tenantId: tenantBId, sessionKey: "same-external-session-key" } },
  data: { retentionUntil: new Date(Date.now() + 60_000) },
});
const purge = await purgeExpiredTenantData(tenantA, { now: new Date() });
assert.equal(purge.sessionsDeleted, 1);
assert.equal(await findTenantMessage(tenantA, resultA.id), null);
assert.equal((await findTenantMessage(tenantB, resultB.id))?.answer, "Beta answer");

await db.$executeRawUnsafe(`DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kaxi_tenant_test_role') THEN
    CREATE ROLE kaxi_tenant_test_role NOLOGIN NOBYPASSRLS;
  END IF;
END $$`);
await db.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO kaxi_tenant_test_role`);
await db.$executeRawUnsafe(`GRANT SELECT ON public.chat_messages TO kaxi_tenant_test_role`);
const rlsCounts = await db.$transaction(async (tx) => {
  await tx.$executeRawUnsafe(`SET LOCAL ROLE kaxi_tenant_test_role`);
  await tx.$executeRaw`SELECT set_config('request.jwt.claim.tenant_id', ${tenantBId}, true)`;
  return tx.$queryRaw<Array<{ tenant_id: string; count: bigint }>>`
    SELECT tenant_id, count(*) FROM public.chat_messages GROUP BY tenant_id
  `;
});
assert.deepEqual(rlsCounts.map((row) => row.tenant_id), [tenantBId], "RLS must expose only the claimed tenant");

const writeEvidence = await collectTenantWriteEvidence(new Date(Date.now() - 60 * 60_000));
assert.equal(writeEvidence.missingColumns.length, 0);
assert.equal(writeEvidence.unsafeColumns.length, 0);
assert.equal(writeEvidence.legacyDefaultRows, 0);
assert(writeEvidence.observedWrites > 0, "tenant evidence must include an active write window");
for (const productionScript of ["scripts/check-openai-rag-cutover.ts", "scripts/run-rag-evaluation.ts"]) {
  const source = readFileSync(productionScript, "utf8");
  assert.doesNotMatch(
    source,
    /tenant(?:_id|Id)\s*:\s*["']default["']/,
    `${productionScript} must run against the explicit platform tenant`,
  );
}

console.log("PASS tenant trust: request bodies and forged contexts cannot establish tenant authority");
console.log("PASS tenant isolation: message, attachment, case and handoff guessed IDs do not cross tenants");
console.log("PASS tenant idempotency: the same logical key works independently in two tenants");
console.log("PASS tenant lifecycle: export, retention and deletion stay tenant-scoped");
console.log("PASS tenant RLS: database policy and repository guards use the same tenant identity");
console.log("PASS tenant write evidence: all tenant columns are explicit and legacy/default writes are zero");
console.log("PASS production RAG gates: explicit platform tenant replaces the legacy default");

await db.$disconnect();
