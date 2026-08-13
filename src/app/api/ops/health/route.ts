import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/security";
import { authorizeCronRequest } from "@/lib/security/cron-auth";
import { enqueueWorkerJob } from "@/infrastructure/worker/job-repository";
import { requestTraceContext } from "@/infrastructure/observability/trace-context";
import { platformServiceTenantContext } from "@/application/tenancy/tenant-context";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const unauthorized = authorizeCronRequest(req);
  if (unauthorized) return unauthorized;
  const result = await enqueueHealth(req, "daily-cron");
  return NextResponse.json({ accepted: true, job: result }, { status: 202 });
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req, { roles: ["owner", "admin"] });
  if (unauthorized) return unauthorized;
  const result = await enqueueHealth(req, "admin-manual");
  return NextResponse.json({ accepted: true, job: result }, { status: 202 });
}

async function enqueueHealth(req: NextRequest, triggerSource: string) {
  const trace = requestTraceContext(req.headers);
  const hourBucket = new Date().toISOString().slice(0, 13);
  return enqueueWorkerJob({
    tenantContext: platformServiceTenantContext("ops-health"),
    requestId: req.headers.get("x-request-id")?.trim().slice(0, 128) || crypto.randomUUID(),
    jobType: "rag-system-health",
    idempotencyKey: `${triggerSource}:${hourBucket}`,
    payload: { triggerSource },
    traceId: trace.traceId,
    traceparent: trace.traceparent,
    timeoutMs: 900_000,
  });
}
