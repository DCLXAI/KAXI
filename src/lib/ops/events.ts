import { createClient } from "@supabase/supabase-js";

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
