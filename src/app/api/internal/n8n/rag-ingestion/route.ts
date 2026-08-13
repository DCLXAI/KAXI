import { runtimeEnvironment } from "@/infrastructure/config/runtime-environment";
import { NextRequest, NextResponse } from "next/server";
import { JsonBodyError, readJsonBody } from "@/lib/api/json-body";
import { parseLimit, rateLimit } from "@/lib/api/security";
import { verifyN8nVerificationReceipt } from "@/lib/n8n/signature";
import { enqueueWorkerJob } from "@/infrastructure/worker/job-repository";
import { requestTraceContext } from "@/infrastructure/observability/trace-context";
import { tenantContextFromVerifiedChannelPayload } from "@/application/tenancy/tenant-context";

export const runtime = "nodejs";
export const maxDuration = 60;

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, {
    key: "n8n-rag-ingestion-core",
    limit: parseLimit(runtimeEnvironment().N8N_RAG_INGESTION_RATE_LIMIT, 120),
    windowMs: 60 * 1000,
  });
  if (limited) return limited;

  try {
    const body = await readJsonBody<Record<string, unknown>>(req, 128 * 1024);
    const verificationToken = text(body.verificationToken, 4_500);
    const payload = record(body.payload);
    if (!verificationToken || !payload) {
      return NextResponse.json({ ok: false, error: "Invalid verified ingestion request" }, { status: 400 });
    }
    const verified = verifyN8nVerificationReceipt(
      verificationToken,
      "rag-ingestion",
      payload,
    );
    if (!verified.ok) {
      return NextResponse.json({ ok: false, error: "Invalid or expired verification receipt" }, { status: 401 });
    }

    // chunkEmbedding is top-level, OUTSIDE the receipt-bound payload: the
    // verification receipt binds the payloadHash KARXY originally signed, and
    // n8n attaches its computed vector alongside. The Worker validates it in
    // the governed writer without loading ingestion dependencies in Web.
    const trace = requestTraceContext(req.headers);
    const tenantContext = tenantContextFromVerifiedChannelPayload({
      tenantId: payload.tenant_id,
      purpose: "rag-ingestion",
      nonce: verified.claims.nonce,
      verified: true,
    });
    const job = await enqueueWorkerJob({
      tenantContext,
      requestId: text(payload.requestId, 128) || verified.claims.nonce,
      jobType: "rag-serving-ingest",
      idempotencyKey: text(payload.idempotencyKey, 180) || verified.claims.nonce,
      payload: { payload, providedEmbedding: body.chunkEmbedding },
      traceId: trace.traceId,
      traceparent: trace.traceparent,
      timeoutMs: 5 * 60_000,
      deadlineAt: new Date(Date.now() + 60 * 60_000),
    });
    return NextResponse.json({ ok: true, accepted: true, executionOwner: "kaxi-worker", job }, { status: 202 });
  } catch (error) {
    if (error instanceof JsonBodyError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    if (
      error instanceof Error
      && (error.message === "RAG_INGESTION_PAYLOAD_INVALID"
        || error.message === "RAG_INGESTION_SOURCE_NOT_ELIGIBLE")
    ) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 422 });
    }
    console.error("[POST /api/internal/n8n/rag-ingestion]", error);
    return NextResponse.json({ ok: false, error: "RAG ingestion unavailable" }, { status: 503 });
  }
}
