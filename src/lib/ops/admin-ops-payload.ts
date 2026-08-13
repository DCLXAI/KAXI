import { getAiBackendDiagnostics } from "@/lib/ai/backend-selector";
import { getReadinessPayload } from "@/lib/ops/readiness";
import { getLatestRagSystemHealth } from "@/lib/ops/rag-system-health-status";
import { countOpenOpsEvents, listOpenOpsEvents } from "@/lib/ops/events";
import { getWorkerQueueMetrics } from "@/infrastructure/worker/job-repository";
import { findTraceSpans } from "@/infrastructure/observability/postgres-trace-exporter";
import { listDeadLetters } from "@/infrastructure/worker/dead-letter-repository";

export async function getAdminOpsPayload(input: { traceId?: string; requestId?: string } = {}) {
  const [aiBackend, readiness, systemHealth, openEvents, openEventCount, workerQueues, deadLetters, traceSpans] = await Promise.all([
    Promise.resolve(getAiBackendDiagnostics()),
    getReadinessPayload(),
    getLatestRagSystemHealth().catch(() => null),
    listOpenOpsEvents(),
    countOpenOpsEvents(),
    getWorkerQueueMetrics(),
    listDeadLetters(),
    input.traceId || input.requestId ? findTraceSpans(input) : [],
  ]);
  const aiBackendPolicyCheck = readiness.checks.find((check) => check.key === "ai.backend_policy");
  return {
    aiBackend,
    readiness: {
      status: readiness.status,
      environment: readiness.environment,
      production: readiness.production,
      checkedAt: readiness.checkedAt,
      checks: readiness.checks.map((check) => ({
        key: check.key,
        label: check.label,
        ok: check.ok,
        detail: check.detail,
        severity: check.severity,
      })),
      aiBackendPolicyCheck: aiBackendPolicyCheck ? {
        ok: aiBackendPolicyCheck.ok,
        severity: aiBackendPolicyCheck.severity,
        detail: aiBackendPolicyCheck.detail,
        metadata: aiBackendPolicyCheck.metadata,
      } : null,
    },
    systemHealth,
    openEvents,
    openEventCount,
    workerQueues,
    deadLetters,
    traceSpans,
  };
}
