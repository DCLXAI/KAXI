// Authorization contract for the partner handoff inbox (Task 6).
//
// The security-critical surface here is small and deliberately kept as pure,
// exported functions in src/lib/handoffs/partner.ts:
//   - isPartnerHandoffAction / PartnerHandoffAssignmentError: the hard
//     allow-list ("start"/"contacted" only -- the RAG verdict stays admin-only)
//   - assertHandoffAssignedToCaller: the ownership boundary
//   - filterHandoffsAssignedTo: the listing scope (caller's own, active tasks)
//
// A full Supabase round trip for handoff_tasks is not exercised here: admin.ts
// hard-disables the Supabase service client whenever TEST_DATABASE_URL points
// at a loopback database (isolatedTestRuntime()), specifically so a test run
// can never read or mutate production Supabase data (see Task 5's note and
// scripts/test-handoff-review-loop.ts for the same constraint on the admin
// path). Unlike scripts/test-handoff-review-loop.ts, this script never needs
// real rows -- every assertion below runs against pure functions and
// fabricated data -- so it deliberately does NOT call prepareTestDb() (which
// runs a real `prisma migrate reset` and requires separate operator
// consent). Instead it only reassigns process.env.DATABASE_URL, in-process,
// to the already-loopback TEST_DATABASE_URL string so isolatedTestRuntime()'s
// regex check reads true. That check never opens a connection either way, so
// this line touches no database, local or otherwise.
import {
  PartnerHandoffAssignmentError,
  isPartnerHandoffAction,
  assertHandoffAssignedToCaller,
  filterHandoffsAssignedTo,
  listPartnerHandoffs,
  updatePartnerHandoff,
} from "../src/lib/handoffs/partner";

const loopbackTestDatabaseUrl = process.env.TEST_DATABASE_URL?.trim() || "";
if (!/^postgres(?:ql)?:\/\/(?:[^@]+@)?(?:localhost|127\.0\.0\.1|\[::1\])/i.test(loopbackTestDatabaseUrl)) {
  throw new Error(
    "[test-partner-handoff-inbox] TEST_DATABASE_URL must be an explicit loopback postgres URL " +
    "so the isolation-guard assertion below can run without touching production Supabase",
  );
}
process.env.DATABASE_URL = loopbackTestDatabaseUrl;

