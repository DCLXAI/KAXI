import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql/web";
import { join } from "path";

export type RuntimeDatabaseKind = "missing" | "file" | "libsql" | "postgresql" | "unsupported-managed";

export interface RuntimeDatabaseInfo {
  kind: RuntimeDatabaseKind;
  source:
    | "DATABASE_URL"
    | "POSTGRES_URL"
    | "SUPABASE_DATABASE_URL"
    | "SUPABASE_POOLER_URL"
    | "TURSO_DATABASE_URL"
    | "default";
  hostedRuntime: boolean;
  writable: boolean;
  sharedWritable: boolean;
  libSqlAuthConfigured: boolean;
  postgresqlConfigured: boolean;
  activePrismaProvider: "sqlite" | "postgresql";
  reason: string;
}

function configured(value: string | undefined): boolean {
  const trimmed = value?.trim() || "";
  return Boolean(trimmed) && !/^replace-with-/i.test(trimmed);
}

function isPlaceholderDatabaseUrl(value: string | undefined): boolean {
  const trimmed = value?.trim() || "";
  return !configured(trimmed) || trimmed.includes("/home/z/my-project");
}

function isHostedRuntime(env: NodeJS.ProcessEnv): boolean {
  return env.VERCEL === "1" || Boolean(env.VERCEL_ENV);
}

function defaultDatabaseUrl(): string {
  return `file:${join(process.cwd(), "db", "custom.db")}`;
}

function normalizeDatabaseEnv() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();
  const postgresUrl = process.env.POSTGRES_URL?.trim();
  const supabaseDatabaseUrl = process.env.SUPABASE_DATABASE_URL?.trim();
  const supabasePoolerUrl = process.env.SUPABASE_POOLER_URL?.trim();
  if (postgresUrl && (!databaseUrl || databaseUrl.includes("/home/z/my-project"))) {
    process.env.DATABASE_URL = postgresUrl;
    return;
  }
  if (supabaseDatabaseUrl && isPlaceholderDatabaseUrl(databaseUrl)) {
    process.env.DATABASE_URL = supabaseDatabaseUrl;
    return;
  }
  if (supabasePoolerUrl && isPlaceholderDatabaseUrl(databaseUrl)) {
    process.env.DATABASE_URL = supabasePoolerUrl;
    return;
  }
  if (!databaseUrl || databaseUrl.includes("/home/z/my-project")) {
    process.env.DATABASE_URL = tursoUrl || defaultDatabaseUrl();
  }
}

normalizeDatabaseEnv();

function databaseUrlFromEnv(env: NodeJS.ProcessEnv) {
  const tursoUrl = env.TURSO_DATABASE_URL?.trim();
  const databaseUrl = env.DATABASE_URL?.trim();
  const postgresUrl = env.POSTGRES_URL?.trim();
  const supabaseDatabaseUrl = env.SUPABASE_DATABASE_URL?.trim();
  const supabasePoolerUrl = env.SUPABASE_POOLER_URL?.trim();
  if (databaseUrl && isPostgresUrl(databaseUrl)) return { url: databaseUrl, source: "DATABASE_URL" as const };
  if (postgresUrl && (!databaseUrl || databaseUrl.includes("/home/z/my-project") || databaseUrl.startsWith("file:"))) {
    return { url: postgresUrl, source: "POSTGRES_URL" as const };
  }
  if (
    supabaseDatabaseUrl &&
    isPostgresUrl(supabaseDatabaseUrl) &&
    (!databaseUrl || databaseUrl.includes("/home/z/my-project") || databaseUrl.startsWith("file:"))
  ) {
    return { url: supabaseDatabaseUrl, source: "SUPABASE_DATABASE_URL" as const };
  }
  if (
    supabasePoolerUrl &&
    isPostgresUrl(supabasePoolerUrl) &&
    (!databaseUrl || databaseUrl.includes("/home/z/my-project") || databaseUrl.startsWith("file:"))
  ) {
    return { url: supabasePoolerUrl, source: "SUPABASE_POOLER_URL" as const };
  }
  if (tursoUrl) return { url: tursoUrl, source: "TURSO_DATABASE_URL" as const };
  if (databaseUrl) return { url: databaseUrl, source: "DATABASE_URL" as const };
  return { url: "", source: "default" as const };
}

