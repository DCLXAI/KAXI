import { strict as assert } from "assert";
import {
  declaredRequiredMigration,
  latestMigrationName,
  readinessGateErrors,
  typebotGateErrors,
} from "./check-production-cutover";
import { validatePublishedTypebotRuntime } from "../src/lib/typebot/runtime-health";

const expectedMigration = latestMigrationName();
assert.equal(expectedMigration, "20260710190000_handoff_consent_evidence");
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
  /enabled without a managed scanner/,
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
  typebotGateErrors(start, {
    messages: [{ id: "block_answer", content: { richText: [{ children: [{ text: "인증되지 않은 요청입니다." }] }] } }],
    input: { id: "block_lead_name", type: "text input" },
  }).join(" "),
  /runtime failure/,
);

console.log("PASS production cutover gates: source migration parity, backend readiness, safe attachment posture, and Typebot consent flow");
