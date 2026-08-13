export interface ClaimedOutboxEvent {
  id: string;
  tenantId: string;
  requestId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  traceId: string;
  attempts: number;
  maxAttempts: number;
  lockToken: string;
}

export interface OutboxRepository {
  claim(options: { limit?: number; leaseMs?: number; now?: Date }): Promise<ClaimedOutboxEvent[]>;
  markProcessed(event: Pick<ClaimedOutboxEvent, "id" | "lockToken">): Promise<void>;
  markFailed(
    event: Pick<ClaimedOutboxEvent, "id" | "lockToken" | "attempts" | "maxAttempts">,
    error: unknown,
    options: { now?: Date },
  ): Promise<{ deadLetter: boolean }>;
}

export interface OutboxDeliveryContext {
  /** Stable across retries; providers must use this as their idempotency key. */
  deliveryKey: string;
  traceId: string;
  requestId: string;
}

export type OutboxDelivery = (
  event: ClaimedOutboxEvent,
  context: OutboxDeliveryContext,
) => Promise<void>;

export async function processOutboxBatch(options: {
  deliver: OutboxDelivery;
  repository: OutboxRepository;
  observeDelivery?: <T>(event: ClaimedOutboxEvent, run: () => Promise<T>) => Promise<T>;
  limit?: number;
  leaseMs?: number;
  now?: Date;
}) {
  const events = await options.repository.claim({
    limit: options.limit,
    leaseMs: options.leaseMs,
    now: options.now,
  });
  let processed = 0;
  let retried = 0;
  let deadLettered = 0;

  for (const event of events) {
    try {
      const deliver = () => options.deliver(event, {
          deliveryKey: event.id,
          traceId: event.traceId,
          requestId: event.requestId,
        });
      await (options.observeDelivery ? options.observeDelivery(event, deliver) : deliver());
      await options.repository.markProcessed(event);
      processed += 1;
    } catch (error) {
      const failed = await options.repository.markFailed(event, error, {
        now: options.now,
      });
      if (failed.deadLetter) deadLettered += 1;
      else retried += 1;
    }
  }

  return { claimed: events.length, processed, retried, deadLettered };
}
