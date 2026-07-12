import { randomUUID } from "crypto";
import { prepareTestDb } from "./prepare-test-db";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

prepareTestDb("product analytics");
process.env.RATE_LIMIT_BACKEND = "memory";

const { NextRequest } = await import("next/server");
const { POST } = await import("../src/app/api/product-events/route");
const { getProductAnalytics } = await import("../src/lib/analytics/admin");
const { db } = await import("../src/lib/db");

const anonymousId = randomUUID();
async function post(eventName: string, properties: Record<string, unknown> = {}, eventId = randomUUID()) {
  return POST(new NextRequest("http://localhost/api/product-events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      eventId,
      eventName,
      anonymousId,
      locale: "ko",
      surface: "test",
      path: "/ko",
      properties,
    }),
  }));
}

try {
  for (const [name, properties] of [
    ["page_view", {}],
    ["diagnosis_viewed", {}],
    ["diagnosis_card_selected", { step: "goal", optionId: "degree" }],
    ["chatbot_opened", {}],
    ["chatbot_question_sent", { retry: false }],
    ["chatbot_answer_succeeded", { sourceCount: 2 }],
    ["citation_clicked", { sourceIndex: 0 }],
    ["handoff_created", {}],
  ] as const) {
    const response = await post(name, properties);
    assert(response.status === 201, `${name} should be accepted, got ${response.status}`);
  }

  const duplicateId = randomUUID();
  assert((await post("page_view", {}, duplicateId)).status === 201, "first idempotent event should be created");
  assert((await post("page_view", {}, duplicateId)).status === 200, "duplicate event should be acknowledged without another row");

  const sensitive = await post("chatbot_answer_succeeded", { questionText: "must not be stored" });
  assert(sensitive.status === 400, "sensitive analytics properties must be rejected");

  const analytics = await getProductAnalytics(30);
  assert(analytics.funnel.diagnosisSelectionRate === 1, "diagnosis selection rate should be 100%");
  assert(analytics.funnel.firstQuestionRate === 1, "first-question rate should be 100%");
  assert(analytics.funnel.answerSuccessRate === 1, "answer success rate should be 100%");
  assert(analytics.funnel.citationClickRate === 1, "citation click rate should be 100%");
  assert(analytics.locales[0]?.dropoffRate === 0, "engaged Korean session should not be counted as dropoff");

  const stored = await db.productEvent.count();
  assert(stored === 9, `expected nine unique safe events, got ${stored}`);
  console.log("PASS product analytics: privacy guard, idempotency, funnel rates, locale dropoff");
} finally {
  await db.$disconnect();
}
