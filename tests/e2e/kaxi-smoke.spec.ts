import { expect, test } from "@playwright/test";

test("landing -> diagnosis save -> admin lookup -> Agent question -> RAG consult", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByText("KAXI").first()).toBeVisible();
  await expect(page.getByText(/브로커 없이|Broker-free/i).first()).toBeVisible();

  await page.goto("/diagnose");
  await expect(page.getByText(/진단|Diagnosis/i).first()).toBeVisible();

  const nickname = `e2e-${Date.now()}`;
  const leadResponse = await request.post("/api/leads", {
    data: {
      nickname,
      nationality: "vn",
      age: 22,
      education: "highschool",
      koreanLevel: "topik2",
      goal: "language",
      budget: 9000000,
      region: "seoul",
      usingBroker: false,
      brokerCost: 0,
      hasHistory: false,
      pathKey: "goal_language",
      estimatedCost: 8500000,
      prepTime: "3-6 months",
      requiredDocs: ["docs_doc_passport", "docs_doc_finance"],
      warnings: [],
      nextActions: [],
    },
  });
  expect(leadResponse.status()).toBe(201);
  const { lead } = await leadResponse.json();
  expect(lead.id).toBeTruthy();

  const adminResponse = await request.get("/api/leads", {
    headers: { "x-admin-key": "e2e-admin-key" },
    params: { q: nickname },
  });
  expect(adminResponse.status()).toBe(200);
  const adminData = await adminResponse.json();
  expect(adminData.leads.some((item: { nickname: string }) => item.nickname === nickname)).toBe(true);

  const agentResponse = await request.post("/api/ai/agent", {
    data: {
      lang: "ko",
      leadId: lead.id,
      question: "서울 인증대학 어학당 2곳과 비용을 알려줘",
    },
  });
  expect(agentResponse.status()).toBe(200);
  const agentData = await agentResponse.json();
  expect(agentData.backend).toBe("tool-fallback");
  expect(String(agentData.answer || "").length).toBeGreaterThan(20);
  expect(Array.isArray(agentData.toolResults)).toBe(true);

  const consultResponse = await request.post("/api/ai/consult", {
    data: {
      lang: "ko",
      mode: "visa",
      question: "D-4 비자 재정증빙과 서류 주의사항을 알려줘",
    },
  });
  expect(consultResponse.status()).toBe(200);
  const consultData = await consultResponse.json();
  expect(String(consultData.answer || "").length).toBeGreaterThan(20);
  expect(Array.isArray(consultData.retrievedDocs)).toBe(true);
});
