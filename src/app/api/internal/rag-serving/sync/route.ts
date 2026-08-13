import { NextRequest, NextResponse } from "next/server";
import { JsonBodyError, readJsonBody } from "@/lib/api/json-body";
import { enqueueWorkerJob } from "@/infrastructure/worker/job-repository";
import { requestTraceContext } from "@/infrastructure/observability/trace-context";
import { platformServiceTenantContext } from "@/application/tenancy/tenant-context";
import {
  N8N_NONCE_HEADER,
  N8N_PURPOSE_HEADER,
  N8N_SIGNATURE_HEADER,
  N8N_TIMESTAMP_HEADER,
  verifyAndConsumeN8nSignature,
} from "@/lib/n8n/signature";

export const runtime = "nodejs";
export const maxDuration = 300;

function boundedLimit(value: unknown) {
  const parsed = Number.parseInt(String(value || "3"), 10);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 10) : 3;
}

export async function POST(req: NextRequest) {
  try {
    const payload = await readJsonBody<Record<string, unknown>>(req, 16 * 1024);
    if (payload.action !== "sync-rag-serving") {
      return NextResponse.json({ error: "Invalid operation" }, { status: 400 });
    }

    const purpose = req.headers.get(N8N_PURPOSE_HEADER) || "";
    if (purpose !== "rag-ingestion") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const verification = await verifyAndConsumeN8nSignature({
      purpose,
      timestamp: req.headers.get(N8N_TIMESTAMP_HEADER) || "",
      nonce: req.headers.get(N8N_NONCE_HEADER) || "",
      signature: req.headers.get(N8N_SIGNATURE_HEADER) || "",
      payload,
    });
    if (!verification.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const trace = requestTraceContext(req.headers);
    const job = await enqueueWorkerJob({
      tenantContext: platformServiceTenantContext("internal-rag-serving-sync"),
      requestId: req.headers.get("x-request-id")?.trim().slice(0, 128)
        || req.headers.get(N8N_NONCE_HEADER)?.trim().slice(0, 128)
        || crypto.randomUUID(),
      jobType: "rag-serving-sync",
      idempotencyKey: req.headers.get(N8N_NONCE_HEADER) || crypto.randomUUID(),
      payload: { limit: boundedLimit(payload.limit), force: payload.force === true },
      traceId: trace.traceId,
      traceparent: trace.traceparent,
      timeoutMs: 10 * 60_000,
      deadlineAt: new Date(Date.now() + 2 * 60 * 60_000),
    });
    return NextResponse.json({ accepted: true, executionOwner: "kaxi-worker", job }, { status: 202 });
  } catch (error) {
    if (error instanceof JsonBodyError) {
      return NextResponse.json({ error: "Invalid request" }, { status: error.status });
    }
    console.error("[POST /api/internal/rag-serving/sync]", error);
    return NextResponse.json({ error: "RAG serving sync failed" }, { status: 503 });
  }
}
