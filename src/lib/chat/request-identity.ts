import { createHash, randomUUID } from "crypto";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function deterministicUuid(value: string) {
  const bytes = Buffer.from(createHash("sha256").update(value).digest().subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createChatRequestIdentity(input: {
  requestId: unknown;
  source: string;
  sessionId: string;
  question: string;
  now?: number;
}) {
  const externalRequestId = normalizeText(input.requestId, 80).toLowerCase();
  if (UUID_RE.test(externalRequestId)) {
    const requestId = deterministicUuid(`${input.source}\n${input.sessionId}\n${externalRequestId}`);
    return {
      requestId,
      idempotencyKey: `request:${requestId}`,
      externalRequestId,
    };
  }

  const window = Math.floor((input.now ?? Date.now()) / (5 * 60 * 1000));
  const digest = createHash("sha256")
    .update(`${input.source}\n${input.sessionId}\n${input.question}\n${window}`)
    .digest("hex");
  return {
    requestId: randomUUID(),
    idempotencyKey: `gateway:${digest}`,
    externalRequestId: externalRequestId || undefined,
  };
}
