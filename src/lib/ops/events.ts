import { createClient } from "@supabase/supabase-js";
import { sendOpsAlert, type OpsAlertResult } from "@/lib/ops/alerts";

export type OpsEvent = {
  id: string;
  source: string;
  severity: "warning" | "error" | "critical";
  eventType: string;
  workflowId: string;
  workflowVersionId: string;
  modelVersion: string;
  promptVersion: string;
  executionId: string | null;
  message: string;
  payload: Record<string, unknown>;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  createdAt: string;
};

export type RecordOpsEventInput = {
  source: string;
  severity: OpsEvent["severity"];
  eventType: string;
  message: string;
  workflowId?: string;
  workflowVersionId?: string;
  modelVersion?: string;
  promptVersion?: string;
  executionId?: string;
  payload?: Record<string, unknown>;
  adminUrl?: string;
};

export type RecordOpsEventResult = {
  id: string | null;
  duplicate: boolean;
  alert: OpsAlertResult | null;
};

function isolatedTestRuntime() {
  const runtimeDatabase = process.env.DATABASE_URL?.trim() || "";
  return Boolean(
    process.env.TEST_DATABASE_URL &&
    /^postgres(?:ql)?:\/\/(?:[^@]+@)?(?:localhost|127\.0\.0\.1|\[::1\])/i.test(runtimeDatabase),
  );
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  if (!url || !key) throw new Error("SUPABASE_OPS_NOT_CONFIGURED");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function mapEvent(row: Record<string, unknown>): OpsEvent {
  return {
    id: String(row.id),
    source: String(row.source || "unknown"),
    severity: (row.severity === "critical" || row.severity === "warning" ? row.severity : "error"),
    eventType: String(row.event_type || "unknown"),
    workflowId: row.workflow_id ? String(row.workflow_id) : "legacy-unversioned",
    workflowVersionId: row.workflow_version_id ? String(row.workflow_version_id) : "legacy-unversioned",
    modelVersion: row.model_version ? String(row.model_version) : "legacy-unversioned",
    promptVersion: row.prompt_version ? String(row.prompt_version) : "legacy-unversioned",
    executionId: row.execution_id ? String(row.execution_id) : null,
    message: String(row.message || ""),
    payload: row.payload && typeof row.payload === "object" ? row.payload as Record<string, unknown> : {},
    acknowledgedAt: row.acknowledged_at ? String(row.acknowledged_at) : null,
    acknowledgedBy: row.acknowledged_by ? String(row.acknowledged_by) : null,
    createdAt: String(row.created_at || ""),
  };
}

export async function listOpenOpsEvents(limit = 50) {
  if (isolatedTestRuntime()) return [];
  const result = await serviceClient()
    .from("ops_events")
    .select("id,source,severity,event_type,workflow_id,workflow_version_id,model_version,prompt_version,execution_id,message,payload,acknowledged_at,acknowledged_by,created_at")
    .is("acknowledged_at", null)
    .order("created_at", { ascending: false })
    .limit(Math.min(100, Math.max(1, Math.trunc(limit))));
  if (result.error) throw result.error;
  return (result.data || []).map((row) => mapEvent(row));
}

export async function acknowledgeOpsEvent(id: string, actor: string) {
  if (isolatedTestRuntime()) throw new Error("SUPABASE_OPS_DISABLED_IN_TEST");
  const acknowledgedAt = new Date().toISOString();
  const result = await serviceClient()
    .from("ops_events")
    .update({ acknowledged_at: acknowledgedAt, acknowledged_by: actor.slice(0, 160) })
    .eq("id", id)
    .is("acknowledged_at", null)
    .select("id,source,severity,event_type,workflow_id,workflow_version_id,model_version,prompt_version,execution_id,message,payload,acknowledged_at,acknowledged_by,created_at")
    .maybeSingle();
  if (result.error) throw result.error;
  return result.data ? mapEvent(result.data) : null;
}

// ops_events.workflow_id / workflow_version_id / model_version /
// prompt_version are NOT NULL since 20260711210000_rag_response_provenance.
// Events without provenance (SLA watchdog, LLM-fallback telemetry) must
// still insert, so absent values get explicit sentinels instead of null.
export function buildOpsEventRow(input: RecordOpsEventInput) {
  return {
    source: input.source.slice(0, 120),
    severity: input.severity,
    event_type: input.eventType.slice(0, 160),
    workflow_id: input.workflowId?.slice(0, 200) || "kaxi-app",
    workflow_version_id: input.workflowVersionId?.slice(0, 240) || "unversioned",
    model_version: input.modelVersion?.slice(0, 240) || "none",
    prompt_version: input.promptVersion?.slice(0, 240) || "none",
    execution_id: input.executionId?.slice(0, 240) || null,
    message: input.message.slice(0, 500),
    payload: input.payload || {},
  };
}

export async function recordOpsEvent(input: RecordOpsEventInput): Promise<RecordOpsEventResult> {
  if (isolatedTestRuntime()) return { id: null, duplicate: false, alert: null };

  const occurredAt = new Date().toISOString();
  const result = await serviceClient().from("ops_events").insert(buildOpsEventRow(input)).select("id").single();

  if (result.error?.code === "23505") {
    return { id: null, duplicate: true, alert: null };
  }
  if (result.error) throw result.error;

  const alert = await sendOpsAlert({
    kind: "kaxi_ops_alert",
    source: input.source,
    severity: input.severity,
    eventType: input.eventType,
    message: input.message,
    occurredAt,
    details: {
      eventId: result.data.id,
      executionId: input.executionId || null,
      workflowId: input.workflowId || null,
      ...(input.payload || {}),
    },
    adminUrl: input.adminUrl || `${process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://kaxi.vercel.app"}/admin`,
  });

  return { id: String(result.data.id), duplicate: false, alert };
}
