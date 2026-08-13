import { runtimeEnvironment } from "@/infrastructure/config/runtime-environment";
import { getSupabasePublicConfig, type SupabasePublicConfig } from "@/lib/supabase/config";

export interface SupabaseServerConfig extends SupabasePublicConfig {
  serviceRoleKey: string | null;
}
function configured(value: string | undefined): string {
  const text = value?.trim() || "";
  if (!text || /^replace-with-/i.test(text)) return "";
  return text;
}

export function getSupabaseServerConfig(
  env: NodeJS.ProcessEnv = runtimeEnvironment(),
): SupabaseServerConfig | null {
  const publicConfig = getSupabasePublicConfig(env);
  if (!publicConfig) return null;
  return {
    ...publicConfig,
    // Server-only. Never pass this value to client components, JSON responses, or logs.
    serviceRoleKey: configured(env.SUPABASE_SERVICE_ROLE_KEY) || null,
  };
}
