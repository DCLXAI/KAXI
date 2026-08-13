import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prepareTestDb } from "./prepare-test-db";

prepareTestDb("disaster recovery rehearsal");
process.env.NODE_ENV = "test";
const configuredSourceUrl = process.env.DATABASE_URL!;
const parsed = new URL(configuredSourceUrl);
assert(["localhost", "127.0.0.1", "::1"].includes(parsed.hostname));
assert(/[_-]test$/i.test(parsed.pathname));
parsed.searchParams.delete("schema");
const sourceUrl = parsed.toString();
const serverMajor = execFileSync("psql", [sourceUrl, "-Atc", "SHOW server_version_num;"], { encoding: "utf8" })
  .trim()
  .slice(0, 2);
function postgresBinary(name: string) {
  const candidates = [
    `/opt/homebrew/opt/postgresql@${serverMajor}/bin/${name}`,
    `/usr/lib/postgresql/${serverMajor}/bin/${name}`,
  ];
  return candidates.find(existsSync) || name;
}
const psql = postgresBinary("psql");
const pgDump = postgresBinary("pg_dump");
const pgRestore = postgresBinary("pg_restore");
const createDb = postgresBinary("createdb");
const dropDb = postgresBinary("dropdb");

const suffix = randomUUID().replaceAll("-", "").slice(0, 10);
const restoreDatabase = `kaxi_restore_${suffix}_test`;
const restoreUrl = new URL(sourceUrl);
restoreUrl.pathname = `/${restoreDatabase}`;
const maintenanceUrl = new URL(sourceUrl);
maintenanceUrl.pathname = "/postgres";
const directory = mkdtempSync(join(tmpdir(), "kaxi-dr-rehearsal-"));
const dumpPath = join(directory, "kaxi.dump");

try {
  execFileSync(psql, [sourceUrl, "-v", "ON_ERROR_STOP=1", "-c",
    "INSERT INTO public.tenants (id, slug, name) VALUES ('dr_sentinel', 'dr-sentinel', 'DR Sentinel') ON CONFLICT (id) DO NOTHING;"],
  );
  const startedAt = performance.now();
  execFileSync(pgDump, ["--format=custom", "--no-owner", "--no-privileges", "--file", dumpPath, sourceUrl]);
  const checksum = createHash("sha256").update(readFileSync(dumpPath)).digest("hex");
  execFileSync(createDb, ["--maintenance-db", maintenanceUrl.toString(), restoreDatabase]);
  execFileSync(pgRestore, ["--no-owner", "--no-privileges", "--exit-on-error", "--dbname", restoreUrl.toString(), dumpPath]);
  const sentinel = execFileSync(psql, [restoreUrl.toString(), "-Atc",
    "SELECT count(*) FROM public.tenants WHERE id = 'dr_sentinel';"], { encoding: "utf8" }).trim();
  const migrationCount = Number(execFileSync(psql, [restoreUrl.toString(), "-Atc",
    "SELECT count(*) FROM public._prisma_migrations WHERE finished_at IS NOT NULL;"], { encoding: "utf8" }).trim());
  const durationMs = performance.now() - startedAt;
  assert.equal(sentinel, "1", "restored database must contain the post-migration sentinel row");
  assert(migrationCount > 0, "restored database must retain migration history");
  assert.match(checksum, /^[a-f0-9]{64}$/);
  console.log(`PASS disaster recovery: custom-format backup ${checksum.slice(0, 12)}, ${migrationCount} migrations, restore verified in ${durationMs.toFixed(0)}ms`);
} finally {
  try {
    execFileSync(dropDb, ["--if-exists", "--force", "--maintenance-db", maintenanceUrl.toString(), restoreDatabase]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
