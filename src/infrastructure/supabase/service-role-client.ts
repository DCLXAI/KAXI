import { publicBuildEnvironment, deploymentBuildEnvironment } from "@/infrastructure/config/build-environment";
import { runtimeEnvironment } from "@/infrastructure/config/runtime-environment";
import { createClient } from "@supabase/supabase-js";

function configured(value: string | undefined) {
  const text = value?.trim() || "";
  if (!text || /^replace-with-/i.test(text)) return "";
  return text;
}

/** Server-only Supabase client for infrastructure adapters and repositories. */
export function createSupabaseServiceRoleClient() {
  const url = configured(publicBuildEnvironment().NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = configured(runtimeEnvironment().SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_NOT_CONFIGURED");
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
