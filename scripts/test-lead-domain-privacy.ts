import { readFileSync } from "fs";
import { join } from "path";
import { prepareTestDb } from "./prepare-test-db";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const root = process.cwd();
const schema = readFileSync(join(root, "prisma", "postgres", "schema.prisma"), "utf8");
const migration = readFileSync(
  join(root, "prisma", "postgres", "migrations", "20260710143000_lead_domain_privacy", "migration.sql"),
  "utf8",
);
const dedupeMigration = readFileSync(
  join(root, "prisma", "postgres", "migrations", "20260710174000_handoff_contact_hash_dedupe", "migration.sql"),
  "utf8",
);
const handoffConsentMigration = readFileSync(
  join(root, "prisma", "postgres", "migrations", "20260710190000_handoff_consent_evidence", "migration.sql"),
  "utf8",
);
const handoffRoute = readFileSync(join(root, "src", "app", "api", "typebot-handoff", "route.ts"), "utf8");

assert(schema.includes("model DiagnosisLead") && schema.includes('@@map("diagnosis_leads")'), "diagnosis lead must have an unambiguous table name");
assert(schema.includes("model HandoffLead") && schema.includes('@@map("leads")'), "handoff lead must be modeled explicitly");
assert(migration.includes("kaxi_protect_handoff_update_pii"), "handoff writes must be redacted before persistence");
assert(migration.includes("contact_ciphertext") && migration.includes("contact_hash"), "handoff contacts require ciphertext and hash fields");
assert(handoffRoute.includes("preparePiiField(leadContact") && handoffRoute.includes("leadContactCiphertext"), "KAXI gateway must encrypt contact before n8n");
assert(!handoffRoute.includes("\n      leadContact,\n"), "KAXI gateway must not forward raw contact as a payload field");
assert(
  handoffRoute.includes("resolveHandoffProvenance") && handoffRoute.includes("handoffJson"),
  "Typebot handoff responses must expose workflow, model, and prompt provenance",
);
assert(
  handoffRoute.includes("hasAcceptedHandoffConsent") &&
    handoffRoute.includes("recordHandoffConsentEvidence") &&
    handoffRoute.includes('code: "CONSENT_REQUIRED"'),
  "Typebot handoff must fail closed and persist a versioned consent receipt",
);
assert(
  handoffConsentMigration.includes("handoff_consent_evidence_acceptance_check") &&
    handoffConsentMigration.includes("ON DELETE CASCADE") &&
    handoffConsentMigration.includes("ENABLE ROW LEVEL SECURITY"),
  "handoff consent evidence must be valid, session-owned, and private",
);
assert(
  dedupeMigration.includes("nullif(NEW.lead_contact_hash") &&
    dedupeMigration.includes("kaxi_propagate_handoff_content_privacy"),
  "handoff dedupe must use the keyed contact hash and propagate encrypted content",
);

process.env.DATA_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.PII_HASH_SECRET = "handoff-dedupe-test-keyed-hash-secret";
prepareTestDb("handoff contact dedupe");

const { db } = await import("../src/lib/db");
const { preparePiiField } = await import("../src/lib/privacy/pii");
const sessionKey = "typebot-handoff-dedupe-test";
const contact = "010-1234-5678";
const protectedContact = preparePiiField(contact, { kind: "contact" });
const protectedName = preparePiiField("홍길동", { kind: "text" });
const protectedQuestion = preparePiiField("D-4 체류 상담 user@example.com", { kind: "text" });
const protectedAnswer = preparePiiField("담당자 확인이 필요합니다.", { kind: "text" });
const protectedNote = preparePiiField("만료일은 2026-12-31입니다.", { kind: "text" });

