import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync } from "fs";
import { dirname, isAbsolute, join } from "path";

function fail(message: string): never {
  console.error(`[prepare-local-db] ${message}`);
  process.exit(1);
}

function sqlitePathFromDatabaseUrl(value: string | undefined): string {
  const url = value?.trim();
  if (!url?.startsWith("file:")) {
    fail("DATABASE_URL must be a file: SQLite URL for local DB preparation.");
  }
  const rawPath = url.slice("file:".length);
  return isAbsolute(rawPath) ? rawPath : join(process.cwd(), rawPath);
}

const dbPath = sqlitePathFromDatabaseUrl(process.env.DATABASE_URL || "file:./db/custom.db");
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
} finally {
  db.close();
}

