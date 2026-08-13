import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/security";
import {
  getRagServingProjectionStatus,
} from "@/lib/knowledge/serving-projection";
import { enqueueWorkerJob } from "@/infrastructure/worker/job-repository";
import { requestTraceContext } from "@/infrastructure/observability/trace-context";
import { platformServiceTenantContext } from "@/application/tenancy/tenant-context";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req, { roles: ["owner", "admin", "viewer"] });
  if (unauthorized) return unauthorized;
  try {
    return NextResponse.json({ status: await getRagServingProjectionStatus() });
  } catch (error) {
    console.error("[GET /api/admin/rag-serving]", error);
    return NextResponse.json({ error: "RAG serving status unavailable" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req, { roles: ["owner", "admin"] });
  if (unauthorized) return unauthorized;
  try {
    const body = await req.json().catch(() => ({}));
    const trace = requestTraceContext(req.headers);
    const job = await enqueueWorkerJob({
      tenantContext: platformServiceTenantContext("admin-rag-serving"),
      requestId: req.headers.get("x-request-id")?.trim().slice(0, 128) || crypto.randomUUID(),
      jobType: "rag-serving-sync",
      idempotencyKey: req.headers.get("x-idempotency-key") || crypto.randomUUID(),
      payload: {
        limit: Math.min(500, Math.max(1, Number.parseInt(String(body?.limit || "10"), 10) || 10)),
        force: body?.force === true,
      },
      traceId: trace.traceId,
      traceparent: trace.traceparent,
      timeoutMs: 10 * 60_000,
      deadlineAt: new Date(Date.now() + 2 * 60 * 60_000),
    });
    return NextResponse.json({ accepted: true, executionOwner: "kaxi-worker", job }, { status: 202 });
  } catch (error) {
    console.error("[POST /api/admin/rag-serving]", error);
    return NextResponse.json({ error: "RAG serving sync failed" }, { status: 503 });
  }
}
