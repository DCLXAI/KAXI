import {
  runtimeEnvironment,
  setRuntimeEnvironmentDefault,
} from "@/infrastructure/config/runtime-environment";
import { createServer } from "http";
import { getWorkerQueueMetrics } from "@/infrastructure/worker/job-repository";
import { structuredLog } from "@/infrastructure/observability/structured-log";
import { db } from "@/lib/db";
import { runWorkerCycle } from "@/worker/runner";
import { registerTraceExporter } from "@/infrastructure/observability/tracing";
import { exportSpanToPostgres } from "@/infrastructure/observability/postgres-trace-exporter";

setRuntimeEnvironmentDefault("KAXI_SERVICE_NAME", "kaxi-worker");
registerTraceExporter(exportSpanToPostgres);

const pollMs = Math.min(60_000, Math.max(500, Number(runtimeEnvironment().WORKER_POLL_MS) || 2_000));
const port = Math.min(65_535, Math.max(1, Number(runtimeEnvironment().PORT) || 3_001));
let stopping = false;
let running = false;
let lastCycleAt: string | null = null;
let lastCycleError: string | null = null;

const server = createServer(async (request, response) => {
  if (request.url === "/healthz") {
    response.writeHead(stopping ? 503 : 200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: !stopping, running, lastCycleAt, lastCycleError }));
    return;
  }
  if (request.url === "/metrics") {
    try {
      const queues = await getWorkerQueueMetrics();
      response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
      response.end(JSON.stringify({ checkedAt: new Date().toISOString(), queues }));
    } catch {
      response.writeHead(503, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "metrics_unavailable" }));
    }
    return;
  }
  response.writeHead(404).end();
});

server.listen(port, "::", () => {
  structuredLog({
    level: "info",
    event: "worker.started",
    service: "kaxi-worker",
    fields: { port, pollMs },
  });
});

async function loop() {
  while (!stopping) {
    running = true;
    try {
      const result = await runWorkerCycle();
      lastCycleAt = new Date().toISOString();
      lastCycleError = null;
      const worked = result.jobs.claimed + result.outbox.claimed + result.attachments.claimed;
      if (worked > 0) {
        structuredLog({
          level: "info",
          event: "worker.cycle.completed",
          service: "kaxi-worker",
          fields: { result },
        });
      }
    } catch (error) {
      lastCycleError = error instanceof Error ? error.message.slice(0, 240) : String(error).slice(0, 240);
      structuredLog({
        level: "error",
        event: "worker.cycle.failed",
        service: "kaxi-worker",
        fields: { error },
      });
    } finally {
      running = false;
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}

async function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  structuredLog({ level: "info", event: "worker.stopping", service: "kaxi-worker", fields: { signal } });
  server.close();
  const deadline = Date.now() + 30_000;
  while (running && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  await db.$disconnect();
  process.exit(running ? 1 : 0);
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
void loop();
