import {
  createN8nVerificationReceipt,
  createTypebotHandoffToken,
  signN8nPayload,
  verifyN8nSignature,
  verifyN8nVerificationReceipt,
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
const rotatedEnv = {
  ...env,
  N8N_WEBHOOK_SIGNING_SECRET: "rotated-signing-secret-that-is-longer-than-32-characters",
  N8N_WEBHOOK_SIGNING_SECRET_PREVIOUS: env.N8N_WEBHOOK_SIGNING_SECRET,
};
assert(
  verifyN8nSignature(signed.envelope, { env: rotatedEnv, now }).ok,
  "previous n8n signature should pass during the overlap window",
);
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
  verifyTypebotHandoffToken("typebot-result-123", handoffToken, { env: rotatedEnv, now }),
  "previous Typebot handoff token should pass during n8n secret rotation",
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

const verificationReceipt = createN8nVerificationReceipt(
  "typebot-runtime",
  payload,
  signed.envelope.nonce,
  { env, now },
);
assert(
  verifyN8nVerificationReceipt(verificationReceipt, "typebot-runtime", payload, { env, now }).ok,
  "verified n8n payload receipt should pass",
);
assert(
  verifyN8nVerificationReceipt(verificationReceipt, "typebot-runtime", payload, { env: rotatedEnv, now }).ok,
  "verification receipt should pass during secret rotation",
);
assert(
  !verifyN8nVerificationReceipt(
    verificationReceipt,
    "typebot-runtime",
    { ...payload, question: "tampered" },
    { env, now },
  ).ok,
  "verification receipt must be bound to the exact payload",
);
assert(
  !verifyN8nVerificationReceipt(verificationReceipt, "rag-ingestion", payload, { env, now }).ok,
  "verification receipt must be bound to its purpose",
);
assert(
  !verifyN8nVerificationReceipt(verificationReceipt, "typebot-runtime", payload, { env, now: now + 61_000 }).ok,
  "expired verification receipt should fail",
);

console.log("PASS n8n HMAC signature and short-lived payload receipt verification");
