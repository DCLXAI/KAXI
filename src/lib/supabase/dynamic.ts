export class SupabaseSdkUnavailableError extends Error {
  constructor(moduleName: string) {
    super(`${moduleName} is not installed. Run: bun add @supabase/supabase-js @supabase/ssr`);
    this.name = "SupabaseSdkUnavailableError";
  }
}

export interface SupabaseAuthUser {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}

export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  user: SupabaseAuthUser;
}

export interface SupabaseAuthResult<T = unknown> {
  data: T;
  error: { message?: string } | null;
}

export interface SupabaseAuthClientLike {
  getUser(): Promise<SupabaseAuthResult<{ user: SupabaseAuthUser | null }>>;
  exchangeCodeForSession?(code: string): Promise<SupabaseAuthResult<{ session: SupabaseSession | null }>>;
  signUp?(input: unknown): Promise<SupabaseAuthResult<{ user: SupabaseAuthUser | null; session: SupabaseSession | null }>>;
  signInWithPassword?(input: unknown): Promise<SupabaseAuthResult<{ user: SupabaseAuthUser | null; session: SupabaseSession | null }>>;
  signInWithOtp?(input: unknown): Promise<SupabaseAuthResult<unknown>>;
  signOut?(): Promise<SupabaseAuthResult<unknown>>;
}

export interface SupabaseClientLike {
  auth: SupabaseAuthClientLike;
}

type SupabaseSsrModule = {
  createServerClient: (...args: unknown[]) => SupabaseClientLike;
};

type SupabaseJsModule = {
  createClient: (...args: unknown[]) => SupabaseClientLike;
};

async function loadModule<T>(moduleName: string): Promise<T> {
  try {
    return (await import(moduleName)) as T;
  } catch {
    throw new SupabaseSdkUnavailableError(moduleName);
  }
}

export async function loadSupabaseSsr(): Promise<SupabaseSsrModule> {
  return loadModule<SupabaseSsrModule>("@supabase/ssr");
}

export async function loadSupabaseJs(): Promise<SupabaseJsModule> {
  return loadModule<SupabaseJsModule>("@supabase/supabase-js");
}
