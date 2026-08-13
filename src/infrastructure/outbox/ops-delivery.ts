import type { OutboxDelivery } from "@/application/outbox/process-outbox";
import { recordOpsEvent } from "@/lib/ops/events";

export const deliverOperationalOutboxEvent: OutboxDelivery = async (event, context) => {
  if (event.eventType !== "handoff.created") return;
  await recordOpsEvent({
    source: "kaxi-transactional-outbox",
    severity: "warning",
    eventType: event.eventType,
    executionId: context.deliveryKey,
    message: "A canonical human handoff is ready for operational review.",
    payload: {
      outboxEventId: event.id,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      tenantId: event.tenantId,
      traceId: context.traceId,
      ...event.payload,
    },
  });
};
