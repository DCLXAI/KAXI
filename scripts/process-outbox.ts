import { processOutboxBatch } from "../src/application/outbox/process-outbox";
import { deliverOperationalOutboxEvent } from "../src/infrastructure/outbox/ops-delivery";
import { prismaOutboxRepository } from "../src/infrastructure/outbox/repository";

const result = await processOutboxBatch({
  repository: prismaOutboxRepository,
  deliver: deliverOperationalOutboxEvent,
  limit: Number(process.env.OUTBOX_BATCH_SIZE || 25),
  leaseMs: Number(process.env.OUTBOX_LEASE_MS || 60_000),
});

console.log(JSON.stringify(result));
if (result.deadLettered > 0) process.exitCode = 1;
