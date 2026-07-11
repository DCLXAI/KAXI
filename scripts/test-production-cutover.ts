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
import { validatePublishedTypebotRuntime } from "../src/lib/typebot/runtime-health";

const expectedMigration = latestMigrationName();
assert.equal(expectedMigration, "20260711210000_rag_response_provenance");
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
  input: { id: "block_question", type: "text input" },
};
const safeContinuation = {
  messages: [
    { id: "block_answer", content: { richText: [{ children: [{ text: "합법적인 해결 절차를 담당자가 검토합니다." }] }] } },
    { id: "block_privacy_notice", content: { richText: [{ children: [{ text: "상담 정보 수집에 동의해 주세요." }] }] } },
  ],
  input: { id: "block_privacy_consent", type: "choice input" },
};
assert.deepEqual(typebotGateErrors(start, safeContinuation), []);
assert.deepEqual(validatePublishedTypebotRuntime(start, {
  messages: [
    { id: "block_answer", content: { richText: [{ children: [{ text: "주요 비용은 학비, 주거비, 보험료와 생활비입니다." }] }] } },
  ],
  input: { id: "block_followup", type: "choice input" },
}), []);
assert.match(
  validatePublishedTypebotRuntime(start, {
    messages: [
      { id: "block_loading", content: { richText: [{ children: [{ text: "문서 기준으로 확인하고 있어요." }] }] } },
      { id: "block_answer", content: { richText: [{ children: [{ text: "" }] }] } },
    ],
    input: { id: "block_followup", type: "choice input" },
  }).join(" "),
  /runtime failure/,
);
assert.match(
  typebotGateErrors(start, {
    messages: [{ id: "block_answer", content: { richText: [{ children: [{ text: "인증되지 않은 요청입니다." }] }] } }],
    input: { id: "block_lead_name", type: "text input" },
  }).join(" "),
  /runtime failure/,
);

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
