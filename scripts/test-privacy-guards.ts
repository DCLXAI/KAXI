import { NextRequest } from "next/server";
import { canPersistPiiValue, preparePiiField, readPiiField, redactSensitiveText } from "../src/lib/privacy/pii";
import { serializeLeadForResponse, serializePartnerRequestForResponse } from "../src/lib/privacy/serializers";
import { prepareTestDb } from "./prepare-test-db";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

async function testPiiRedactionWithoutKey() {
  delete process.env.DATA_ENCRYPTION_KEY;
  delete process.env.PII_ALLOW_UNENCRYPTED_PLAINTEXT;
  const protectedField = preparePiiField("call me at user@example.com", { kind: "text" });
  if (protectedField.plaintext !== "[redacted-unencrypted]") {
    fail(`unencrypted text leaked: ${protectedField.plaintext}`);
  }
  if (protectedField.ciphertext) fail("ciphertext should not exist without DATA_ENCRYPTION_KEY");
  if (!protectedField.hash || !protectedField.redacted) fail("hash/redacted flags missing");
}

function testPiiRedactionPreservesOfficialSourceDates() {
  const redacted = redactSensitiveText("확인일 2026-07-02, 연락처 +82 10-1234-5678, user@example.com");
  if (!redacted.includes("2026-07-02")) fail(`official source date was redacted: ${redacted}`);
  if (!redacted.includes("[redacted-phone]")) fail(`phone number was not redacted: ${redacted}`);
  if (!redacted.includes("[redacted-email]")) fail(`email was not redacted: ${redacted}`);
}

async function readJson(res: Response) {
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

function apiRequest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  return new NextRequest(`http://localhost${path}`, {
    method: init.method,
    headers,
    body: init.body || undefined,
  });
}

