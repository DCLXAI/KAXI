import { Database } from "bun:sqlite";
import { spawnSync } from "child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync } from "fs";
import { dirname, isAbsolute, join } from "path";

function sqlitePathFromDatabaseUrl(value: string | undefined): string {
  const url = value?.trim();
  if (!url?.startsWith("file:")) {
    throw new Error("DATABASE_URL must be a file: SQLite URL for local DB preparation.");
  }
  const rawPath = url.slice("file:".length);
  return isAbsolute(rawPath) ? rawPath : join(process.cwd(), rawPath);
}

function generatedClientProvider(): string | null {
  const generatedSchemaPath = join(process.cwd(), "node_modules", ".prisma", "client", "schema.prisma");
  if (!existsSync(generatedSchemaPath)) return null;

  const generatedSchema = readFileSync(generatedSchemaPath, "utf8");
  const provider = generatedSchema.match(/datasource\s+db\s+\{[\s\S]*?provider\s+=\s+"([^"]+)"/)?.[1];
  return provider || null;
}

function ensureSqlitePrismaClient() {
  if (generatedClientProvider() === "sqlite") return;

  const result = spawnSync("bunx", ["prisma", "generate", "--schema", "prisma/schema.prisma"], {
    stdio: "inherit",
    env: {
      ...process.env,
      KAXI_PRISMA_PROVIDER: "sqlite",
      PRISMA_SCHEMA_PROVIDER: "sqlite",
    },
  });

  if (result.status !== 0) {
    throw new Error(`Failed to generate sqlite Prisma client for local test DB (exit ${result.status})`);
  }
}

export function prepareLocalDb(databaseUrl = process.env.DATABASE_URL || "file:./db/custom.db") {
  const dbPath = sqlitePathFromDatabaseUrl(databaseUrl);
  mkdirSync(dirname(dbPath), { recursive: true });
  if (existsSync(dbPath)) unlinkSync(dbPath);

  const db = new Database(dbPath);
  try {
    db.exec("PRAGMA foreign_keys = ON;");
    const migrationsRoot = join(process.cwd(), "prisma", "migrations");
    const migrationFiles = readdirSync(migrationsRoot)
      .filter((name) => /^\d/.test(name))
      .sort()
      .map((name) => join(migrationsRoot, name, "migration.sql"));

    for (const file of migrationFiles) {
      db.exec(readFileSync(file, "utf8"));
    }

    console.log(`[prepare-local-db] applied ${migrationFiles.length} migration(s) to ${dbPath}`);
    ensureSqlitePrismaClient();
    return { dbPath, migrationCount: migrationFiles.length };
  } finally {
    db.close();
  }
}

if (import.meta.main) {
  try {
    prepareLocalDb();
  } catch (err) {
    console.error(`[prepare-local-db] ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}
