import { prepareTestDb } from "./prepare-test-db";

// P0-2. The retention sweep clears ciphertext and lookup hashes correctly — its
// `where` clause is what never matched.
//
//   const chatWhere = { OR: [...expiry...], questionRedacted: false };
//
// preparePiiField() sets `redacted: encrypted || safePlaintext !== trimmed`, and
// in production DATA_ENCRYPTION_KEY is set, so `encrypted` is true and EVERY row
// is written with redacted=true. The sweep therefore selected nothing, cleared
// nothing, and reported `chatLogs: 0` — which reads as "nothing was due", not
// as "the query cannot see anything". Ciphertext, plaintext excerpt and lookup
// hash outlived their retention window indefinitely.
//
// Two meanings had been packed into one boolean. `redacted` is the state of the
// DISPLAY plaintext, decided at write time. Whether the retention policy has
// processed a row is a different fact, and it now has its own column.
//
// Fixtures here go through the real preparePiiField() with a real encryption
// key, because a hand-built row with redacted=false would have passed against
// the broken query and proved nothing.

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assertOk(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

const snapshot = { ...process.env };
Object.assign(process.env, {
  NODE_ENV: "test",
  DATA_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  PII_HASH_SECRET: "retention-ciphertext-test-secret",
  PRIVACY_CHATLOG_RETENTION_DAYS: "90",
  PRIVACY_PARTNER_REQUEST_RETENTION_DAYS: "180",
  PRIVACY_LEAD_RETENTION_DAYS: "365",
});
delete process.env.VERCEL;
delete process.env.VERCEL_ENV;

prepareTestDb("retention ciphertext");

const { db } = await import("../src/lib/db");
const { preparePiiField, decryptPii } = await import("../src/lib/privacy/pii");
const { enforcePrivacyRetention, RETENTION_POLICY_VERSION } = await import("../src/lib/privacy/retention");
const { PLATFORM_TENANT_ID } = await import("../src/application/tenancy/tenant-context");

const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * DAY);

const QUESTION = "D-2 연장 서류 문의합니다. 연락은 alice@example.com 으로 주세요.";
const CONTACT = "alice@example.com";

async function seedLead(nickname: string, createdAt: Date) {
  const contact = preparePiiField(CONTACT, { kind: "contact", maxPlainLength: 160 });
  // The premise of this whole file: with a key configured, writes land redacted.
  assertOk(contact.ciphertext, "the fixture must be encrypted, or this test proves nothing");
  assertOk(contact.redacted, "preparePiiField must mark an encrypted contact as redacted at write time");

  return db.diagnosisLead.create({
    data: {
      nickname, nationality: "vn", age: 24, education: "university", koreanLevel: "none",
      goal: "language", budget: 6_000_000, region: "seoul", usingBroker: false, brokerCost: 0,
      hasHistory: false, pathKey: "goal_language", estimatedCost: 6_000_000, prepTime: "3 months",
      requiredDocs: "[]", warningsJson: "[]", nextActionsJson: "[]",
      contact: contact.plaintext, contactCiphertext: contact.ciphertext,
      contactHash: contact.hash, contactRedacted: contact.redacted, contactType: "email",
      createdAt,
    },
    select: { id: true },
  });
}

async function seedChatLog(createdAt: Date) {
  const q = preparePiiField(QUESTION, { kind: "text", maxPlainLength: 240 });
  assertOk(q.ciphertext && q.redacted, "the chat log fixture must be encrypted and redacted at write time");
  return db.chatLog.create({
    data: {
      lang: "ko", question: q.plaintext || "", questionCiphertext: q.ciphertext,
      questionHash: q.hash, questionRedacted: q.redacted,
      answer: "안내드립니다.", source: "rag", createdAt,
    },
    select: { id: true },
  });
}

async function seedPartnerRequest(leadId: string, createdAt: Date) {
  const q = preparePiiField(QUESTION, { kind: "text", maxPlainLength: 240 });
  return db.partnerRequest.create({
    data: {
      leadId, partnerType: "admin",
      question: q.plaintext, questionCiphertext: q.ciphertext,
      questionHash: q.hash, questionRedacted: q.redacted,
      createdAt,
    },
    select: { id: true },
  });
}

