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
  data: T | null;
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
  storage: {
    from(bucket: string): {
      upload(path: string, fileBody: unknown, options?: Record<string, unknown>): Promise<SupabaseAuthResult<unknown>>;
      download(path: string): Promise<SupabaseAuthResult<Blob | ArrayBuffer | Uint8Array>>;
      createSignedUrl(path: string, expiresIn: number): Promise<SupabaseAuthResult<{ signedUrl: string }>>;
      list?(prefix?: string, options?: Record<string, unknown>): Promise<SupabaseAuthResult<Array<{ name: string }>>>;
    };
    getBucket?(bucket: string): Promise<SupabaseAuthResult<unknown>>;
    createBucket?(bucket: string, options?: Record<string, unknown>): Promise<SupabaseAuthResult<unknown>>;
    updateBucket?(bucket: string, options?: Record<string, unknown>): Promise<SupabaseAuthResult<unknown>>;
  };
}

type SupabaseSsrModule = {
  createServerClient: (...args: unknown[]) => SupabaseClientLike;
};

type SupabaseJsModule = {
  createClient: (...args: unknown[]) => SupabaseClientLike;
};

export async function loadSupabaseSsr(): Promise<SupabaseSsrModule> {
  return { createServerClient: createServerClient as unknown as SupabaseSsrModule["createServerClient"] };
}

export async function loadSupabaseJs(): Promise<SupabaseJsModule> {
  return { createClient: createClient as unknown as SupabaseJsModule["createClient"] };
}
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
