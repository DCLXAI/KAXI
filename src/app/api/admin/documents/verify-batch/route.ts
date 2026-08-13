import { NextRequest, NextResponse } from "next/server";
import { recordAuditLog } from "@/lib/audit";
import { getAdminContext, getClientIp, requireAdmin } from "@/lib/api/security";
import { enqueueWorkerJob } from "@/infrastructure/worker/job-repository";
import { requestTraceContext } from "@/infrastructure/observability/trace-context";
import { platformServiceTenantContext } from "@/application/tenancy/tenant-context";

export const runtime = "nodejs";
export const maxDuration = 120;

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    const unauthorized = await requireAdmin(req, { roles: ["owner", "admin"] });
    if (unauthorized) return unauthorized;

    const context = await getAdminContext(req);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const options = {
      studentProfileId: optionalString(body.studentProfileId),
      caseId: optionalString(body.caseId),
      visaType: optionalString(body.visaType),
      stayAction: optionalString(body.stayAction),
      applicantContext: optionalString(body.applicantContext),
      enableRag: optionalBoolean(body.enableRag) ?? true,
      enableLlm: optionalBoolean(body.enableLlm) ?? false,
      minRagVectorScore: optionalNumber(body.minRagVectorScore),
      minRagKeywordScore: optionalNumber(body.minRagKeywordScore),
      persist: optionalBoolean(body.persist) ?? true,
      createMissingPlaceholders: optionalBoolean(body.createMissingPlaceholders) ?? false,
    };
    if (!options.studentProfileId) {
      return NextResponse.json({ error: "studentProfileId is required" }, { status: 400 });
    }
    const trace = requestTraceContext(req.headers);
    const job = await enqueueWorkerJob({
      tenantContext: platformServiceTenantContext("admin-document-verification-batch"),
      requestId: req.headers.get("x-request-id")?.trim().slice(0, 128) || crypto.randomUUID(),
      jobType: "document-verify-set",
      idempotencyKey: req.headers.get("x-idempotency-key") || crypto.randomUUID(),
      payload: { options },
      traceId: trace.traceId,
      traceparent: trace.traceparent,
      timeoutMs: 30 * 60_000,
      deadlineAt: new Date(Date.now() + 4 * 60 * 60_000),
    });

    await recordAuditLog({
      actor: context?.actor || "admin",
      actorRole: context?.role || "admin",
      action: "document.set_verification_enqueued",
      targetType: options.caseId ? "escalationCase" : "studentProfile",
      targetId: options.caseId || options.studentProfileId,
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      metadata: {
        workerJobId: job.id,
        executionOwner: "kaxi-worker",
        enableRag: options.enableRag,
        enableLlm: options.enableLlm,
      },
    });

    return NextResponse.json({ ok: true, accepted: true, executionOwner: "kaxi-worker", job }, { status: 202 });
  } catch (err) {
    console.error("[POST /api/admin/documents/verify-batch]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 400 });
  }
}