async function seedOutbox(retentionUntil: Date, suffix: string) {
  return db.outboxEvent.create({
    data: {
      tenantId: PLATFORM_TENANT_ID,
      requestId: `retention-request-${suffix}`,
      aggregateType: "retention-fixture",
      aggregateId: suffix,
      eventType: "retention.fixture",
      idempotencyKey: `retention-outbox-${suffix}`,
      payload: { fixture: true },
      traceId: `retention-trace-${suffix}`,
      retentionUntil,
    },
    select: { id: true },
  });
}

async function seedMessageLinkedOutbox() {
  const sessionKey = `retention-cascade-${crypto.randomUUID()}`;
  const session = await db.chatSession.create({
    data: { tenantId: PLATFORM_TENANT_ID, sessionKey },
  });
  const message = await db.chatMessage.create({
    data: {
      tenantId: PLATFORM_TENANT_ID,
      sessionKey,
      question: "[redacted]",
      answer: "[redacted]",
      requestId: crypto.randomUUID(),
      idempotencyKey: `retention-message-${crypto.randomUUID()}`,
    },
  });
  const event = await db.outboxEvent.create({
    data: {
      tenantId: PLATFORM_TENANT_ID,
      requestId: message.requestId,
      aggregateType: "chat-message",
      aggregateId: message.id.toString(),
      eventType: "retention.cascade-fixture",
      idempotencyKey: `retention-cascade-${message.id}`,
      messageId: message.id,
      payload: {},
      traceId: `retention-cascade-trace-${message.id}`,
    },
    select: { id: true },
  });
  return { sessionId: session.id, messageId: message.id, eventId: event.id };
}

