"use client";

import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { loadSupabaseSsr, type SupabaseClientLike } from "@/lib/supabase/dynamic";

let browserClient: SupabaseClientLike | null = null;

export async function createSupabaseBrowserClient(): Promise<SupabaseClientLike> {
  const config = getSupabasePublicConfig();
  if (!config) throw new Error("Supabase Auth is not configured.");
  if (browserClient) return browserClient;

  const ssrModule = await loadSupabaseSsr();
  const createBrowserClient = (ssrModule as unknown as {
    createBrowserClient?: (...args: unknown[]) => SupabaseClientLike;
  }).createBrowserClient;
  if (!createBrowserClient) throw new Error("@supabase/ssr createBrowserClient is unavailable.");
  browserClient = createBrowserClient(config.url, config.anonKey);
  return browserClient;
}