type AdminHandoffTaskLike = Parameters<typeof filterHandoffsAssignedTo>[0][number];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL ${message}`);
}

async function assertRejectsWithCode(fn: () => unknown, expectedCode: string, message: string) {
  try {
    await fn();
  } catch (error) {
    const code = error instanceof PartnerHandoffAssignmentError ? error.code : null;
    assert(code === expectedCode, `${message} (expected code "${expectedCode}", got ${code ?? String(error)})`);
    return;
  }
  throw new Error(`FAIL ${message}: expected a rejection but none occurred`);
}

async function assertRejects(fn: () => unknown, message: string) {
  try {
    await fn();
  } catch {
    return;
  }
  throw new Error(`FAIL ${message}: expected a rejection but none occurred`);
}

function fakeTask(overrides: Partial<AdminHandoffTaskLike> & { id: string }): AdminHandoffTaskLike {
  return {
    sessionId: "session-1",
    tenantId: "default",
    status: "in_progress",
    riskLevel: "medium",
    leadStage: "review",
    assignee: null,
    assigneeUserId: null,
    organizationId: null,
    assignedAt: null,
    slaPolicy: null,
    slaTier: null,
    slaMinutes: null,
    slaDueAt: null,
    slaStatus: null,
    question: "test question",
    answer: "test answer",
    notes: null,
    source: "kaxi-site",
    locale: "ko",
    leadId: null,
    leadStatus: null,
    contactId: null,
    contactType: null,
    contactValue: null,
    contactName: null,
    hasContact: false,
    sources: [],
    contactReceivedAt: null,
    consentAcceptedAt: null,
    consentNoticeVersion: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    closedAt: null,
    queueReason: "needs_human",
    resolutionCode: null,
    resolvedBy: null,
    resolvedAt: null,
    evaluationCaseId: null,
    evaluationActive: null,
    retrievalRunId: null,
    retrievalCategory: null,
    topScore: null,
    similarityThreshold: null,
    noContext: false,
    noContextReason: null,
    ...overrides,
  };
}

try {
  // --- 1) Hard allow-list: only start/contacted are ever permitted -----
  assert(isPartnerHandoffAction("start"), "start must be a partner-allowed action");
  assert(isPartnerHandoffAction("contacted"), "contacted must be a partner-allowed action");
  assert(!isPartnerHandoffAction("resolve"), "resolve (the RAG verdict) must NOT be partner-allowed");
  assert(!isPartnerHandoffAction("inaccurate"), "inaccurate must NOT be partner-allowed");
  assert(!isPartnerHandoffAction("missing_document"), "missing_document must NOT be partner-allowed");
  assert(!isPartnerHandoffAction("assign"), "assign must NOT be partner-allowed");
  assert(!isPartnerHandoffAction("close"), "close must NOT be partner-allowed");
  assert(!isPartnerHandoffAction("reopen"), "reopen must NOT be partner-allowed");
  assert(!isPartnerHandoffAction(""), "empty string must NOT be partner-allowed");
  assert(!isPartnerHandoffAction(undefined), "undefined must NOT be partner-allowed");
  console.log("PASS action allow-list (pure): only start/contacted permitted, RAG verdict rejected");

  // The allow-list check runs first and unconditionally inside
  // updatePartnerHandoff -- before any Supabase access -- so this exercises
  // the real, exported, API-route-facing function end to end, not a stand-in.
  await assertRejectsWithCode(
    () => updatePartnerHandoff({ id: "1", userId: "partner-a", action: "resolve" }),
    "handoff_action_not_allowed",
    "updatePartnerHandoff must reject action=resolve before touching any task",
  );
  await assertRejectsWithCode(
    () => updatePartnerHandoff({ id: "1", userId: "partner-a", action: "assign" }),
    "handoff_action_not_allowed",
    "updatePartnerHandoff must reject action=assign before touching any task",
  );
  console.log("PASS updatePartnerHandoff end-to-end: disallowed actions rejected pre-mutation with the correct code");

  // --- 2) Ownership boundary: a partner cannot touch another partner's task
  assertHandoffAssignedToCaller("partner-a", "partner-a"); // must not throw for the true owner
  await assertRejects(
    () => Promise.resolve(assertHandoffAssignedToCaller("partner-b", "partner-a")),
    "assertHandoffAssignedToCaller must reject a task assigned to a different partner",
  );
  await assertRejects(
    () => Promise.resolve(assertHandoffAssignedToCaller(null, "partner-a")),
    "assertHandoffAssignedToCaller must reject an unassigned task",
  );
  try {
    assertHandoffAssignedToCaller("partner-b", "partner-a");
    throw new Error("FAIL ownership guard did not throw for a mismatched owner");
  } catch (error) {
    const code = error instanceof PartnerHandoffAssignmentError ? error.code : null;
    assert(code === "handoff_not_assigned_to_caller", `ownership rejection must carry the correct code, got ${code}`);
  }
  console.log("PASS ownership guard (pure): mismatched/unassigned rejected, true owner allowed");

  // --- 3) Listing scope: only the caller's own, non-terminal tasks come back
  const fabricatedTasks = [
    fakeTask({ id: "own-active", assigneeUserId: "partner-a", status: "in_progress" }),
    fakeTask({ id: "own-open", assigneeUserId: "partner-a", status: "open" }),
    fakeTask({ id: "other-partner-active", assigneeUserId: "partner-b", status: "in_progress" }),
    fakeTask({ id: "own-resolved", assigneeUserId: "partner-a", status: "resolved" }), // terminal -> excluded
    fakeTask({ id: "own-closed", assigneeUserId: "partner-a", status: "closed" }), // terminal -> excluded
    fakeTask({ id: "unassigned", assigneeUserId: null, status: "open" }), // nobody's -> excluded
  ];
  const scoped = filterHandoffsAssignedTo(fabricatedTasks, "partner-a");
  const scopedIds = scoped.map((task) => task.id).sort();
  assert(
    scopedIds.length === 2 && scopedIds[0] === "own-active" && scopedIds[1] === "own-open",
    `listing must return exactly this caller's active tasks, got [${scopedIds.join(", ")}]`,
  );
  assert(
    scoped.every((task) => task.assigneeUserId === "partner-a"),
    "listing must never include another partner's task",
  );
  console.log("PASS listing scope (pure): only the caller's assigned, non-terminal tasks are returned");

  // The isolation guard: under TEST_DATABASE_URL, listPartnerHandoffs must
  // never reach production Supabase. This proves the guard engages -- it does
  // NOT re-prove the filtering above, since an empty result trivially
  // contains "only this caller's tasks".
  const isolatedResult = await listPartnerHandoffs("partner-a");
  assert(
    Array.isArray(isolatedResult) && isolatedResult.length === 0,
    "listPartnerHandoffs must short-circuit to an empty list rather than touch Supabase under the isolated test runtime",
  );
  console.log("PASS listPartnerHandoffs isolation guard: short-circuits instead of touching production Supabase");

  console.log("PASS partner handoff inbox: authorization contract enforced (allow-list, ownership, listing scope)");
} catch (error) {
  console.error(error);
  process.exit(1);
}
