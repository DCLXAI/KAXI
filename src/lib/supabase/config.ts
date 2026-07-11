export interface SupabasePublicConfig {
  url: string;
  anonKey: string;
}

export interface SupabaseServerConfig extends SupabasePublicConfig {
  serviceRoleKey: string | null;
}

function configured(value: string | undefined): string {
  const text = value?.trim() || "";
  if (!text || /^replace-with-/i.test(text)) return "";
  return text;
}

export function getSupabasePublicConfig(env?: NodeJS.ProcessEnv): SupabasePublicConfig | null {
  // Keep the no-argument path as direct static references. Next.js only embeds
  // NEXT_PUBLIC_* values in client bundles when it can see the literal keys.
  const url = configured(env ? env.NEXT_PUBLIC_SUPABASE_URL : process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = configured(
    env ? env.NEXT_PUBLIC_SUPABASE_ANON_KEY : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function getSupabaseServerConfig(env: NodeJS.ProcessEnv = process.env): SupabaseServerConfig | null {
  const publicConfig = getSupabasePublicConfig(env);
  if (!publicConfig) return null;
  return {
    ...publicConfig,
    // Server-only. Never pass this value to client components, JSON responses, or logs.
    serviceRoleKey: configured(env.SUPABASE_SERVICE_ROLE_KEY) || null,
  };
}

export function supabaseMissingMessage(): string {
  return "Supabase Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";
}
