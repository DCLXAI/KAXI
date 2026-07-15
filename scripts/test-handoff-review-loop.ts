import { randomUUID } from "crypto";
import { db } from "../src/lib/db";
import { notifyHandoffAssignee } from "../src/lib/handoffs/admin";
import { prepareTestDb } from "./prepare-test-db";

prepareTestDb("handoff review loop");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL ${message}`);
}

type TaskRow = {
  id: bigint;
  queue_reason: string;
  status: string;
  resolution_code: string | null;
  evaluation_case_id: string | null;
};

async function createTurn(input: {
  sessionKey: string;
  question: string;
  answer: string;
  noContext: boolean;
  topScore: number | null;
  threshold: number;
  retrievedCount: number;
  sources: Array<{ docId: string; title: string }>;
}) {
  await db.chatSession.create({
    data: { sessionKey: input.sessionKey, locale: "ko", source: "kaxi-site", channel: "kaxi-site" },
  });
  const message = await db.chatMessage.create({
    data: {
      sessionKey: input.sessionKey,
      question: input.question,
      answer: input.answer,
      locale: "ko",
      riskLevel: "low",
      needsHuman: false,
      leadStage: "review",
      sourcesJson: JSON.stringify(input.sources),
      sources: input.sources,
      searchMeta: {
        topScore: input.topScore,
        similarityThreshold: input.threshold,
        noContext: input.noContext,
        retrievedCount: input.retrievedCount,
      },
    },
  });
  await db.retrievalRun.create({
    data: {
      requestId: randomUUID(),
      messageId: message.id,
      sessionKey: input.sessionKey,
      query: input.question,
      category: "visa",
      similarityThreshold: input.threshold,
      topScore: input.topScore,
      retrievedCount: input.retrievedCount,
      noContext: input.noContext,
      noContextReason: input.noContext ? "below_similarity_threshold" : null,
      sources: input.sources,
      searchMeta: {},
    },
  });
  return message;
}

try {
  const noContextMessage = await createTurn({
    sessionKey: "operator-review-no-context",
    question: "D-4 가족 초청의 최신 요건을 알려주세요.",
    answer: "확인 가능한 공식 문서를 찾지 못했습니다.",
    noContext: true,
    topScore: 0.31,
    threshold: 0.55,
    retrievedCount: 0,
    sources: [],
  });
  const noContextTasks = await db.$queryRaw<TaskRow[]>`
    SELECT id, queue_reason, status, resolution_code, evaluation_case_id
    FROM public.handoff_tasks
    WHERE source_chat_message_id = ${noContextMessage.id}
  `;
  assert(noContextTasks.length === 1, "no-context retrieval must create one operator task");
  assert(noContextTasks[0].queue_reason === "no_context", "no-context task must record its queue reason");

  const noContextResolution = await db.$queryRaw<Array<{ evaluation_case_id: string; evaluation_active: boolean }>>`
    SELECT evaluation_case_id, evaluation_active
    FROM public.kaxi_resolve_handoff_review(${noContextTasks[0].id}, 'missing_document', 'test-operator')
  `;
  assert(noContextResolution[0]?.evaluation_active === false, "missing-document feedback must wait for expectation review");

  const lowConfidenceMessage = await createTurn({
    sessionKey: "operator-review-low-confidence",
    question: "D-2 체류기간 연장 시 필요한 서류는 무엇인가요?",
    answer: "공식 안내에 따라 재학증명과 체류 관련 서류를 준비하세요.",
    noContext: false,
    topScore: 0.58,
    threshold: 0.55,
    retrievedCount: 1,
    sources: [{ docId: "d2-overview", title: "D-2 비자 일반 안내" }],
  });
  const lowConfidenceTasks = await db.$queryRaw<TaskRow[]>`
    SELECT id, queue_reason, status, resolution_code, evaluation_case_id
    FROM public.handoff_tasks
    WHERE source_chat_message_id = ${lowConfidenceMessage.id}
  `;
  assert(lowConfidenceTasks.length === 1, "near-threshold retrieval must create one operator task");
  assert(lowConfidenceTasks[0].queue_reason === "low_confidence", "low-confidence task must record its queue reason");

  const resolved = await db.$queryRaw<Array<{ evaluation_case_id: string; evaluation_active: boolean }>>`
    SELECT evaluation_case_id, evaluation_active
    FROM public.kaxi_resolve_handoff_review(${lowConfidenceTasks[0].id}, 'resolved', 'test-operator')
  `;
  assert(resolved[0]?.evaluation_active === true, "resolved feedback with citations must become an active regression case");

  const cases = await db.$queryRaw<Array<{ id: string; active: boolean; metadata: unknown }>>`
    SELECT id, active, metadata
    FROM public.rag_evaluation_cases
    WHERE id IN (${noContextResolution[0].evaluation_case_id}, ${resolved[0].evaluation_case_id})
    ORDER BY id
  `;
  assert(cases.length === 2, "both operator verdicts must link to evaluation cases");
  assert(cases.some((item) => item.active), "at least the resolved grounded case must be active");
  assert(cases.some((item) => !item.active), "corpus-gap feedback must remain pending review");

  const feedback = await db.$queryRaw<Array<{ verdict: string; evaluation_case_id: string }>>`
    SELECT verdict, evaluation_case_id
    FROM public.rag_review_feedback
    ORDER BY created_at
  `;
  assert(feedback.length === 2, "each structured verdict must have one feedback audit row");
  assert(feedback.some((item) => item.verdict === "resolved"), "resolved verdict audit is missing");
  assert(feedback.some((item) => item.verdict === "missing_document"), "missing-document verdict audit is missing");

  console.log("PASS handoff review loop: auto-queue, SLA-ready task, verdict, evaluation case");

  // --- Task 5: notify the assignee when a handoff task is assigned ---
  // `updateAdminHandoff({ action: "assign" })` cannot be exercised end to
  // end against this loopback test database: its persistence step goes
  // through the Supabase service client, which `isolatedTestRuntime()` in
  // admin.ts hard-disables whenever TEST_DATABASE_URL is set, specifically
  // so a test run can never mutate production Supabase data. That guard
  // applies to every action, not just "assign". `notifyHandoffAssignee` is
  // the exact function the assign branch calls once its own Supabase write
  // has already succeeded, and it only touches Prisma's UserNotification
  // table, so we call the real function directly against a real assignee.
  const assigneeUser = await db.user.create({
    data: {
      id: "handoff-assignee-test-user",
      role: "PARTNER_AGENT",
      email: "handoff-assignee-test@example.com",
      locale: "ko",
    },
  });
  const handoffTaskId = "handoff-task-notify-test-1";

  await notifyHandoffAssignee(handoffTaskId, { id: assigneeUser.id, locale: assigneeUser.locale });
  const firstNotifications = await db.userNotification.findMany({ where: { userId: assigneeUser.id } });
  assert(firstNotifications.length === 1, "assignee must receive exactly one notification after assignment");
  assert(
    firstNotifications[0].eventKey === `handoff:${handoffTaskId}:assigned:${assigneeUser.id}`,
    "notification eventKey must be per-task-per-assignee"
  );
  assert(firstNotifications[0].title === "새 상담 배정", "notification must use the ko copy for a ko-locale assignee");

  // A second identical assign (e.g. a retry, or the operator re-submitting
  // the same assignment) must not create a duplicate row -- notifyUsers
  // upserts on the (userId, eventKey) unique constraint.
  await notifyHandoffAssignee(handoffTaskId, { id: assigneeUser.id, locale: assigneeUser.locale });
  const secondNotifications = await db.userNotification.findMany({ where: { userId: assigneeUser.id } });
  assert(secondNotifications.length === 1, "a second identical assign must not duplicate the assignee notification");

  // Best-effort: a notification failure (FK violation for a non-existent
  // user id) must never throw out of notifyHandoffAssignee -- the caller
  // (updateAdminHandoff's assign branch) must never fail an already
  // -persisted assignment because the notification could not be delivered.
  await notifyHandoffAssignee("handoff-task-notify-test-missing-user", { id: "does-not-exist-user-id", locale: "ko" });

  console.log("PASS handoff assignee notification: real row created, per-task-per-assignee dedupe, best-effort on failure");
} finally {
  await db.$disconnect();
}
