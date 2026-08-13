import assert from "node:assert/strict";
import { prepareTestDb } from "./prepare-test-db";

prepareTestDb("worker queue load");
process.env.NODE_ENV = "test";
const { db } = await import("../src/lib/db");
const { platformServiceTenantContext } = await import("../src/application/tenancy/tenant-context");
const { enqueueWorkerJob, claimWorkerJobs } = await import("../src/infrastructure/worker/job-repository");

const tenantContext = platformServiceTenantContext("worker-load-test");
const total = 250;
await Promise.all(Array.from({ length: total }, (_, index) => enqueueWorkerJob({
  tenantContext,
  requestId: `load-request-${index}`,
  jobType: "rag-serving-sync",
  idempotencyKey: `load-${index}`,
  traceId: `trace-load-${index}`,
  payload: { index },
})));
assert.equal(await db.workerJob.count({ where: { status: "queued" } }), total);

const claimedIds = new Set<string>();
const startedAt = performance.now();
while (claimedIds.size < total) {
  const batch = await claimWorkerJobs({ tenantContext, limit: 25, leaseMs: 30_000 });
  assert(batch.length > 0, "queue stopped yielding before all jobs were claimed");
  for (const job of batch) {
    assert(!claimedIds.has(job.id), "SKIP LOCKED claim returned a duplicate job");
    claimedIds.add(job.id);
  }
}
const durationMs = performance.now() - startedAt;
assert.equal(claimedIds.size, total);
assert(durationMs < 10_000, `claiming ${total} jobs took ${durationMs.toFixed(0)}ms`);
console.log(`PASS worker load: ${total} unique leased claims in ${durationMs.toFixed(0)}ms`);
await db.$disconnect();
