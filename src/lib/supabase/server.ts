import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { getSupabasePublicConfig, getSupabaseServerConfig, supabaseMissingMessage } from "@/lib/supabase/config";
import {
  SupabaseSdkUnavailableError,
  loadSupabaseJs,
  loadSupabaseSsr,
  type SupabaseClientLike,
  type SupabaseAuthUser,
} from "@/lib/supabase/dynamic";

export class SupabaseAuthConfigurationError extends Error {
  constructor(message = supabaseMissingMessage()) {
    super(message);
    this.name = "SupabaseAuthConfigurationError";
  }
}

export async function createSupabaseServerClient(): Promise<SupabaseClientLike> {
  const config = getSupabasePublicConfig();
  if (!config) throw new SupabaseAuthConfigurationError();
  const { createServerClient } = await loadSupabaseSsr();
  const cookieStore = await cookies();

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(items: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        for (const item of items) {
          try {
            cookieStore.set(item.name, item.value, item.options);
          } catch {
            // Server Components cannot set cookies. Route handlers and middleware can.
          }
        }
      },
    },
  });
}

export async function createSupabaseMiddlewareClient(req: NextRequest, res: NextResponse): Promise<SupabaseClientLike> {
  const config = getSupabasePublicConfig();
  if (!config) throw new SupabaseAuthConfigurationError();
  const { createServerClient } = await loadSupabaseSsr();

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(items: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        for (const item of items) {
          res.cookies.set(item.name, item.value, item.options);
        }
      },
    },
  });
}

export async function createSupabaseServiceRoleClient(): Promise<SupabaseClientLike> {
  const config = getSupabaseServerConfig();
  if (!config?.serviceRoleKey) {
    throw new SupabaseAuthConfigurationError("SUPABASE_SERVICE_ROLE_KEY is required for server-only admin Auth operations.");
  }
  const { createClient } = await loadSupabaseJs();
  return createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getSupabaseAuthUser(): Promise<SupabaseAuthUser | null> {
  try {
    const client = await createSupabaseServerClient();
    const result = await client.auth.getUser();
    return result.data.user || null;
  } catch (err) {
    if (err instanceof SupabaseAuthConfigurationError || err instanceof SupabaseSdkUnavailableError) return null;
    throw err;
  }
}

export function isSupabaseAuthUnavailable(err: unknown): boolean {
  return err instanceof SupabaseAuthConfigurationError || err instanceof SupabaseSdkUnavailableError;
}
