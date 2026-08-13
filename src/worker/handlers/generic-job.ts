import type { ClaimedWorkerJob } from "@/infrastructure/worker/job-repository";
import { processOfficialSourceMonitorJob } from "@/worker/handlers/official-source-monitor";
import type { TenantContext } from "@/application/tenancy/tenant-context";

export async function processGenericWorkerJob(
  job: ClaimedWorkerJob,
  tenantContext: TenantContext,
  signal: AbortSignal,
): Promise<unknown> {
  switch (job.jobType) {
    case "official-source-monitor":
      return processOfficialSourceMonitorJob(job, signal);
    case "rag-serving-ingest": {
      const { ingestRagServingPayload } = await import("@/lib/knowledge/serving-projection");
      const payload = job.payload.payload;
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("RAG_INGESTION_PAYLOAD_INVALID");
      }
      return ingestRagServingPayload(payload as Record<string, unknown>, {
        tenantContext,
        providedEmbedding: job.payload.providedEmbedding,
      });
    }
    case "rag-serving-sync": {
      const { syncRagServingProjection } = await import("@/lib/knowledge/serving-projection");
      return syncRagServingProjection({
        tenantContext,
        limit: Math.min(500, Math.max(1, Number(job.payload.limit) || 100)),
        force: job.payload.force === true,
      });
    }
    case "embedding-sync": {
      const { embedMissingKnowledgeChunksForPgvector } = await import("@/lib/embeddings/pgvector-rag");
      return embedMissingKnowledgeChunksForPgvector({ force: job.payload.force === true });
    }
    case "document-ocr": {
      const { processDocumentOcr } = await import("@/lib/documents/ocr");
      const documentItemId = String(job.payload.documentItemId || "");
      if (!documentItemId) throw new Error("DOCUMENT_ITEM_ID_REQUIRED");
      return processDocumentOcr(documentItemId, {
        actor: "kaxi-worker",
        actorRole: "system",
        ip: null,
        userAgent: "kaxi-worker",
      });
    }
    case "document-verify": {
      const { verifyDocumentItem } = await import("@/lib/documents/verification");
      const documentItemId = String(job.payload.documentItemId || "");
      if (!documentItemId) throw new Error("DOCUMENT_ITEM_ID_REQUIRED");
      return verifyDocumentItem(documentItemId, job.payload.options as Record<string, unknown>);
    }
    case "document-verify-set": {
      const { verifyDocumentSet } = await import("@/lib/documents/verification");
      const options = job.payload.options;
      if (!options || typeof options !== "object" || Array.isArray(options)) {
        throw new Error("DOCUMENT_VERIFICATION_OPTIONS_REQUIRED");
      }
      return verifyDocumentSet(options as Record<string, unknown>);
    }
    case "rag-system-health": {
      const { runRagSystemHealth } = await import("@/lib/ops/rag-system-health");
      return runRagSystemHealth(String(job.payload.triggerSource || "worker"));
    }
    default:
      throw new Error(`WORKER_JOB_TYPE_UNSUPPORTED:${job.jobType}`);
  }
}
