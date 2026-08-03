import { NextRequest } from "next/server";
import { prepareTestDb } from "./prepare-test-db";

// P0-1b, end to end, against a real database and a captured mail transport.
//
// The unit suites cover the token rules and the scope resolver. What only this
// can show is the property the whole design exists for: between "I typed an
// address" and "I clicked the link in the mail sent to it", NOTHING is marked
// for deletion — and deleteRequestedAt is not a label, it is what makes the
// retention sweep hard-delete chat sessions and their storage attachments.
//
// The rows in the plan's test matrix that need a database live here: another
// person's records untouched, an expired link, a reused link, and a second
// request superseding the first.

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
  PII_HASH_SECRET: "deletion-flow-test-secret",
  RATE_LIMIT_BACKEND: "memory",
  LEAD_ACCESS_SIGNING_SECRET: "deletion-flow-test-lead-access-secret",
  // smtpConfigured() gates on these; the transport itself is replaced below, so
  // no mail leaves the process.
  SMTP_HOST: "smtp.invalid",
  SMTP_FROM: "no-reply@kaxi.invalid",
});
delete process.env.VERCEL;
delete process.env.VERCEL_ENV;

prepareTestDb("deletion request flow");

const { __setTransportForTest } = await import("../src/lib/notifications/email");
const leadsRoute = await import("../src/app/api/leads/route");
const requestRoute = await import("../src/app/api/privacy/delete-request/route");
const verifyRoute = await import("../src/app/api/privacy/delete-request/verify/route");
const { db } = await import("../src/lib/db");
const { hashPii } = await import("../src/lib/privacy/pii");

const sent: Array<{ to: string; text: string }> = [];
__setTransportForTest({
  sendMail: async (message: unknown) => {
    const mail = message as { to: string; text: string };
    sent.push({ to: mail.to, text: mail.text });
    return { messageId: "captured" };
  },
});

let ipCounter = 0;
function post(path: string, body: unknown, cookie?: string) {
  const headers = new Headers({ "content-type": "application/json" });
  // The delete-request endpoint allows 5 per IP per hour, and this file makes
  // more than that. A distinct client IP per call keeps the rate limiter out of
  // the way without weakening the limit the route actually enforces.
  headers.set("x-forwarded-for", `203.0.113.${(ipCounter += 1) % 250}`);
  if (cookie) headers.set("cookie", cookie);
  return new NextRequest(`http://localhost${path}`, { method: "POST", headers, body: JSON.stringify(body) });
}

async function createLead(nickname: string, contact: string) {
  const res = await leadsRoute.POST(
    post("/api/leads", {
      nickname,
      nationality: "vn",
      age: 24,
      education: "university",
      koreanLevel: "none",
      goal: "language",
      budget: 6_000_000,
      region: "seoul",
      usingBroker: false,
      brokerCost: 0,
      hasHistory: false,
      pathKey: "goal_language",
      estimatedCost: 6_000_000,
      prepTime: "3 months",
      requiredDocs: ["passport"],
      warnings: [],
      nextActions: [],
      contact,
      contactType: "email",
    }),
  );
  const body = await res.clone().json();
  if (res.status !== 201) fail(`lead create failed: ${res.status} ${JSON.stringify(body)}`);
  return { id: body.lead.id as string, contact };
}

/** The token out of the most recent captured mail. */
function tokenFromLastMail(): string {
  const mail = sent.at(-1);
  if (!mail) fail("expected a verification mail to have been sent");
  const match = mail.text.match(/[?&]token=([A-Za-z0-9_%-]+)/);
  if (!match) fail(`no verification token in the mail body: ${mail.text.slice(0, 200)}`);
  return decodeURIComponent(match[1]!);
}

function verify(token: string) {
  return verifyRoute.GET(
    new NextRequest(`http://localhost/api/privacy/delete-request/verify?token=${encodeURIComponent(token)}`),
  );
}

const marked = async (leadId: string) =>
  Boolean((await db.diagnosisLead.findUnique({ where: { id: leadId } }))?.deleteRequestedAt);

