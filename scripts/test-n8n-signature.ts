import {
  createTypebotHandoffToken,
  signN8nPayload,
  verifyN8nSignature,
  verifyTypebotHandoffToken,
} from "../src/lib/n8n/signature";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const now = Date.now();
const env = {
  ...process.env,
  N8N_TYPEBOT_RAG_WEBHOOK_URL: "https://example.test/webhook/typebot-rag-runtime",
  N8N_WEBHOOK_SIGNING_SECRET: "test-signing-secret-that-is-longer-than-32-characters",
  N8N_WEBHOOK_MAX_AGE_SECONDS: "300",
};
const payload = { question: "D-4 준비 서류", nested: { z: 1, a: true } };
const signed = signN8nPayload("typebot-runtime", payload, {
  env,
  now,
  nonce: "12345678-1234-4234-9234-123456789012",
});

assert(verifyN8nSignature(signed.envelope, { env, now }).ok, "valid signature should pass");
assert(
  !verifyN8nSignature({ ...signed.envelope, payload: { question: "tampered" } }, { env, now }).ok,
  "tampered payload should fail",
);

const handoffToken = createTypebotHandoffToken("typebot-result-123", { env, now });
assert(
  verifyTypebotHandoffToken("typebot-result-123", handoffToken, { env, now }),
  "matching Typebot handoff token should pass",
);
assert(
  !verifyTypebotHandoffToken("typebot-another-result", handoffToken, { env, now }),
  "handoff token must be bound to its Typebot session",
);
assert(
  !verifyN8nSignature(signed.envelope, { env, now: now + 301_000 }).ok,
  "expired signature should fail",
);
assert(
  !verifyN8nSignature({ ...signed.envelope, nonce: "short" }, { env, now }).ok,
  "invalid nonce should fail",
);

console.log("PASS n8n HMAC signature: valid, tampered, expired, and malformed requests verified");
