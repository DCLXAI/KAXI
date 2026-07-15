import assert from "node:assert/strict";
import { prepareTestDb } from "./prepare-test-db";

// prepareTestDb MUST run before any static or dynamic import that transitively
// touches src/lib/db (including src/lib/ops/sla-watchdog itself) -- it is what
// repoints process.env.DATABASE_URL at the loopback TEST_DATABASE_URL before
// the Prisma client is constructed. See scripts/test-case-pipeline.ts and
// scripts/test-handoff-review-loop.ts for the same ordering requirement.
prepareTestDb("sla watchdog");
process.env.ADMIN_API_KEY = "test-admin-key";

const { classifySlaItem, runSlaWatchdog } = await import("../src/lib/ops/sla-watchdog");
const { db } = await import("../src/lib/db");
const { NextRequest } = await import("next/server");
const slaRoute = await import("../src/app/api/ops/sla/route");

function adminRequest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("x-admin-key", "test-admin-key");
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  return new NextRequest(`http://localhost${path}`, {
    method: init.method,
    headers,
    body: init.body || undefined,
  });
}

const now = new Date("2026-07-16T12:00:00.000Z");
const iso = (offsetMinutes: number) => new Date(now.getTime() + offsetMinutes * 60_000).toISOString();

// Terminal items are never alerted, however overdue.
assert.equal(classifySlaItem({ dueAt: iso(-9999), minutes: 1440, terminal: true, now }), "skipped");
// Already answered (first response recorded) -> not breached.
assert.equal(classifySlaItem({ dueAt: iso(-60), minutes: 1440, firstResponseAt: iso(-120), terminal: false, now }), "skipped");
// No due date -> nothing to judge.
assert.equal(classifySlaItem({ dueAt: null, minutes: 1440, terminal: false, now }), "skipped");
// Past due, unanswered, active -> breached.
assert.equal(classifySlaItem({ dueAt: iso(-1), minutes: 1440, terminal: false, now }), "breached");
// Within the final 25% of the window -> approaching.
assert.equal(classifySlaItem({ dueAt: iso(60), minutes: 1440, terminal: false, now }), "approaching");
// 25% boundary is inclusive of "approaching".
assert.equal(classifySlaItem({ dueAt: iso(360), minutes: 1440, terminal: false, now }), "approaching");
// Comfortably inside the window -> healthy.
assert.equal(classifySlaItem({ dueAt: iso(600), minutes: 1440, terminal: false, now }), "healthy");
// Urgent tier uses its own window: 25% of 120min = 30min.
assert.equal(classifySlaItem({ dueAt: iso(20), minutes: 120, terminal: false, now }), "approaching");
assert.equal(classifySlaItem({ dueAt: iso(60), minutes: 120, terminal: false, now }), "healthy");

console.log("PASS sla watchdog: breach/approach/healthy classification");

