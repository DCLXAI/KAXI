import {
  assertTenantContext,
  platformOperatorTenantContext,
  type TenantContext,
} from "@/application/tenancy/tenant-context";

export const DEAD_LETTER_KINDS = ["worker", "outbox", "attachment"] as const;
export type DeadLetterKind = typeof DEAD_LETTER_KINDS[number];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface DeadLetterItem {
  kind: DeadLetterKind;
  id: string;
  tenantId: string;
  queue: string;
  status: "dead_letter" | "failed";
  attempts: number;
  maxAttempts: number;
  traceId: string | null;
  createdAt: Date;
  completedAt: Date | null;
  failureCode: string;
}

export interface DeadLetterRepository {
  describe(kind: DeadLetterKind, id: string): Promise<DeadLetterItem | null>;
  replay(item: DeadLetterItem, tenantContext: TenantContext, now: Date): Promise<boolean>;
}

export class DeadLetterReplayError extends Error {
  constructor(
    readonly code:
      | "DEAD_LETTER_INPUT_INVALID"
      | "DEAD_LETTER_NOT_FOUND"
      | "DEAD_LETTER_ALREADY_REPLAYED",
    readonly status: 400 | 404 | 409,
  ) {
    super(code);
    this.name = "DeadLetterReplayError";
  }
}

export async function replayDeadLetter(input: {
  operatorContext: TenantContext;
  actor: string;
  kind: DeadLetterKind;
  id: string;
  reason: string;
  confirmation: string;
  now?: Date;
}, repository: DeadLetterRepository) {
  assertTenantContext(input.operatorContext);
  if (input.operatorContext.source !== "platform-service" || !input.actor.trim()) {
    throw new Error("PLATFORM_OPERATOR_AUTHORITY_REQUIRED");
  }
  if (
    !DEAD_LETTER_KINDS.includes(input.kind)
    || !UUID_PATTERN.test(input.id)
    || input.confirmation !== "REPLAY"
    || input.reason.trim().length < 8
    || input.reason.trim().length > 500
  ) {
    throw new DeadLetterReplayError("DEAD_LETTER_INPUT_INVALID", 400);
  }

  const item = await repository.describe(input.kind, input.id);
  if (!item) throw new DeadLetterReplayError("DEAD_LETTER_NOT_FOUND", 404);
  const targetContext = platformOperatorTenantContext({
    tenantId: item.tenantId,
    actor: input.actor,
    authorized: true,
    now: input.now?.getTime(),
  });
  const replayedAt = input.now || new Date();
  const replayed = await repository.replay(item, targetContext, replayedAt);
  if (!replayed) throw new DeadLetterReplayError("DEAD_LETTER_ALREADY_REPLAYED", 409);
  return { before: item, status: "queued" as const, replayedAt, reason: input.reason.trim() };
}
