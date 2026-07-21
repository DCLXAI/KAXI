import { strict as assert } from "assert";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  cookieHeaderFromNetscapeFile,
  declaredRequiredMigration,
  latestMigrationName,
  readinessGateErrors,
  typebotGateErrors,
} from "./check-production-cutover";
import {
  TYPEBOT_RUNTIME_LOCALES,
  typebotRuntimeBlockId,
  validatePublishedTypebotFallbackRuntime,
  validatePublishedTypebotRuntime,
  validatePublishedTypebotStart,
} from "../src/lib/typebot/runtime-health";

const expectedMigration = latestMigrationName();
assert.equal(expectedMigration, "20260721210000_chat_session_user_link");
assert.equal(declaredRequiredMigration(), expectedMigration);

const readyPayload = {
  status: "ready",
  checks: [
    { key: "database.schema_parity", ok: true, metadata: { latestMigration: expectedMigration } },
    { key: "ai.backend_policy", ok: true },
    { key: "typebot.gateway_auth", ok: true },
    { key: "chat.attachment_ocr_provider", ok: true },
    {
      key: "chat.attachment_malware_scanner",
      ok: true,
      metadata: { uploadsEnabled: false, externalScannerConfigured: false },
    },
  ],
};
assert.deepEqual(readinessGateErrors(readyPayload, expectedMigration), []);
assert.match(
  readinessGateErrors({
    ...readyPayload,
    checks: readyPayload.checks.map((check) => check.key === "database.schema_parity"
      ? { ...check, metadata: { latestMigration: "20260710180000_n8n_audit_metadata_only" } }
      : check),
  }, expectedMigration).join(" "),
  /does not match/,
);
assert.match(
  readinessGateErrors({
    ...readyPayload,
    checks: readyPayload.checks.map((check) => check.key === "chat.attachment_malware_scanner"
      ? { ...check, metadata: { uploadsEnabled: true, externalScannerConfigured: false } }
      : check),
  }, expectedMigration).join(" "),
  /enabled without an approved scanner policy/,
);
assert.deepEqual(
  readinessGateErrors({
    ...readyPayload,
    checks: readyPayload.checks.map((check) => check.key === "chat.attachment_malware_scanner"
      ? {
          ...check,
          metadata: {
            uploadsEnabled: true,
            externalScannerConfigured: false,
            externalScannerRequired: false,
            structuralSanitization: true,
            mode: "structural",
          },
        }
      : check),
  }, expectedMigration),
  [],
);

const start = {
  sessionId: "session-1",
  typebot: { publishedAt: "2026-07-10T00:00:00.000Z" },
  input: { id: "block_ko_question", type: "text input" },
};
const safeContinuation = {
  messages: [
    { id: "block_ko_answer", content: { richText: [{ children: [{ text: "합법적인 해결 절차를 담당자가 검토합니다." }] }] } },
    { id: "block_ko_privacy_notice", content: { richText: [{ children: [{ text: "상담 정보 수집에 동의해 주세요." }] }] } },
  ],
  input: { id: "block_ko_privacy_consent", type: "choice input" },
};
assert.deepEqual(typebotGateErrors(start, safeContinuation), []);
assert.deepEqual(validatePublishedTypebotRuntime(start, {
  messages: [
    { id: "block_ko_answer", content: { richText: [{ children: [{ text: "주요 비용은 학비, 주거비, 보험료와 생활비입니다." }] }] } },
  ],
  input: { id: "block_ko_followup", type: "choice input" },
}), []);
assert.match(
  validatePublishedTypebotRuntime(start, {
    messages: [
      { id: "block_ko_loading", content: { richText: [{ children: [{ text: "문서 기준으로 확인하고 있어요." }] }] } },
      { id: "block_ko_answer", content: { richText: [{ children: [{ text: "" }] }] } },
    ],
    input: { id: "block_ko_followup", type: "choice input" },
  }).join(" "),
  /runtime failure/,
);
assert.match(
  validatePublishedTypebotRuntime(start, {
    messages: [
      { id: "block_ko_persistence_warning", content: { richText: [{ children: [{ text: "대화 기록 저장을 확인하지 못했어요." }] }] } },
      { id: "block_ko_answer", content: { richText: [{ children: [{ text: "문서 기준 답변입니다." }] }] } },
    ],
    input: { id: "block_ko_followup", type: "choice input" },
  }).join(" "),
  /chat persistence was not confirmed/,
);
assert.match(
  validatePublishedTypebotRuntime(start, {
    messages: [
      { id: "block_ko_answer", content: { richText: [{ children: [{ text: "담당자 연결이 필요합니다." }] }] } },
      { id: "block_ko_handoff_failed", content: { richText: [{ children: [{ text: "상담 요청을 저장하지 못했어요." }] }] } },
    ],
    input: { id: "block_ko_handoff_failed_choice", type: "choice input" },
  }).join(" "),
  /handoff persistence was not confirmed/,
);
assert.match(
  typebotGateErrors(start, {
    messages: [{ id: "block_ko_answer", content: { richText: [{ children: [{ text: "인증되지 않은 요청입니다." }] }] } }],
    input: { id: "block_ko_lead_name", type: "text input" },
  }).join(" "),
  /runtime failure/,
);

for (const locale of TYPEBOT_RUNTIME_LOCALES) {
  const localizedStart = {
    ...start,
    input: { id: typebotRuntimeBlockId(locale, "question"), type: "text input" },
  };
  assert.deepEqual(validatePublishedTypebotStart(localizedStart, locale), []);
  assert.deepEqual(
    validatePublishedTypebotFallbackRuntime(localizedStart, {
      messages: [{
        id: typebotRuntimeBlockId(locale, "no_context"),
        content: { richText: [{ children: [{ text: "localized no-context guidance" }] }] },
      }],
      input: { id: typebotRuntimeBlockId(locale, "followup"), type: "choice input" },
    }, { locale, expected: "no-context" }),
    [],
  );
  assert.deepEqual(
    validatePublishedTypebotFallbackRuntime(localizedStart, {
      messages: [{
        id: typebotRuntimeBlockId(locale, "http_failed"),
        content: { richText: [{ children: [{ text: "localized retry guidance" }] }] },
      }],
      input: { id: typebotRuntimeBlockId(locale, "http_failed_choice"), type: "choice input" },
    }, { locale, expected: "http-error" }),
    [],
  );
}

const cookieDir = mkdtempSync(join(tmpdir(), "kaxi-cutover-cookie-"));
const cookieFile = join(cookieDir, "cookies.txt");
writeFileSync(
  cookieFile,
  [
    "# Netscape HTTP Cookie File",
    "#HttpOnly_kaxi-canary.vercel.app\tFALSE\t/\tTRUE\t4102444800\t_vercel_jwt\tfake-test-token",
  ].join("\n"),
  "utf8",
);
assert.equal(
  cookieHeaderFromNetscapeFile(cookieFile, "https://kaxi-canary.vercel.app/api/readiness"),
  "_vercel_jwt=fake-test-token",
);
assert.throws(
  () => cookieHeaderFromNetscapeFile(cookieFile, "https://another-project.vercel.app/api/readiness"),
  /no cookie for the canary URL/,
);
rmSync(cookieDir, { recursive: true, force: true });

console.log("PASS production cutover gates: source migration parity, protected canary auth, backend readiness, safe attachment posture, and Typebot consent flow");
