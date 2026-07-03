import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { NextRequest } from "next/server";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      files.push(...walk(path));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(path);
    }
  }

  return files;
}

const publicRuntimeRoots = ["src/app", "src/components"];
const violations: string[] = [];
const mutationTypeViolations: string[] = [];
const runtimeSeedImportViolations: string[] = [];
const allowedRuntimeSeedImports = new Set([
  "src/lib/schools/repository.ts",
  "scripts/seed-schools.ts",
  "scripts/audit-data-governance.ts",
]);

for (const root of publicRuntimeRoots) {
  for (const file of walk(root)) {
    const content = readFileSync(file, "utf8");
    const imports = content.matchAll(/import\s+(?!type\b)[^;]*from\s+["']@\/lib\/data\/schools["'];?/g);
    for (const match of imports) {
      violations.push(`${file}: ${match[0]}`);
    }
  }
}

if (violations.length > 0) {
  fail(
    [
      "public app/components must not import runtime school seed data directly.",
      "Use /api/schools or src/lib/schools/repository instead.",
      ...violations,
    ].join("\n")
  );
}

for (const root of ["src", "scripts"]) {
  for (const file of walk(root)) {
    const normalized = file.replace(/\\/g, "/");
    const content = readFileSync(file, "utf8");
    const imports = content.matchAll(/import\s+(?!type\b)[^;]*from\s+["'][^"']*lib\/data\/schools["'];?/g);
    for (const match of imports) {
      if (!allowedRuntimeSeedImports.has(normalized)) {
        runtimeSeedImportViolations.push(`${normalized}: ${match[0]}`);
      }
    }
  }
}

if (runtimeSeedImportViolations.length > 0) {
  fail(
    [
      "runtime imports of the school seed are restricted to repository local fallback and seed/governance scripts.",
      ...runtimeSeedImportViolations,
    ].join("\n")
  );
}

for (const file of [
  "src/lib/schools/repository.ts",
  "src/app/api/schools/route.ts",
  "src/app/api/schools/[id]/route.ts",
  "src/app/api/schools/[id]/review/route.ts",
]) {
  const content = readFileSync(file, "utf8");
  if (/\bas\s+any\b/.test(content)) mutationTypeViolations.push(file);
}

if (mutationTypeViolations.length > 0) {
  fail(
    [
      "school mutation paths must keep Prisma inputs typed; avoid `as any` casts.",
      ...mutationTypeViolations,
    ].join("\n")
  );
}

function testSchoolDataStrategyDocs() {
  const strategy = readFileSync("docs/SCHOOL_DATA_STRATEGY.md", "utf8");
  const operations = readFileSync("docs/OPERATIONS.md", "utf8");
  const requiredPhrases = [
    "The operational source of truth for school data is the `School` table.",
    "`src/lib/data/schools.ts` is retained only as:",
    "Hosted preview and production runtimes must fail closed",
    "Allowed runtime seed consumers:",
    "`GET /api/schools` returns provenance fields:",
  ];

  for (const phrase of requiredPhrases) {
    if (!strategy.includes(phrase)) {
      fail(`school data strategy doc is missing required policy phrase: ${phrase}`);
    }
  }
  if (!operations.includes("docs/SCHOOL_DATA_STRATEGY.md")) {
    fail("operations policy must link to docs/SCHOOL_DATA_STRATEGY.md");
  }

  for (const schemaFile of ["prisma/schema.prisma", "prisma/postgres/schema.prisma"]) {
    const schema = readFileSync(schemaFile, "utf8");
    if (schema.includes("현재는 src/lib/data/schools.ts 사용")) {
      fail(`${schemaFile} still describes schools.ts as the current runtime source`);
    }
    if (!schema.includes("Operational source of truth for school data")) {
      fail(`${schemaFile} should document School table as the operational source of truth`);
    }
  }
}

async function testSchoolApiExposesProvenance() {
  const route = await import("../src/app/api/schools/route");
  const res = await route.GET(new NextRequest("https://kaxi.local/api/schools?query=__no_such_school__"));
  const body = await res.json();

  if (res.status !== 200) {
    fail(`school API provenance smoke test expected 200, got ${res.status}: ${JSON.stringify(body)}`);
  }
  if (!["db", "seed"].includes(body.source)) {
    fail(`school API should expose data source provenance: ${JSON.stringify(body)}`);
  }
  if (typeof body.operational !== "boolean" || typeof body.fallback !== "boolean") {
    fail(`school API should expose operational/fallback flags: ${JSON.stringify(body)}`);
  }
  if (body.source === "db" && body.fallback) {
    fail(`db-backed school API response must not be marked as fallback: ${JSON.stringify(body)}`);
  }
  if (body.source === "db" && body.total !== 0) {
    fail(`unmatched school query should return zero DB-backed results, not seed fallback rows: ${JSON.stringify(body)}`);
  }
}

testSchoolDataStrategyDocs();
await testSchoolApiExposesProvenance();

console.log("PASS school data boundary");
