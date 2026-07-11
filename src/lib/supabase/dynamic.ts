export class SupabaseSdkUnavailableError extends Error {
  constructor(moduleName: string) {
    super(`${moduleName} is not installed. Run: bun add @supabase/supabase-js @supabase/ssr`);
    this.name = "SupabaseSdkUnavailableError";
  }
}

export interface SupabaseAuthUser {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
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

export interface SupabaseMfaFactor {
  id: string;
  friendly_name?: string;
  factor_type: "totp" | "phone" | "webauthn";
  status: "verified" | "unverified";
  created_at: string;
  updated_at: string;
}

export interface SupabaseMfaApiLike {
  enroll(input: {
    factorType: "totp";
    friendlyName?: string;
    issuer?: string;
  }): Promise<SupabaseAuthResult<{
    id: string;
    type: "totp";
    friendly_name?: string;
    totp: { qr_code: string; secret: string; uri: string };
  }>>;
  challengeAndVerify(input: { factorId: string; code: string }): Promise<SupabaseAuthResult<unknown>>;
  unenroll(input: { factorId: string }): Promise<SupabaseAuthResult<{ id: string }>>;
  listFactors(): Promise<SupabaseAuthResult<{
    all: SupabaseMfaFactor[];
    totp: SupabaseMfaFactor[];
    phone: SupabaseMfaFactor[];
    webauthn: SupabaseMfaFactor[];
  }>>;
  getAuthenticatorAssuranceLevel(): Promise<SupabaseAuthResult<{
    currentLevel: string | null;
    nextLevel: string | null;
    currentAuthenticationMethods: unknown[];
  }>>;
}

export interface SupabaseAuthClientLike {
  mfa?: SupabaseMfaApiLike;
  getUser(): Promise<SupabaseAuthResult<{ user: SupabaseAuthUser | null }>>;
  setSession?(session: {
    access_token: string;
    refresh_token: string;
  }): Promise<SupabaseAuthResult<{ user: SupabaseAuthUser | null; session: SupabaseSession | null }>>;
  exchangeCodeForSession?(code: string): Promise<SupabaseAuthResult<{ session: SupabaseSession | null }>>;
  signUp?(input: unknown): Promise<SupabaseAuthResult<{ user: SupabaseAuthUser | null; session: SupabaseSession | null }>>;
  signInWithPassword?(input: unknown): Promise<SupabaseAuthResult<{ user: SupabaseAuthUser | null; session: SupabaseSession | null }>>;
  signInWithOtp?(input: unknown): Promise<SupabaseAuthResult<unknown>>;
  resetPasswordForEmail?(email: string, options?: { redirectTo?: string }): Promise<SupabaseAuthResult<unknown>>;
  updateUser?(attributes: { password?: string }): Promise<SupabaseAuthResult<{ user: SupabaseAuthUser | null }>>;
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
  createBrowserClient: (...args: unknown[]) => SupabaseClientLike;
  createServerClient: (...args: unknown[]) => SupabaseClientLike;
};

type SupabaseJsModule = {
  createClient: (...args: unknown[]) => SupabaseClientLike;
};

export async function loadSupabaseSsr(): Promise<SupabaseSsrModule> {
  return {
    createBrowserClient: createBrowserClient as unknown as SupabaseSsrModule["createBrowserClient"],
    createServerClient: createServerClient as unknown as SupabaseSsrModule["createServerClient"],
  };
}

export async function loadSupabaseJs(): Promise<SupabaseJsModule> {
  return { createClient: createClient as unknown as SupabaseJsModule["createClient"] };
}
import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