function isLibSqlUrl(url: string): boolean {
  return /^(libsql|wss|https):\/\//i.test(url);
}

function isPostgresUrl(url: string): boolean {
  return /^postgres(?:ql)?:\/\//i.test(url);
}

function activePrismaProviderForUrl(url: string): RuntimeDatabaseInfo["activePrismaProvider"] {
  return isPostgresUrl(url) ? "postgresql" : "sqlite";
}

export function getRuntimeDatabaseInfo(env: NodeJS.ProcessEnv = process.env): RuntimeDatabaseInfo {
  const { url, source } = databaseUrlFromEnv(env);
  const hostedRuntime = isHostedRuntime(env);
  const libSqlAuthConfigured = configured(env.TURSO_AUTH_TOKEN) || configured(env.DATABASE_AUTH_TOKEN);
  const postgresqlConfigured = isPostgresUrl(url);
  const activePrismaProvider = activePrismaProviderForUrl(url);

  if (!url) {
    return {
      kind: "missing",
      source,
      hostedRuntime,
      writable: false,
      sharedWritable: false,
      libSqlAuthConfigured,
      postgresqlConfigured,
      activePrismaProvider,
      reason: "DATABASE_URL or TURSO_DATABASE_URL is not configured.",
    };
  }

  if (url.startsWith("file:")) {
    const writable = !hostedRuntime;
    return {
      kind: "file",
      source,
      hostedRuntime,
      writable,
      sharedWritable: false,
      libSqlAuthConfigured,
      postgresqlConfigured,
      activePrismaProvider,
      reason: writable
        ? "Local SQLite file is writable for development."
        : "Hosted deployments cannot rely on bundled file SQLite for writes.",
    };
  }

  if (isLibSqlUrl(url)) {
    return {
      kind: "libsql",
      source,
      hostedRuntime,
      writable: libSqlAuthConfigured,
      sharedWritable: libSqlAuthConfigured,
      libSqlAuthConfigured,
      postgresqlConfigured,
      activePrismaProvider,
      reason: libSqlAuthConfigured
        ? "libSQL/Turso managed database is configured."
        : "TURSO_AUTH_TOKEN or DATABASE_AUTH_TOKEN is required for managed libSQL writes.",
    };
  }

  if (isPostgresUrl(url)) {
    return {
      kind: "postgresql",
      source,
      hostedRuntime,
      writable: true,
      sharedWritable: true,
      libSqlAuthConfigured,
      postgresqlConfigured: true,
      activePrismaProvider,
      reason: "PostgreSQL operational database is configured.",
    };
  }

  return {
    kind: "unsupported-managed",
    source,
    hostedRuntime,
    writable: false,
    sharedWritable: false,
    libSqlAuthConfigured,
    postgresqlConfigured,
    activePrismaProvider,
    reason:
      "This build uses the Prisma sqlite provider for local/demo compatibility. Production must target PostgreSQL through the Phase 1 cutover path.",
  };
}

function createPrismaClient() {
  const log: Prisma.LogLevel[] = process.env.DEBUG_PRISMA === "true" ? ["query"] : [];
  const info = getRuntimeDatabaseInfo();

  if (info.kind === "libsql") {
    const { url } = databaseUrlFromEnv(process.env);
    const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN;
    return new PrismaClient({
      adapter: new PrismaLibSQL({
        url,
        ...(authToken ? { authToken } : {}),
      }),
      log,
    });
  }

  return new PrismaClient({ log });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

export function canWriteRuntimeDatabase(): boolean {
  return getRuntimeDatabaseInfo().writable
}

export function canUseSharedRuntimeDatabase(): boolean {
  return getRuntimeDatabaseInfo().sharedWritable
}

export async function checkRuntimeDatabaseConnectivity(): Promise<{ ok: boolean; detail: string }> {
  const info = getRuntimeDatabaseInfo();
  if (!info.writable) return { ok: false, detail: info.reason };

  try {
    await db.$queryRaw`SELECT 1`;
    return { ok: true, detail: info.reason };
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}
