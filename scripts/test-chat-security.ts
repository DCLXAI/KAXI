import { strict as assert } from "assert";
import { JsonBodyError, readJsonBody } from "../src/lib/api/json-body";
import { CHAT_ATTACHMENT_MIME_TYPES, detectChatAttachmentMimeType } from "../src/lib/chat/attachment-files";
import sharp from "sharp";
import {
  getChatAttachmentSecurityDiagnostics,
  isTerminalChatAttachmentError,
  secureChatAttachmentUpload,
  UnsafeChatAttachmentError,
} from "../src/lib/chat/attachment-security";
import { inferChatCategory } from "../src/lib/chat/category";
import { createChatRequestIdentity } from "../src/lib/chat/request-identity";
import {
  isTypebotGatewayAuthConfigured,
  TYPEBOT_GATEWAY_HEADER,
  verifyTypebotGatewayHeaders,
} from "../src/lib/typebot/gateway-auth";
import {
  CHAT_SESSION_MAX_AGE_SECONDS,
  createKaxiSessionId,
  issueChatSessionToken,
  verifyChatSessionToken,
} from "../src/lib/chat/session-token";

process.env.CHAT_SESSION_SIGNING_SECRET = "chat-security-test-secret-that-is-longer-than-thirty-two-characters";

const now = Date.UTC(2026, 6, 10, 0, 0, 0);
const sessionId = createKaxiSessionId();
const token = issueChatSessionToken(sessionId, now);

assert.equal(verifyChatSessionToken(token, sessionId, now + 1000)?.sessionId, sessionId);
assert.equal(verifyChatSessionToken(`${token.slice(0, -1)}x`, sessionId, now + 1000), null);
assert.equal(verifyChatSessionToken(token, createKaxiSessionId(), now + 1000), null);
assert.equal(verifyChatSessionToken(token, sessionId, now + (CHAT_SESSION_MAX_AGE_SECONDS + 1) * 1000), null);