async function createPrivacyLead(leadsRoute: typeof import("../src/app/api/leads/route"), label: string) {
  const res = await readJson(
    await leadsRoute.POST(
      apiRequest("/api/leads", {
        method: "POST",
        body: JSON.stringify({
          nickname: label,
          nationality: "vn",
          age: 22,
          education: "highschool",
          koreanLevel: "none",
          goal: "language",
          budget: 6000000,
          region: "seoul",
          usingBroker: false,
          brokerCost: 0,
          hasHistory: false,
          pathKey: "goal_language",
          estimatedCost: 6000000,
          prepTime: "3 months",
          requiredDocs: ["passport"],
          warnings: [],
          nextActions: [],
          contact: `${label}@example.com`,
          contactType: "email",
        }),
      })
    )
  );
  if (!res.ok) fail(`lead create failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.lead.id as string;
}

async function postPartnerRequest(
  partnersRoute: typeof import("../src/app/api/partner-requests/route"),
  leadId: string,
  consent?: Record<string, unknown>
) {
  return readJson(
    await partnersRoute.POST(
      apiRequest("/api/partner-requests", {
        method: "POST",
        body: JSON.stringify({
          leadId,
          partnerType: "admin",
          question: "D-4 to D-2 transfer consult. email user@example.com",
          ...(consent ? { consent } : {}),
        }),
      })
    )
  );
}

async function testConsentThirdPartyFlow() {
  const snapshot = { ...process.env };
  try {
    Object.assign(process.env, {
      NODE_ENV: "test",
      DATA_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      PII_HASH_SECRET: "privacy-consent-test-secret",
      RATE_LIMIT_BACKEND: "memory",
      PRIVACY_LEAD_RETENTION_DAYS: "365",
      PRIVACY_PARTNER_REQUEST_RETENTION_DAYS: "180",
    });
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    prepareTestDb("privacy consent");

    const leadsRoute = await import("../src/app/api/leads/route");
    const partnersRoute = await import("../src/app/api/partner-requests/route");
    const deleteRoute = await import("../src/app/api/privacy/delete-request/route");
    const { db } = await import("../src/lib/db");
    const { enforcePrivacyRetention } = await import("../src/lib/privacy/retention");

    const leadId = await createPrivacyLead(leadsRoute, "consent-flow");
    const blocked = await postPartnerRequest(partnersRoute, leadId);
    if (blocked.status !== 428 || blocked.body.code !== "CONSENT_REQUIRED") {
      fail(`partner request without consent should be blocked, got ${blocked.status}: ${JSON.stringify(blocked.body)}`);
    }
    const blockedCount = await db.partnerRequest.count({ where: { leadId } });
    if (blockedCount !== 0) fail("blocked partner request should not create PartnerRequest");

    const consent = {
      thirdPartyProvision: true,
      processingConsignment: true,
      overseasTransfer: true,
      version: "partner-routing-2026-07-01",
      locale: "ko",
      source: "privacy-test",
    };
    const allowed = await postPartnerRequest(partnersRoute, leadId, consent);
    if (allowed.status !== 201) fail(`partner request with consent should persist, got ${allowed.status}: ${JSON.stringify(allowed.body)}`);

    const consentUser = await db.user.findUnique({ where: { zaloUid: `lead:${leadId}` } });
    if (!consentUser) fail("lead consent synthetic user should be created");
    const grantedConsents = await db.consent.findMany({
      where: { userId: consentUser.id, status: "GRANTED" },
      orderBy: { scope: "asc" },
    });
    const scopes = grantedConsents.map((item) => String(item.scope)).sort();
    for (const scope of ["OVERSEAS_TRANSFER", "PROCESSING_CONSIGNMENT", "THIRD_PARTY_PROVISION"]) {
      if (!scopes.includes(scope)) fail(`missing granted consent scope: ${scope}`);
    }

    const consentAudit = await db.auditEvent.findFirst({
      where: { action: "privacy.consent.granted", targetId: consentUser.id },
    });
    if (!consentAudit) fail("consent grant should create AuditEvent");
    const routingAudit = await db.auditEvent.findFirst({
      where: { action: "partner.routing.created", targetType: "PartnerRequest" },
    });
    if (!routingAudit) fail("partner routing should create privacy AuditEvent");
    const adminAudit = await db.adminAuditLog.findFirst({
      where: { action: "partner.routing.created" },
    });
    if (!adminAudit) fail("partner routing should mirror to AdminAuditLog");

    const existingConsentAllowed = await postPartnerRequest(partnersRoute, leadId);
    if (existingConsentAllowed.status !== 201) {
      fail(`active stored consent should allow follow-up partner request, got ${existingConsentAllowed.status}`);
    }

    const deleteRes = await readJson(
      await deleteRoute.POST(
        apiRequest("/api/privacy/delete-request", {
          method: "POST",
          body: JSON.stringify({ leadId }),
        })
      )
    );
    if (!deleteRes.ok) fail(`privacy delete request should succeed: ${deleteRes.status}`);
    const withdrawn = await db.consent.count({
      where: { userId: consentUser.id, status: "WITHDRAWN" },
    });
    if (withdrawn < 3) fail(`privacy delete request should withdraw consents, got ${withdrawn}`);

    const retentionLeadId = await createPrivacyLead(leadsRoute, "retention-flow");
    const retentionAllowed = await postPartnerRequest(partnersRoute, retentionLeadId, consent);
    if (retentionAllowed.status !== 201) fail("retention consent setup should persist partner request");
    const retentionUser = await db.user.findUnique({ where: { zaloUid: `lead:${retentionLeadId}` } });
    if (!retentionUser) fail("retention lead consent user missing");
    await db.diagnosisLead.update({
      where: { id: retentionLeadId },
      data: { retentionUntil: new Date(Date.now() - 1000) },
    });

    const canonicalSessionKey = "kaxi-privacy-retention-session";
    const canonicalQuestion = "D-4 상담 결과를 user@example.com으로 보내주세요";
    const protectedCanonicalQuestion = preparePiiField(canonicalQuestion, { kind: "text", maxPlainLength: 1_200 });
    const protectedCanonicalAnswer = preparePiiField("담당자 검토 후 안내드릴게요.", { kind: "text", maxPlainLength: 8_000 });
    await db.chatSession.create({ data: { sessionKey: canonicalSessionKey } });
    const canonicalMessage = await db.chatMessage.create({
      data: {
        sessionKey: canonicalSessionKey,
        question: protectedCanonicalQuestion.plaintext || "",
        questionCiphertext: protectedCanonicalQuestion.ciphertext,
        questionHash: protectedCanonicalQuestion.hash,
        questionRedacted: protectedCanonicalQuestion.redacted,
        answer: protectedCanonicalAnswer.plaintext || "",
        answerCiphertext: protectedCanonicalAnswer.ciphertext,
        answerHash: protectedCanonicalAnswer.hash,
        answerRedacted: protectedCanonicalAnswer.redacted,
      },
    });
    const audit = await db.n8nAuditMessage.create({
      data: {
        requestId: "215b87ff-c1ac-4f8c-a749-2131e23f88b2",
        sourceChatMessageId: canonicalMessage.id,
        sessionKey: canonicalSessionKey,
        question: canonicalQuestion,
        questionHash: protectedCanonicalQuestion.hash,
        answer: "담당자 검토 후 안내드릴게요.",
        answerHash: protectedCanonicalAnswer.hash,
        sourcesJson: JSON.stringify([{ title: "must not be duplicated" }]),
      },
    });
    if (
      audit.question !== "[canonical-chat-message]" ||
      audit.answer !== "[canonical-chat-message]" ||
      !audit.questionRedacted ||
      !audit.answerRedacted ||
      audit.sourcesJson !== "[]"
    ) {
      fail("n8n audit trigger must retain metadata and scrub duplicated conversation content");
    }
    const canonicalDelete = await readJson(
      await deleteRoute.POST(
        apiRequest("/api/privacy/delete-request", {
          method: "POST",
          body: JSON.stringify({ question: canonicalQuestion }),
        }),
      ),
    );
    if (!canonicalDelete.ok) fail(`canonical chat delete request failed: ${canonicalDelete.status}`);
    const markedCanonicalSession = await db.chatSession.findUnique({ where: { sessionKey: canonicalSessionKey } });
    if (!markedCanonicalSession?.deleteRequestedAt) fail("canonical chat session was not marked for privacy deletion");

    const retention = await enforcePrivacyRetention();
    if (retention.consentsExpired < 3) fail(`retention should expire active consents, got ${retention.consentsExpired}`);
    if (retention.canonicalChatSessionsDeleted < 1) {
      fail(`retention should delete canonical chat sessions, got ${retention.canonicalChatSessionsDeleted}`);
    }
    if (await db.chatSession.findUnique({ where: { sessionKey: canonicalSessionKey } })) {
      fail("canonical chat session survived retention deletion");
    }
    const expired = await db.consent.count({
      where: { userId: retentionUser.id, status: "EXPIRED" },
    });
    if (expired < 3) fail(`retention lead consents should be EXPIRED, got ${expired}`);

    await db.$disconnect();
  } finally {
    for (const key of Object.keys(process.env)) {
      if (!(key in snapshot)) delete process.env[key];
    }
    Object.assign(process.env, snapshot);
  }
}

async function testPiiRoundTripWithKey() {
  process.env.DATA_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const protectedField = preparePiiField("call me at user@example.com", { kind: "text" });
  if (!protectedField.ciphertext) fail("ciphertext missing with DATA_ENCRYPTION_KEY");
  if (protectedField.plaintext?.includes("user@example.com")) fail("display plaintext leaked email");
  const roundTrip = readPiiField(protectedField.plaintext, protectedField.ciphertext);
  if (roundTrip !== "call me at user@example.com") fail("encrypted PII round-trip failed");
}

async function testProductionPiiPersistenceRequiresEncryption() {
  const snapshot = { ...process.env };
  try {
    Object.assign(process.env, {
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/kaxi",
    });
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    delete process.env.DATA_ENCRYPTION_KEY;
    delete process.env.PII_ALLOW_UNENCRYPTED_PLAINTEXT;

    if (canPersistPiiValue("call me at user@example.com")) {
      fail("production PII persistence should require encryption");
    }
    if (!canPersistPiiValue("")) fail("empty PII value should be persistable");

    const { createPartnerRequest } = await import("../src/lib/partners/repository");
    const request: unknown = await createPartnerRequest({
      leadId: "local-privacy-test",
      partnerType: "admin",
      question: "call me at user@example.com",
    });
    if (!isRecord(request) || request.persisted !== false) {
      fail("partner request should not persist production PII without encryption");
    }
    if (JSON.stringify(request).includes("user@example.com")) {
      fail("unpersisted partner request leaked PII");
    }
  } finally {
    for (const key of Object.keys(process.env)) {
      if (!(key in snapshot)) delete process.env[key];
    }
    Object.assign(process.env, snapshot);
  }
}

async function testProductionPlaintextOverrideCannotLeak() {
  const snapshot = { ...process.env };
  try {
    Object.assign(process.env, {
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      PII_ALLOW_UNENCRYPTED_PLAINTEXT: " true ",
    });
    delete process.env.DATA_ENCRYPTION_KEY;

    const protectedField = preparePiiField("call me at user@example.com", { kind: "text" });
    if (protectedField.plaintext !== "[redacted-unencrypted]") {
      fail(`production plaintext override leaked text: ${protectedField.plaintext}`);
    }
    if (protectedField.ciphertext) fail("ciphertext should not exist without DATA_ENCRYPTION_KEY");
  } finally {
    for (const key of Object.keys(process.env)) {
      if (!(key in snapshot)) delete process.env[key];
    }
    Object.assign(process.env, snapshot);
  }
}

async function testPiiResponseSerializersDoNotExposeSecrets() {
  const snapshot = { ...process.env };
  try {
    Object.assign(process.env, {
      NODE_ENV: "test",
      DATA_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      PII_HASH_SECRET: "privacy-serializer-test-secret",
    });

    const protectedContact = preparePiiField("user@example.com", { kind: "contact" });
    const protectedQuestion = preparePiiField("Please email user@example.com about D-4.", { kind: "text" });
    const leadBody = {
      lead: serializeLeadForResponse({
        id: "lead-serializer-test",
        nickname: "serializer-test",
        contact: protectedContact.plaintext,
        contactCiphertext: protectedContact.ciphertext,
        contactHash: protectedContact.hash,
        contactRedacted: protectedContact.redacted,
        partnerRequests: [
          {
            id: "partner-serializer-test",
            question: protectedQuestion.plaintext,
            questionCiphertext: protectedQuestion.ciphertext,
            questionHash: protectedQuestion.hash,
            questionRedacted: protectedQuestion.redacted,
          },
        ],
      }),
    };
    const serializedLead = JSON.stringify(leadBody);
    if (serializedLead.includes("contactCiphertext") || serializedLead.includes("contactHash")) {
      fail(`lead response exposed contact secret fields: ${serializedLead}`);
    }
    if (serializedLead.includes("questionCiphertext") || serializedLead.includes("questionHash")) {
      fail(`nested partner response exposed question secret fields: ${serializedLead}`);
    }
    if (serializedLead.includes("user@example.com")) {
      fail("lead response leaked raw contact");
    }

    const partnerBody = {
      request: serializePartnerRequestForResponse({
        id: "partner-serializer-test",
        question: protectedQuestion.plaintext,
        questionCiphertext: protectedQuestion.ciphertext,
        questionHash: protectedQuestion.hash,
        questionRedacted: protectedQuestion.redacted,
        lead: {
          id: "lead-serializer-test",
          contact: protectedContact.plaintext,
          contactCiphertext: protectedContact.ciphertext,
          contactHash: protectedContact.hash,
          contactRedacted: protectedContact.redacted,
        },
      }),
    };
    const serializedPartner = JSON.stringify(partnerBody);
    if (serializedPartner.includes("questionCiphertext") || serializedPartner.includes("questionHash")) {
      fail(`partner response exposed question secret fields: ${serializedPartner}`);
    }
    if (serializedPartner.includes("contactCiphertext") || serializedPartner.includes("contactHash")) {
      fail(`partner lead response exposed contact secret fields: ${serializedPartner}`);
    }
    if (serializedPartner.includes("user@example.com")) {
      fail("partner response leaked raw question PII");
    }
  } finally {
    for (const key of Object.keys(process.env)) {
      if (!(key in snapshot)) delete process.env[key];
    }
    Object.assign(process.env, snapshot);
  }
}

async function testHostedNonPostgresGuards() {
  process.env.VERCEL = "1";
  process.env.DATABASE_URL = "https://not-a-postgres-database.example";
  delete process.env.DATA_ENCRYPTION_KEY;

  const leads = await import("../src/app/api/leads/route");
  const leadReq = new NextRequest("https://kaxi.local/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      nickname: "privacy-test",
      nationality: "vn",
      pathKey: "goal_language",
      education: "highschool",
      koreanLevel: "none",
      goal: "language",
      budget: 1,
      region: "seoul",
    }),
  });
  const leadRes = await leads.POST(leadReq);
  if (leadRes.status !== 503) fail(`lead guard expected 503, got ${leadRes.status}`);

  const partners = await import("../src/app/api/partner-requests/route");
  const partnerReq = new NextRequest("https://kaxi.local/api/partner-requests", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      leadId: "local-privacy-test",
      partnerType: "admin",
      question: "call me at user@example.com",
    }),
  });
  const partnerRes = await partners.POST(partnerReq);
  if (partnerRes.status !== 503) {
    const partnerBody = await partnerRes.json().catch(() => ({}));
    fail(`hosted partner guard expected shared limiter 503, got ${partnerRes.status}: ${JSON.stringify(partnerBody)}`);
  }
}

await testConsentThirdPartyFlow();
testPiiRedactionPreservesOfficialSourceDates();
await testPiiRedactionWithoutKey();
await testPiiRoundTripWithKey();
await testProductionPiiPersistenceRequiresEncryption();
await testProductionPlaintextOverrideCannotLeak();
await testPiiResponseSerializersDoNotExposeSecrets();
  await testHostedNonPostgresGuards();
console.log("PASS privacy guards");