try {
  const ALICE_CONTACT = "alice@example.com";
  const alice = await createLead("alice", ALICE_CONTACT);
  const bob = await createLead("bob", "bob@example.com");

  // 1. Typing an address deletes nothing. This is the whole point: the old
  //    endpoint acted here, on a string anyone could type.
  {
    sent.length = 0;
    const res = await requestRoute.POST(post("/api/privacy/delete-request", { contact: ALICE_CONTACT, locale: "ko" }));
    if (res.status !== 202) fail(`an unproven request must be accepted, got ${res.status}`);

    assertOk(!(await marked(alice.id)), "nothing may be marked before the address is verified");
    assertOk(!(await marked(bob.id)), "a stranger's lead must never be touched");

    const open = await db.privacyDeletionRequest.findMany({ where: { status: "pending_verification" } });
    if (open.length !== 1) fail(`expected exactly one open request, got ${open.length}`);
    assertOk(open[0]!.verificationTokenHash, "an open request must carry a token digest");
    assertOk(
      open[0]!.subjectHash === hashPii(ALICE_CONTACT),
      "the request must be keyed on the HMAC of the address",
    );

    // Neither the address nor the raw token may be recoverable from the row.
    const row = JSON.stringify(open[0]);
    assertOk(!row.includes(ALICE_CONTACT), "the stored request must not contain the address");
    assertOk(!row.includes(tokenFromLastMail()), "the stored request must not contain the raw token");

    if (sent.length !== 1) fail(`expected one verification mail, got ${sent.length}`);
    if (sent[0]!.to !== ALICE_CONTACT) fail("the link must go to the address that was named, and nowhere else");
  }

  // 2. Redeeming the link is what acts — and only on that address's records.
  {
    const token = tokenFromLastMail();
    const res = await verify(token);
    if (res.status !== 200) fail(`a valid link must be accepted, got ${res.status}`);

    assertOk(await marked(alice.id), "the verified address's own lead must be marked");
    assertOk(!(await marked(bob.id)), "another person's lead must remain untouched");

    const row = await db.privacyDeletionRequest.findFirst({ where: { subjectHash: hashPii(ALICE_CONTACT)! } });
    if (row?.status !== "verified") fail(`the request should be verified, got ${row?.status}`);
    assertOk(row.verifiedAt, "a redeemed request must record when");
    assertOk(!row.verificationTokenHash, "the digest must be cleared once the token is spent");

    const summary = JSON.stringify(row.scopeSummary);
    assertOk(/"leadsMarked":\s*1/.test(summary), `the scope summary must record what was marked: ${summary}`);
    assertOk(!summary.includes(alice.id), "the summary must hold counts, never the ids of erased records");
  }

  // 3. The same link a second time. It must not act again, and it must not say
  //    anything different — a distinguishable reply turns a token found in a
  //    forwarded mail or a proxy log into a test for whether it is live.
  {
    const token = tokenFromLastMail();
    const before = await verify(token);
    const beforeBody = await before.json();

    await db.diagnosisLead.update({ where: { id: alice.id }, data: { deleteRequestedAt: null } });
    const res = await verify(token);
    const body = await res.json();

    if (res.status !== 200) fail(`a spent link must answer like any other, got ${res.status}`);
    assertOk(
      JSON.stringify(body) === JSON.stringify(beforeBody),
      "a spent link must be indistinguishable from a fresh one in the response",
    );
    assertOk(!(await marked(alice.id)), "a spent link must not act a second time");
  }

  // 4. A link that never existed, and one that expired.
  {
    const unknown = await verify("this-token-was-never-issued");
    if (unknown.status !== 200) fail("an unknown token must not be distinguishable by status");

    sent.length = 0;
    await requestRoute.POST(post("/api/privacy/delete-request", { contact: bob.contact, locale: "en" }));
    const bobToken = tokenFromLastMail();
    await db.privacyDeletionRequest.updateMany({
      where: { subjectHash: hashPii(bob.contact)!, status: "pending_verification" },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    const expired = await verify(bobToken);
    if (expired.status !== 200) fail("an expired token must not be distinguishable by status");
    assertOk(!(await marked(bob.id)), "an expired link must not delete anything");
  }

  // 5. A second request supersedes the first, so an old mail cannot be redeemed
  //    after a newer one was sent.
  {
    sent.length = 0;
    await requestRoute.POST(post("/api/privacy/delete-request", { contact: bob.contact, locale: "ko" }));
    const first = tokenFromLastMail();

    sent.length = 0;
    await requestRoute.POST(post("/api/privacy/delete-request", { contact: bob.contact, locale: "ko" }));
    const second = tokenFromLastMail();
    if (first === second) fail("a repeated request must issue a new token");

    const open = await db.privacyDeletionRequest.count({
      where: { subjectHash: hashPii(bob.contact)!, status: "pending_verification" },
    });
    if (open !== 1) fail(`only one request per subject may stay open, found ${open}`);

    await verify(first);
    assertOk(!(await marked(bob.id)), "the superseded link must no longer act");

    await verify(second);
    assertOk(await marked(bob.id), "the current link must still act");
  }

  // 6. A caller who can already prove ownership is served directly — no mail, no
  //    waiting. Regressing this would quietly turn every signed-in deletion into
  //    an email round trip.
  {
    sent.length = 0;
    const carol = await createLead("carol", "carol@example.com");
    const res = await leadsRoute.POST(
      post("/api/leads", {
        nickname: "carol-2", nationality: "vn", age: 24, education: "university", koreanLevel: "none",
        goal: "language", budget: 6_000_000, region: "seoul", usingBroker: false, brokerCost: 0,
        hasHistory: false, pathKey: "goal_language", estimatedCost: 6_000_000, prepTime: "3 months",
        requiredDocs: ["passport"], warnings: [], nextActions: [], contact: "carol@example.com", contactType: "email",
      }),
    );
    const cookie = res.cookies.get("kaxi_lead_access")?.value;
    assertOk(cookie, "POST /api/leads must still issue the lead_access cookie");

    await requestRoute.POST(post("/api/privacy/delete-request", {}, `kaxi_lead_access=${cookie}`));
    assertOk(await marked((await res.clone().json()).lead.id), "a proven caller's lead is marked immediately");
    assertOk(!(await marked(carol.id)), "the cookie authorises its own lead and no other");
    if (sent.length !== 0) fail("a caller who already proved ownership must not be sent a verification mail");
  }

  // 7. When the verification channel cannot deliver, opening a request would
  //    promise a link that never arrives — and, worse, would supersede a link
  //    that still works. Neither may happen.
  {
    sent.length = 0;
    const holder = await createLead("link-holder", "holder@example.com");
    await requestRoute.POST(post("/api/privacy/delete-request", { contact: holder.contact, locale: "ko" }));
    const liveToken = tokenFromLastMail();
    const openBefore = await db.privacyDeletionRequest.count({
      where: { subjectHash: hashPii(holder.contact)!, status: "pending_verification" },
    });
    if (openBefore !== 1) fail(`setup: expected one live request, got ${openBefore}`);

    // Now the channel goes away — exactly today's production state.
    const savedHost = process.env.SMTP_HOST;
    process.env.SMTP_HOST = "";
    sent.length = 0;
    const res = await requestRoute.POST(
      post("/api/privacy/delete-request", { contact: holder.contact, locale: "ko" }),
    );
    process.env.SMTP_HOST = savedHost;

    // The response must not change — a caller still cannot tell what happened.
    if (res.status !== 202) fail(`an undeliverable request must answer like any other, got ${res.status}`);
    if (sent.length !== 0) fail("nothing may be sent when the channel is unconfigured");

    const openAfter = await db.privacyDeletionRequest.count({
      where: { subjectHash: hashPii(holder.contact)!, status: "pending_verification" },
    });
    if (openAfter !== 1) {
      fail(`an undeliverable request must not open or destroy anything: ${openBefore} -> ${openAfter} live requests`);
    }

    // And the link the holder already has must still work.
    const redeemed = await verify(liveToken);
    if (redeemed.status !== 200) fail(`the pre-existing link must still redeem, got ${redeemed.status}`);
    assertOk(await marked(holder.id), "the still-valid link must act when redeemed");
  }

  console.log("PASS deletion request flow: an undeliverable request opens nothing and destroys no live link");

  console.log("PASS deletion request flow: nothing is marked until the mailed link comes back, and only for that address");
} finally {
  __setTransportForTest(null);
  for (const key of Object.keys(process.env)) if (!(key in snapshot)) delete process.env[key];
  Object.assign(process.env, snapshot);
}