const fixtures = [
  [Buffer.from([0xff, 0xd8, 0xff, 0xe0]), "image/jpeg"],
  [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png"],
  [Buffer.from("RIFF1234WEBP", "ascii"), "image/webp"],
  [Buffer.from("%PDF-1.7", "ascii"), "application/pdf"],
] as const;

for (const [bytes, mimeType] of fixtures) {
  assert.equal(detectChatAttachmentMimeType(bytes), mimeType);
  assert.equal(CHAT_ATTACHMENT_MIME_TYPES.has(mimeType), true);
}
assert.equal(detectChatAttachmentMimeType(Buffer.from("<script>alert(1)</script>")), null);

const safeImage = await sharp({
  create: { width: 24, height: 24, channels: 3, background: { r: 255, g: 255, b: 255 } },
}).jpeg().withExif({ IFD0: { Copyright: "strip-me" } }).toBuffer();
assert.ok((await sharp(safeImage).metadata()).exif);
const securedImage = await secureChatAttachmentUpload(safeImage, "image/jpeg", {
  NODE_ENV: "test",
  ATTACHMENT_MALWARE_SCAN_MODE: "structural",
} as NodeJS.ProcessEnv);
assert.equal(detectChatAttachmentMimeType(securedImage.bytes), "image/jpeg");
assert.equal(securedImage.sanitized, true);
assert.equal(securedImage.scan.status, "structural-clean");
assert.equal((await sharp(securedImage.bytes).metadata()).exif, undefined);

await assert.rejects(
  () => secureChatAttachmentUpload(
    Buffer.from("%PDF-1.7\n1 0 obj << /OpenAction 2 0 R /JavaScript (alert) >>\nendobj\n%%EOF"),
    "application/pdf",
    { NODE_ENV: "test", ATTACHMENT_MALWARE_SCAN_MODE: "structural" } as NodeJS.ProcessEnv,
  ),
  (error: unknown) => error instanceof UnsafeChatAttachmentError && error.code === "pdf_active_content_rejected",
);
assert.equal(isTerminalChatAttachmentError(new Error("sha256_mismatch")), true);
assert.equal(isTerminalChatAttachmentError(new Error("storage_download_failed")), false);
const securityDiagnostics = getChatAttachmentSecurityDiagnostics({
  NODE_ENV: "test",
  ATTACHMENT_MALWARE_SCAN_MODE: "http",
} as NodeJS.ProcessEnv);
assert.equal(securityDiagnostics.ready, false);
assert.equal(securityDiagnostics.externalScannerRequired, true);
assert.equal(securityDiagnostics.uploadsEnabled, false);

const productionDisabledDiagnostics = getChatAttachmentSecurityDiagnostics({
  NODE_ENV: "production",
} as NodeJS.ProcessEnv);
assert.equal(productionDisabledDiagnostics.uploadsRequested, false);
assert.equal(productionDisabledDiagnostics.uploadsEnabled, false);
assert.equal(productionDisabledDiagnostics.ready, true);

const productionUnsafeEnableDiagnostics = getChatAttachmentSecurityDiagnostics({
  NODE_ENV: "production",
  CHAT_ATTACHMENTS_ENABLED: "true",
} as NodeJS.ProcessEnv);
assert.equal(productionUnsafeEnableDiagnostics.uploadsRequested, true);
assert.equal(productionUnsafeEnableDiagnostics.uploadsEnabled, false);
assert.equal(productionUnsafeEnableDiagnostics.ready, false);

const productionManagedDiagnostics = getChatAttachmentSecurityDiagnostics({
  NODE_ENV: "production",
  CHAT_ATTACHMENTS_ENABLED: "true",
  ATTACHMENT_MALWARE_SCAN_MODE: "http",
  ATTACHMENT_MALWARE_SCAN_URL: "https://scanner.example.test/v1/scan",
  ATTACHMENT_MALWARE_SCAN_TOKEN: "managed-scanner-test-token",
} as NodeJS.ProcessEnv);
assert.equal(productionManagedDiagnostics.externalScannerConfigured, true);
assert.equal(productionManagedDiagnostics.uploadsEnabled, true);
assert.equal(productionManagedDiagnostics.ready, true);

assert.equal(inferChatCategory("D-4 비자 연장 방법"), "visa");
assert.equal(inferChatCategory("입학허가서와 재정 증빙 서류"), "documents");
assert.equal(inferChatCategory("어학당과 대학교를 비교해 주세요"), "school");
assert.equal(inferChatCategory("학비와 수수료가 얼마예요?"), "cost");
assert.equal(inferChatCategory("D-2 서류", "school"), "school");
assert.equal(inferChatCategory("D-2 서류", "{{category}}"), "visa");

const typebotEnv = {
  NODE_ENV: "test",
  TYPEBOT_GATEWAY_SECRET: "typebot-gateway-test-secret-that-is-longer-than-thirty-two-characters",
} as NodeJS.ProcessEnv;
assert.equal(isTypebotGatewayAuthConfigured(typebotEnv), true);
assert.equal(
  isTypebotGatewayAuthConfigured({ NODE_ENV: "test", TYPEBOT_GATEWAY_SECRET: "short" } as NodeJS.ProcessEnv),
  false,
);
assert.equal(
  verifyTypebotGatewayHeaders(
    new Headers({ [TYPEBOT_GATEWAY_HEADER]: typebotEnv.TYPEBOT_GATEWAY_SECRET || "" }),
    typebotEnv,
  ),
  true,
);
assert.equal(
  verifyTypebotGatewayHeaders(new Headers({ authorization: `Bearer ${typebotEnv.TYPEBOT_GATEWAY_SECRET}` }), typebotEnv),
  true,
);
assert.equal(verifyTypebotGatewayHeaders(new Headers({ [TYPEBOT_GATEWAY_HEADER]: "wrong" }), typebotEnv), false);

const externalRequestId = "86d859c4-fb4d-4c74-b5c9-15e35c331ad4";
const firstIdentity = createChatRequestIdentity({
  requestId: externalRequestId,
  source: "kaxi-site",
  sessionId: "kaxi-session-a",
  question: "D-4 비자 서류",
});
const retryIdentity = createChatRequestIdentity({
  requestId: externalRequestId,
  source: "kaxi-site",
  sessionId: "kaxi-session-a",
  question: "D-4 비자 서류",
});
const otherSessionIdentity = createChatRequestIdentity({
  requestId: externalRequestId,
  source: "kaxi-site",
  sessionId: "kaxi-session-b",
  question: "D-4 비자 서류",
});
assert.equal(firstIdentity.requestId, retryIdentity.requestId);
assert.equal(firstIdentity.idempotencyKey, retryIdentity.idempotencyKey);
assert.notEqual(firstIdentity.requestId, otherSessionIdentity.requestId);
assert.notEqual(firstIdentity.idempotencyKey, otherSessionIdentity.idempotencyKey);

const parsedBody = await readJsonBody<{ locale: string }>(
  new Request("https://kaxi.test/api/chat-session", {
    method: "POST",
    body: JSON.stringify({ locale: "ko" }),
  }),
  1024,
);
assert.equal(parsedBody.locale, "ko");

await assert.rejects(
  () => readJsonBody(
    new Request("https://kaxi.test/api/typebot-rag", {
      method: "POST",
      body: JSON.stringify({ question: "x".repeat(2048) }),
    }),
    128,
  ),
  (error: unknown) => error instanceof JsonBodyError && error.status === 413,
);

await assert.rejects(
  () => readJsonBody(
    new Request("https://kaxi.test/api/chat-session", { method: "POST", body: "{invalid" }),
    1024,
  ),
  (error: unknown) => error instanceof JsonBodyError && error.status === 400,
);

console.log("PASS chat security: signed ownership, Typebot gateway auth, bounded JSON, category inference, expiry, tamper protection, and magic-byte allowlist");