function assertFn(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL ${message}`);
}

try {
  const overdue = new Date(Date.now() - 60 * 60_000); // 1 hour ago

  // --- FIX 3: REJECTED / NEEDS_MORE_DOCUMENTS must never be treated as
  // still awaiting a partner's first response -- both are reachable from an
  // assigned, unanswered case (requestCaseSupplement can move a case straight
  // from HIGH_RISK to NEEDS_MORE_DOCUMENTS without ever going through
  // acceptAssignedCase), so leaving them in scope guarantees a false alert.
  const watchdogStudentUser = await db.user.create({
    data: { role: "STUDENT", email: "sla-watchdog-student@kaxi.local", locale: "ko" },
  });
  const watchdogStudentProfile = await db.studentProfile.create({
    data: {
      userId: watchdogStudentUser.id,
      nationality: "VN",
      visaType: "D-2",
      schoolName: "SLA Watchdog Test University",
      programType: "degree",
      semesterStatus: "preparing",
      topikLevel: 2,
    },
  });

  const inScopeCase = await db.escalationCase.create({
    data: {
      studentProfileId: watchdogStudentProfile.id,
      status: "HIGH_RISK",
      riskLevel: "HIGH",
      category: "sla-watchdog-test",
      summary: "in-scope breached case",
      matchedAt: overdue,
      slaTier: "urgent-2h",
      slaDueAt: overdue,
    },
  });
  const needsDocsCase = await db.escalationCase.create({
    data: {
      studentProfileId: watchdogStudentProfile.id,
      status: "NEEDS_MORE_DOCUMENTS",
      riskLevel: "MEDIUM",
      category: "sla-watchdog-test",
      summary: "bounced back for supplement, never accepted",
      matchedAt: overdue,
      slaTier: "urgent-2h",
      slaDueAt: overdue,
    },
  });
  const rejectedCase = await db.escalationCase.create({
    data: {
      studentProfileId: watchdogStudentProfile.id,
      status: "REJECTED",
      riskLevel: "MEDIUM",
      category: "sla-watchdog-test",
      summary: "rejected, never accepted",
      matchedAt: overdue,
      slaTier: "urgent-2h",
      slaDueAt: overdue,
    },
  });

  // --- FIX 1/2 support fixture for this queue's breach/alert accounting:
  // a genuinely breached, unanswered PartnerRequest.
  const watchdogLead = await db.diagnosisLead.create({
    data: {
      nickname: "SLA watchdog test",
      nationality: "vn",
      age: 22,
      education: "university",
      koreanLevel: "topik2",
      goal: "degree",
      budget: 15_000_000,
      region: "seoul",
      pathKey: "goal_degree",
      estimatedCost: 12_000_000,
      prepTime: "6 months",
      requiredDocs: "[]",
      warningsJson: "[]",
      nextActionsJson: "[]",
    },
  });
  const breachedPartnerRequest = await db.partnerRequest.create({
    data: {
      leadId: watchdogLead.id,
      partnerType: "admin",
      question: "breached, unanswered request",
      status: "matched",
      matchedAt: overdue,
      slaTier: "standard-24h",
      slaDueAt: overdue,
    },
  });

  // --- FIX 5: a queue that crashes entirely must report the crash, not
  // zeroed counts indistinguishable from a healthy, empty queue. The handoff
  // queue is guaranteed to fail here: scanHandoffQueue hard-refuses to touch
  // Supabase under the isolated test runtime (this test's own DATABASE_URL is
  // the loopback TEST_DATABASE_URL), which is itself a necessary safety
  // guard -- handoff_tasks lives in Supabase, not this Postgres test
  // database, and a developer's real NEXT_PUBLIC_SUPABASE_URL/
  // SUPABASE_SERVICE_ROLE_KEY must never be reachable from a test run. That
  // guaranteed, safe failure doubles as this test's "inject a failing scan"
  // vector: the other two (Prisma-backed) queues must still be scanned and
  // alerted on normally, and the overall result must surface the crash
  // rather than swallow it as zeros.
  const firstRun = await runSlaWatchdog("test");

  assertFn(firstRun.ok === false, "runSlaWatchdog must report ok:false when any queue failed");
  assertFn(firstRun.queues.handoff.failed > 0, "a crashed queue must report failed > 0, never zeroed counts");
  assertFn(typeof firstRun.queues.handoff.error === "string" && firstRun.queues.handoff.error.length > 0, "a crashed queue must carry an error message");

  assertFn(firstRun.queues.partner_request.failed === 0, "the partner_request queue must be unaffected by the handoff queue's failure");
  assertFn(firstRun.queues.partner_request.breached >= 1, "the seeded breached partner request must be counted");
  assertFn(firstRun.queues.partner_request.alerted >= 1, "the seeded breached partner request must be alerted on its first scan");

  assertFn(firstRun.queues.escalation_case.failed === 0, "the escalation_case queue must be unaffected by the handoff queue's failure");
  assertFn(firstRun.queues.escalation_case.breached >= 1, "the in-scope HIGH_RISK case must be counted as breached");

  console.log("PASS FIX 5: a crashed queue scan reports failed/error (not zeros-as-healthy), and does not prevent the other queues from scanning and alerting");

  const inScopeAfterFirstRun = await db.escalationCase.findUniqueOrThrow({ where: { id: inScopeCase.id } });
  assertFn(inScopeAfterFirstRun.slaBreachAlertedAt !== null, "the in-scope HIGH_RISK case must be alerted (its breachAlertedAt stamped)");

  const needsDocsAfterFirstRun = await db.escalationCase.findUniqueOrThrow({ where: { id: needsDocsCase.id } });
  assertFn(needsDocsAfterFirstRun.slaBreachAlertedAt === null, "a NEEDS_MORE_DOCUMENTS case must never be alerted, even though it is overdue and unanswered");

  const rejectedAfterFirstRun = await db.escalationCase.findUniqueOrThrow({ where: { id: rejectedCase.id } });
  assertFn(rejectedAfterFirstRun.slaBreachAlertedAt === null, "a REJECTED case must never be alerted, even though it is overdue and unanswered");

  console.log("PASS FIX 3: REJECTED / NEEDS_MORE_DOCUMENTS cases are out of scope for the first-response SLA and are never alerted");

  // Idempotency + the claim-before-alert minor fix: re-running the scan must
  // not double-alert the same, already-stamped breach.
  const secondRun = await runSlaWatchdog("test");
  assertFn(secondRun.queues.partner_request.alerted === 0, "re-scanning an already-alerted breach must not alert it again (idempotent)");
  assertFn(secondRun.queues.partner_request.breached >= 1, "the still-breached, still-unanswered request must keep counting as breached on a re-scan");

  console.log("PASS idempotency: a second scan does not re-alert an already-stamped breach");

  // --- FIX 5 (route): the route must return a non-200 status when any queue
  // failed, mirroring /api/ops/health's 503-when-unhealthy behavior.
  const routeResponse = await slaRoute.POST(adminRequest("/api/ops/sla", { method: "POST" }));
  const routeBody = await routeResponse.json();
  assertFn(routeResponse.status === 503, `POST /api/ops/sla must return 503 when a queue failed, got ${routeResponse.status}`);
  assertFn(routeBody.ok === false, "POST /api/ops/sla response body must report ok:false when a queue failed");

  console.log("PASS FIX 5 (route): POST /api/ops/sla returns 503 (not 200) when a queue scan failed");

  void breachedPartnerRequest;
  console.log("PASS sla watchdog: DB-backed FIX 3 (terminal statuses) and FIX 5 (failure reporting, idempotency, route status) verified");
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  await db.$disconnect();
}