for (let attempt = 0; attempt < 2; attempt += 1) {
  await db.$executeRaw`
    INSERT INTO "handoff_updates" (
      "session_id", "lead_name", "lead_name_ciphertext", "lead_name_redacted",
      "lead_contact", "lead_contact_ciphertext", "lead_contact_hash", "lead_contact_redacted",
      "lead_note", "lead_note_ciphertext", "lead_note_hash", "lead_note_redacted",
      "question", "question_ciphertext", "question_hash", "question_redacted",
      "answer", "answer_ciphertext", "answer_hash", "answer_redacted"
    ) VALUES (
      ${sessionKey}, ${protectedName.plaintext}, ${protectedName.ciphertext}, ${protectedName.redacted},
      ${protectedContact.plaintext}, ${protectedContact.ciphertext}, ${protectedContact.hash}, ${protectedContact.redacted},
      ${protectedNote.plaintext}, ${protectedNote.ciphertext}, ${protectedNote.hash}, ${protectedNote.redacted},
      ${protectedQuestion.plaintext}, ${protectedQuestion.ciphertext}, ${protectedQuestion.hash}, ${protectedQuestion.redacted},
      ${protectedAnswer.plaintext}, ${protectedAnswer.ciphertext}, ${protectedAnswer.hash}, ${protectedAnswer.redacted}
    )
  `;
}

const contacts = await db.handoffLeadContact.findMany({ where: { sessionKey } });
assert(contacts.length === 1, `repeat handoff must keep one contact, got ${contacts.length}`);
assert(contacts[0].contactHash === protectedContact.hash, "handoff contact must retain the keyed lookup hash");
assert(Boolean(contacts[0].contactCiphertext), "handoff contact ciphertext must propagate");
assert(contacts[0].contactValue !== contact, "handoff contact display value must stay redacted");

const lead = await db.handoffLead.findUnique({ where: { sessionKey } });
assert(Boolean(lead?.questionCiphertext && lead.notesCiphertext), "encrypted handoff question and note must propagate to lead");
const tasks = await db.$queryRaw<Array<{ question_ciphertext: string | null; notes_ciphertext: string | null }>>`
  SELECT "question_ciphertext", "notes_ciphertext"
  FROM "handoff_tasks"
  WHERE "session_id" = ${sessionKey}
`;
assert(tasks.length === 1, `repeat handoff must reuse one open task, got ${tasks.length}`);
assert(Boolean(tasks[0].question_ciphertext && tasks[0].notes_ciphertext), "encrypted handoff content must propagate to task");

const canonicalSessionKey = "kaxi-owned-handoff-test";
await db.chatSession.create({ data: { sessionKey: canonicalSessionKey } });
const canonicalMessage = await db.chatMessage.create({
  data: {
    sessionKey: canonicalSessionKey,
    question: protectedQuestion.plaintext || "",
    questionCiphertext: protectedQuestion.ciphertext,
    questionHash: protectedQuestion.hash,
    questionRedacted: protectedQuestion.redacted,
    answer: protectedAnswer.plaintext || "",
    answerCiphertext: protectedAnswer.ciphertext,
    answerHash: protectedAnswer.hash,
    answerRedacted: protectedAnswer.redacted,
    needsHuman: true,
    riskLevel: "medium",
  },
});
for (let attempt = 0; attempt < 2; attempt += 1) {
  await db.$executeRaw`
    INSERT INTO "handoff_tasks" (
      "source_chat_message_id", "session_id", "question", "question_ciphertext", "question_hash", "question_redacted",
      "answer", "answer_ciphertext", "answer_hash", "answer_redacted", "risk_level", "lead_stage", "status", "dedupe_key"
    ) VALUES (
      ${canonicalMessage.id}, ${canonicalSessionKey}, ${protectedQuestion.plaintext}, ${protectedQuestion.ciphertext}, ${protectedQuestion.hash}, ${protectedQuestion.redacted},
      ${protectedAnswer.plaintext}, ${protectedAnswer.ciphertext}, ${protectedAnswer.hash}, ${protectedAnswer.redacted}, 'medium', 'review', 'open', 'kaxi-owned-handoff-dedupe'
    )
  `;
}
const canonicalTasks = await db.$queryRaw<Array<{ source_chat_message_id: bigint | null; question_ciphertext: string | null }>>`
  SELECT "source_chat_message_id", "question_ciphertext"
  FROM "handoff_tasks"
  WHERE "session_id" = ${canonicalSessionKey}
`;
assert(canonicalTasks.length === 1, `KAXI-owned handoff must dedupe to one task, got ${canonicalTasks.length}`);
assert(canonicalTasks[0].source_chat_message_id === canonicalMessage.id, "handoff task must link to the canonical chat message");
assert(Boolean(canonicalTasks[0].question_ciphertext), "KAXI-owned handoff must retain encrypted question content");

await db.$disconnect();

console.log("PASS lead domains: diagnosis/handoff separation and encrypted handoff contact contract");