try {
  // ---- expired rows, written the way production writes them ----
  const expiredLead = await seedLead("expired", ago(400));
  const expiredChat = await seedChatLog(ago(120));
  const expiredPartner = await seedPartnerRequest(expiredLead.id, ago(220));

  // ---- rows that are still inside their window and must not be touched ----
  const freshLead = await seedLead("fresh", ago(10));
  const freshChat = await seedChatLog(ago(3));
  const freshPartner = await seedPartnerRequest(freshLead.id, ago(5));
  const expiredOutbox = await seedOutbox(ago(1), "expired");
  const freshOutbox = await seedOutbox(new Date(Date.now() + DAY), "fresh");
  const cascade = await seedMessageLinkedOutbox();
  await db.chatMessage.delete({ where: { id: cascade.messageId } });
  assertOk(
    await db.outboxEvent.findUnique({ where: { id: cascade.eventId } }) === null,
    "deleting a canonical message must cascade to its linked outbox event",
  );
  await db.chatSession.delete({ where: { id: cascade.sessionId } });

  // 1. The dry run must see the same targets the real run will act on. A dry run
  //    that counts differently is worse than none: it is used to decide whether
  //    to run at all.
  const dry = await enforcePrivacyRetention({ dryRun: true });
  assertOk(dry.chatLogs >= 1, `dry run must see the expired chat log, saw ${dry.chatLogs}`);
  assertOk(dry.partnerRequests >= 1, `dry run must see the expired partner request, saw ${dry.partnerRequests}`);
  assertOk(dry.leadsRedacted >= 1, `dry run must see the expired lead, saw ${dry.leadsRedacted}`);
  assertOk(dry.outboxEventsDeleted === 1, `dry run must see one expired outbox event, saw ${dry.outboxEventsDeleted}`);

  const real = await enforcePrivacyRetention();
  if (real.chatLogs !== dry.chatLogs) fail(`dry run counted ${dry.chatLogs} chat logs, real run processed ${real.chatLogs}`);
  if (real.partnerRequests !== dry.partnerRequests) {
    fail(`dry run counted ${dry.partnerRequests} partner requests, real run processed ${real.partnerRequests}`);
  }
  if (real.leadsRedacted !== dry.leadsRedacted) {
    fail(`dry run counted ${dry.leadsRedacted} leads, real run processed ${real.leadsRedacted}`);
  }
  if (real.outboxEventsDeleted !== dry.outboxEventsDeleted) {
    fail(`dry run counted ${dry.outboxEventsDeleted} outbox events, real run deleted ${real.outboxEventsDeleted}`);
  }

  console.log("PASS retention ciphertext: the dry run counts exactly what the real run processes");

  // 2. The expired rows must have no recoverable personal data left. This is the
  //    assertion the old query could never reach.
  const chat = await db.chatLog.findUniqueOrThrow({ where: { id: expiredChat.id } });
  assertOk(!chat.questionCiphertext, "an expired chat log must not keep its ciphertext");
  assertOk(!chat.questionHash, "an expired chat log must not keep its lookup hash");
  assertOk(!decryptPii(chat.questionCiphertext), "the expired question must not decrypt to anything");
  assertOk(!chat.question.includes("alice@example.com"), "the expired plaintext must not keep the address");
  assertOk(chat.retentionProcessedAt, "a processed row must record when the policy handled it");
  assertOk(chat.retentionVersion === RETENTION_POLICY_VERSION, `expected retentionVersion ${RETENTION_POLICY_VERSION}`);

  const partner = await db.partnerRequest.findUniqueOrThrow({ where: { id: expiredPartner.id } });
  assertOk(!partner.questionCiphertext && !partner.questionHash, "an expired partner request must lose ciphertext and hash");
  assertOk(partner.retentionProcessedAt, "the partner request must be stamped as processed");

  const lead = await db.diagnosisLead.findUniqueOrThrow({ where: { id: expiredLead.id } });
  assertOk(!lead.contactCiphertext && !lead.contactHash && !lead.contact,
    "an expired lead must lose its contact, ciphertext and hash");
  assertOk(!decryptPii(lead.contactCiphertext), "the expired contact must not decrypt to anything");
  assertOk(lead.retentionProcessedAt, "the lead must be stamped as processed");

  console.log("PASS retention ciphertext: expired encrypted rows lose ciphertext, hash and plaintext");
  assertOk(
    await db.outboxEvent.findUnique({ where: { id: expiredOutbox.id } }) === null,
    "an expired outbox event must be deleted by the retention sweep",
  );
  assertOk(
    await db.outboxEvent.findUnique({ where: { id: freshOutbox.id } }) !== null,
    "an in-window outbox event must survive the retention sweep",
  );
  console.log("PASS outbox privacy: canonical deletion cascades and retention removes only expired events");

  // 3. Rows inside their window are untouched — the sweep must not be a blunt
  //    "delete everything" that happens to satisfy the assertions above.
  const keptChat = await db.chatLog.findUniqueOrThrow({ where: { id: freshChat.id } });
  assertOk(keptChat.questionCiphertext, "a chat log inside its window must keep its ciphertext");
  assertOk(!keptChat.retentionProcessedAt, "an unprocessed row must not be stamped");
  assertOk(decryptPii(keptChat.questionCiphertext) === QUESTION, "an in-window question must still decrypt");

  const keptLead = await db.diagnosisLead.findUniqueOrThrow({ where: { id: freshLead.id } });
  assertOk(keptLead.contactCiphertext && keptLead.contactHash, "a lead inside its window must keep its contact");
  assertOk(!keptLead.retentionProcessedAt, "an unprocessed lead must not be stamped");

  const keptPartner = await db.partnerRequest.findUniqueOrThrow({ where: { id: freshPartner.id } });
  assertOk(keptPartner.questionCiphertext, "a partner request inside its window must keep its ciphertext");

  console.log("PASS retention ciphertext: rows inside their retention window are untouched");

  // 4. Re-running must be a no-op, and must not re-count the same rows. A sweep
  //    that keeps reporting the same work is indistinguishable from one that is
  //    failing to make progress.
  const second = await enforcePrivacyRetention();
  if (second.chatLogs !== 0 || second.partnerRequests !== 0 || second.leadsRedacted !== 0 || second.outboxEventsDeleted !== 0) {
    fail(`a second sweep must find nothing left: ${JSON.stringify({
      chatLogs: second.chatLogs, partnerRequests: second.partnerRequests, leadsRedacted: second.leadsRedacted,
      outboxEventsDeleted: second.outboxEventsDeleted,
    })}`);
  }
  const secondDry = await enforcePrivacyRetention({ dryRun: true });
  if (secondDry.chatLogs !== 0 || secondDry.leadsRedacted !== 0) {
    fail("a dry run after processing must report nothing remaining");
  }

  // The stamps must not move on a re-run, or "when was this processed" becomes
  // "when did the sweep last run".
  const restamped = await db.chatLog.findUniqueOrThrow({ where: { id: expiredChat.id } });
  assertOk(
    restamped.retentionProcessedAt?.getTime() === chat.retentionProcessedAt?.getTime(),
    "re-running must not move the processed timestamp",
  );

  console.log("PASS retention ciphertext: the sweep is idempotent and does not re-report finished work");
} finally {
  for (const key of Object.keys(process.env)) if (!(key in snapshot)) delete process.env[key];
  Object.assign(process.env, snapshot);
}
