import { expect, test } from "@playwright/test";

test("home quick diagnosis shows a path result on the first choice", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/ko");

  const quickDiagnosis = page.getByTestId("home-quick-diagnosis");
  await expect(quickDiagnosis).toBeVisible();
  await expect(page.getByText("무료 진단 시작")).toHaveCount(0);

  await page.getByTestId("quick-diagnosis-option-language").click();

  const result = page.getByTestId("quick-diagnosis-result");
  await expect(result).toBeVisible();
  await expect(result).toContainText("D-4");
  await expect(result).toContainText("8,000,000 KRW");
  await expect(result.getByRole("button", { name: "내 조건으로 정밀 진단" })).toBeVisible();

  const resultBox = await result.boundingBox();
  expect(resultBox).not.toBeNull();
  expect(resultBox?.x || 0).toBeGreaterThanOrEqual(0);
  expect((resultBox?.x || 0) + (resultBox?.width || 0)).toBeLessThanOrEqual(320);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("landing -> diagnosis save -> admin lookup -> Agent question -> RAG consult", async ({ page, request }) => {
  await page.goto("/ko");
  await expect(page.getByText("KAXI").first()).toBeVisible();
  await expect(page.getByText(/브로커 없이|Broker-free/i).first()).toBeVisible();

  await page.goto("/diagnose");
  await expect(page).toHaveURL(/\/ko\/diagnose$/);
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

test("KAXI widget receives a server-owned session and rejects a forged session", async ({ page, request }) => {
  await page.goto("/ko");
  await page.getByRole("button", { name: "KAXI 상담 열기" }).click();
  const panel = page.getByRole("region", { name: "KAXI 상담 채팅" });
  await expect(panel).toBeVisible();
  await expect(page.getByPlaceholder("KAXI에게 질문해 주세요.")).toBeEnabled();

  const box = await panel.boundingBox();
  expect(box).not.toBeNull();
  expect((box?.y || 0) + (box?.height || 0)).toBeLessThanOrEqual(720);

  const cookies = await page.context().cookies();
  expect(cookies.some((cookie) => cookie.name === "kaxi_chat_session" && cookie.httpOnly)).toBe(true);

  const forged = await request.post("/api/typebot-rag", {
    data: {
      question: "D-4 비자 서류는 무엇인가요?",
      sessionId: "kaxi-00000000-0000-4000-8000-000000000000",
      source: "kaxi-site",
      locale: "ko",
    },
  });
  expect(forged.status()).toBe(401);
});

test("KAXI widget localizes its controls and stays usable on a small mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/en");
  await page.getByRole("button", { name: "Open KAXI chat" }).click();

  const panel = page.getByRole("region", { name: "KAXI consultation chat" });
  await expect(panel).toBeVisible();
  await expect(page.getByText("Hello! Nice to meet you 👋")).toBeVisible();
  const textbox = page.getByRole("textbox", { name: "Question for KAXI" });
  await expect(textbox).toHaveAttribute("placeholder", "Ask KAXI a question.");
  await expect(textbox).toBeEnabled();

  const panelBox = await panel.boundingBox();
  const textboxBox = await textbox.boundingBox();
  const attachmentBox = await page.getByRole("button", { name: "Attach file" }).boundingBox();
  const disclaimer = page.getByText("KAXI provides guidance grounded in official sources.");
  await expect(disclaimer).toBeVisible();
  const disclaimerBox = await disclaimer.boundingBox();
  expect(panelBox).not.toBeNull();
  expect((panelBox?.x || 0) + (panelBox?.width || 0)).toBeLessThanOrEqual(320);
  expect((panelBox?.y || 0) + (panelBox?.height || 0)).toBeLessThanOrEqual(568);
  expect(textboxBox).not.toBeNull();
  expect(attachmentBox).not.toBeNull();
  expect(disclaimerBox).not.toBeNull();
  expect((textboxBox?.y || 0) + (textboxBox?.height || 0)).toBeLessThanOrEqual(attachmentBox?.y || 0);
  expect((disclaimerBox?.y || 0) + (disclaimerBox?.height || 0)).toBeLessThanOrEqual(568);
  expect((disclaimerBox?.y || 0) + (disclaimerBox?.height || 0)).toBeLessThanOrEqual(
    (panelBox?.y || 0) + (panelBox?.height || 0),
  );
});
