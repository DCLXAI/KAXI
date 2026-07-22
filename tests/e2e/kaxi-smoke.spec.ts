import { expect, test } from "@playwright/test";

test("home quick diagnosis uses three answers for its path result", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/ko");

  const quickDiagnosis = page.getByTestId("home-quick-diagnosis");
  await expect(page.locator('[data-kaxi-running-cat="travel"]')).toHaveCount(0);
  await expect(quickDiagnosis.locator('[data-kaxi-mark="paw"]')).toBeVisible();
  await expect(page.locator('#kaxi-ai [data-kaxi-mark="paw"]')).toBeVisible();
  await expect(quickDiagnosis).toBeVisible();
  await expect(page.getByText("무료 진단 시작")).toHaveCount(0);

  const initialPalette = await page.evaluate(() => {
    const paw = document.querySelector('[data-testid="home-quick-diagnosis"] [data-kaxi-mark="paw"]');
    const option = document.querySelector('[data-testid="quick-diagnosis-option-language"]');
    return {
      iconToken: getComputedStyle(document.documentElement).getPropertyValue("--icon-accent").trim(),
      pawColor: paw ? getComputedStyle(paw).color : "",
      optionBorder: option ? getComputedStyle(option).borderColor : "",
    };
  });
  expect(initialPalette).toMatchObject({
    iconToken: "#e5a0b3",
    pawColor: "rgb(229, 160, 179)",
  });
  expect(initialPalette.optionBorder).toContain("0.45");

  await page.getByTestId("quick-diagnosis-option-language").click();
  await expect(page.getByTestId("quick-diagnosis-step-korean")).toBeVisible();
  await page.getByTestId("quick-diagnosis-korean-none").click();
  await expect(page.getByTestId("quick-diagnosis-step-budget")).toBeVisible();
  await page.getByTestId("quick-diagnosis-budget-8to12").click();

  const result = page.getByTestId("quick-diagnosis-result");
  await expect(result).toBeVisible();
  await expect(result).toContainText("D-4");
  await expect(result).toContainText("7,000,000–9,000,000 KRW");
  await expect(result).toContainText("이렇게 추천한 이유");
  await expect(result.getByRole("button", { name: "내 조건으로 정밀 진단" })).toBeVisible();
  await page.waitForTimeout(250);

  const primaryButtonBackground = await page.evaluate(() => {
    const primaryButton = document.querySelector('[data-testid="quick-diagnosis-result"] button');
    return primaryButton ? getComputedStyle(primaryButton).backgroundColor : "";
  });
  // --primary token (globals.css): #c7d2fe after the pastel refresh.
  expect(primaryButtonBackground).toBe("rgb(199, 210, 254)");

  const resultBox = await result.boundingBox();
  expect(resultBox).not.toBeNull();
  expect(resultBox?.x || 0).toBeGreaterThanOrEqual(0);
  expect((resultBox?.x || 0) + (resultBox?.width || 0)).toBeLessThanOrEqual(320);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const note = page.getByTestId("quick-diagnosis-note");
  await note.scrollIntoViewIfNeeded();
  const noteBox = await note.boundingBox();
  const launcherBox = await page.getByRole("button", { name: "Open chatbot" }).boundingBox();
  expect(noteBox).not.toBeNull();
  expect(launcherBox).not.toBeNull();
  const overlapsLauncher =
    (noteBox?.x || 0) < (launcherBox?.x || 0) + (launcherBox?.width || 0) &&
    (noteBox?.x || 0) + (noteBox?.width || 0) > (launcherBox?.x || 0) &&
    (noteBox?.y || 0) < (launcherBox?.y || 0) + (launcherBox?.height || 0) &&
    (noteBox?.y || 0) + (noteBox?.height || 0) > (launcherBox?.y || 0);
  expect(overlapsLauncher).toBe(false);
});

test("landing -> diagnosis save -> admin lookup -> Agent question", async ({ page, request }) => {
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

});

test("RAG consult answers from the serving corpus (opt-in integration)", async ({ request }) => {
  // The consult route is wired to the OpenAI+Supabase serving core by design
  // (shared-openai-rag injects createRagQueryEmbedding), so it cannot run
  // against the hermetic e2e server, whose Supabase config is a dummy. The
  // live deploy canary (release:check:backend) asserts this same endpoint
  // against every real deployment; run it here only when explicitly pointed
  // at an environment with a real serving corpus.
  test.skip(!process.env.E2E_RAG_CONSULT, "needs a real Supabase serving corpus; covered by the deploy canary");
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

test("KAXI Typebot bubble loads the published flow and rejects a forged session", async ({ page, request }) => {
  await page.goto("/ko");
  const launcher = page.getByRole("button", { name: "Open chatbot" });
  await expect(launcher).toBeVisible();

  const configuration = await page.locator("typebot-bubble").evaluate((element) => {
    const bubble = element as HTMLElement & { typebot?: string; apiHost?: string };
    return { typebot: bubble.typebot, apiHost: bubble.apiHost };
  });
  expect(configuration).toEqual({
    typebot: "kaxi-rag-typebot",
    apiHost: "https://typebot.io",
  });

  await launcher.click();
  await expect(page.getByRole("button", { name: "Close chatbot" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "예: D-4 비자 연장에는 어떤 서류가 필요한가요?" })).toBeEnabled();

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

test("KAXI Typebot bubble stays usable on mobile and is hidden on account routes", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/en");
  const launcher = page.getByRole("button", { name: "Open chatbot" });
  await expect(launcher).toBeVisible();
  const launcherBox = await launcher.boundingBox();
  expect(launcherBox).not.toBeNull();
  expect((launcherBox?.x || 0) + (launcherBox?.width || 0)).toBeLessThanOrEqual(320);
  expect((launcherBox?.y || 0) + (launcherBox?.height || 0)).toBeLessThanOrEqual(568);

  await page.goto("/login");
  await expect(page.locator("typebot-bubble")).toHaveCount(0);
});

test("unauthenticated protected pages redirect at the proxy layer", async ({ page }) => {
  for (const path of ["/admin", "/student", "/partner"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
  // Login pages under protected prefixes must stay reachable (no loop).
  const partnerLogin = await page.goto("/partner/login");
  expect(partnerLogin?.status()).toBe(200);
});

test("docs workspace honors the track deep link for anonymous visitors", async ({ page }) => {
  await page.goto("/ko/docs?track=D-4");
  await expect(page).toHaveURL(/\/ko\/docs\?track=D-4$/);
  // Anonymous visitors keep the student-login banner; the page must not crash
  // and the deep link must survive the i18n proxy.
  await expect(page.getByText(/로그인/).first()).toBeVisible();
});
