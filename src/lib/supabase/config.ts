import { publicBuildEnvironment } from "@/infrastructure/config/build-environment";
export interface SupabasePublicConfig {
  url: string;
  anonKey: string;
}

function configured(value: string | undefined): string {
  const text = value?.trim() || "";
  if (!text || /^replace-with-/i.test(text)) return "";
  return text;
}

export function getSupabasePublicConfig(env?: NodeJS.ProcessEnv): SupabasePublicConfig | null {
  // Keep the no-argument path as direct static references. Next.js only embeds
  // NEXT_PUBLIC_* values in client bundles when it can see the literal keys.
  const url = configured(env ? env.NEXT_PUBLIC_SUPABASE_URL : publicBuildEnvironment().NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = configured(
    env ? env.NEXT_PUBLIC_SUPABASE_ANON_KEY : publicBuildEnvironment().NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function supabaseMissingMessage(): string {
  return "Supabase Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";
}
