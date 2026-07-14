import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { parseLimit, rateLimit } from "@/lib/api/security";
import { JsonBodyError, readJsonBody } from "@/lib/api/json-body";
import { recordOpsEvent } from "@/lib/ops/events";

export const runtime = "nodejs";

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function configuredSecret() {
  const secret = process.env.N8N_ERROR_REPORTING_SECRET?.trim() || "";
  return secret.length >= 32 && !/^(replace-with-|change_me)/i.test(secret) ? secret : "";
}

function authorized(req: NextRequest) {
  const expected = configuredSecret();
  const authorization = req.headers.get("authorization") || "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!expected || !supplied) return false;
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length
    && timingSafeEqual(expectedBytes, suppliedBytes);
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, {
    key: "n8n-error-report",
    limit: parseLimit(process.env.N8N_ERROR_REPORT_RATE_LIMIT, 120),
    windowMs: 60 * 1000,
  });
  if (limited) return limited;

  try {
    if (!configuredSecret()) {
      return NextResponse.json({ ok: false, error: "Error reporting is not configured" }, { status: 503 });
    }
    if (!authorized(req)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await readJsonBody<Record<string, unknown>>(req, 32 * 1024);
    const workflowId = text(body.workflowId, 200) || "n8n-unidentified-workflow";
    const executionId = text(body.executionId, 240);
    const message = text(body.message, 1_000) || "n8n workflow execution failed";
    const eventType = text(body.eventType, 160) || "workflow_execution_failed";
    const result = await recordOpsEvent({
      source: "n8n",
      severity: body.severity === "critical" ? "critical" : "error",
      eventType,
      message,
      workflowId,
      workflowVersionId: text(body.workflowVersionId, 240) || "n8n-runtime",
      modelVersion: text(body.modelVersion, 240) || "not-applicable",
      promptVersion: text(body.promptVersion, 240) || "not-applicable",
      executionId: executionId || undefined,
      payload: {
        workflowName: text(body.workflowName, 240) || null,
        lastNodeExecuted: text(body.lastNodeExecuted, 240) || null,
        executionUrl: text(body.executionUrl, 1_000) || null,
        mode: text(body.mode, 80) || null,
      },
    });

    return NextResponse.json({
      ok: true,
      eventId: result.id,
      duplicate: result.duplicate,
      alertAttempted: result.alert?.attempted || false,
      alertSent: result.alert?.sent || false,
    });
  } catch (error) {
    if (error instanceof JsonBodyError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    console.error("[POST /api/internal/n8n/error-report]", error);
    return NextResponse.json({ ok: false, error: "Failed to record workflow error" }, { status: 500 });
  }
}
