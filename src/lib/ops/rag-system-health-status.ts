import { createSupabaseServiceRoleClient } from "@/infrastructure/supabase/service-role-client";

export async function getLatestRagSystemHealth() {
  const result = await createSupabaseServiceRoleClient()
    .from("system_health_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) throw result.error;
  return result.data;
}
