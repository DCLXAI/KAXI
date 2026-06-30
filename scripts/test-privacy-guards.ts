import { NextRequest } from "next/server";
import { createPartnerRequest } from "../src/lib/partners/repository";
import { canPersistPiiValue, preparePiiField, readPiiField } from "../src/lib/privacy/pii";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
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
      DATABASE_URL: "file:./db/custom.db",
    });
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    delete process.env.DATA_ENCRYPTION_KEY;
    delete process.env.PII_ALLOW_UNENCRYPTED_PLAINTEXT;

    if (canPersistPiiValue("call me at user@example.com")) {
      fail("production PII persistence should require encryption");
    }
    if (!canPersistPiiValue("")) fail("empty PII value should be persistable");

    const request = await createPartnerRequest({
      leadId: "local-privacy-test",
      partnerType: "admin",
      question: "call me at user@example.com",
    });
    if ((request as any).persisted !== false) {
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

async function testHostedSqliteGuards() {
  process.env.VERCEL = "1";
  process.env.DATABASE_URL = "file:/tmp/kaxi-no-write.db";
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
  const partnerBody = await partnerRes.json();
  if (partnerRes.status !== 202 || partnerBody.persisted !== false) {
    fail(`partner guard expected 202 persisted=false, got ${partnerRes.status}`);
  }
  if (JSON.stringify(partnerBody).includes("user@example.com")) {
    fail("partner unpersisted response leaked PII");
  }
}

await testPiiRedactionWithoutKey();
await testPiiRoundTripWithKey();
await testProductionPiiPersistenceRequiresEncryption();
await testHostedSqliteGuards();
console.log("PASS privacy guards");
