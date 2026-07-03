import { Database } from "bun:sqlite";
import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const root = process.cwd();
const schema = readFileSync(join(root, "prisma", "schema.prisma"), "utf8");

function normalizePrismaLine(line: string): string {
  return line.trim().replace(/\s+/g, " ");
}

function extractNamedBlocks(text: string, kind: "enum" | "model"): Map<string, string> {
  const lines = text.split(/\r?\n/);
  const blocks = new Map<string, string>();

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(new RegExp(`^\\s*${kind}\\s+(\\w+)\\s+\\{`));
    if (!match) continue;

    const name = match[1];
    const body: string[] = [];
    let depth = 0;
    for (; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed === "") continue;
      depth += (line.match(/\{/g) || []).length;
      depth -= (line.match(/\}/g) || []).length;
      body.push(normalizePrismaLine(line));
      if (depth === 0) break;
    }
    blocks.set(name, body.join("\n"));
  }

  return blocks;
}

function assertBlockParity(kind: "enum" | "model", sqliteSchema: string, postgresSchemaText: string): void {
  const sqliteBlocks = extractNamedBlocks(sqliteSchema, kind);
  const postgresBlocks = extractNamedBlocks(postgresSchemaText, kind);
  const sqliteNames = Array.from(sqliteBlocks.keys()).sort();
  const postgresNames = Array.from(postgresBlocks.keys()).sort();

  assert(
    sqliteNames.join(",") === postgresNames.join(","),
    `${kind} names drifted between SQLite and PostgreSQL schemas: sqlite=${sqliteNames.join(",")} postgres=${postgresNames.join(",")}`
  );

  for (const name of sqliteNames) {
    const sqliteBlock = sqliteBlocks.get(name);
    const postgresBlock = postgresBlocks.get(name);
    if (sqliteBlock === postgresBlock) continue;

    const sqliteLines = (sqliteBlock || "").split("\n");
    const postgresLines = (postgresBlock || "").split("\n");
    const max = Math.max(sqliteLines.length, postgresLines.length);
    const firstDiff = Array.from({ length: max }, (_, index) => index).find(
      (index) => sqliteLines[index] !== postgresLines[index]
    );
    const lineHint = firstDiff === undefined
      ? ""
      : ` firstDiffLine=${firstDiff + 1} sqlite="${sqliteLines[firstDiff] || ""}" postgres="${postgresLines[firstDiff] || ""}"`;
    fail(`${kind} ${name} drifted between SQLite and PostgreSQL Prisma schemas.${lineHint}`);
  }
}

const requiredModels = [
  "Organization",
  "User",
  "StudentProfile",
  "Consent",
  "JourneyState",
  "DocumentItem",
  "UploadedFile",
  "ComplianceRule",
  "ComplianceRuleVersion",
  "ComplianceRuleTest",
  "ComplianceEvaluation",
  "KnowledgeDocument",
  "KnowledgeChunk",
  "EscalationCase",
  "AgentReview",
  "AuditEvent",
];

for (const model of requiredModels) {
  assert(new RegExp(`model\\s+${model}\\s+\\{`).test(schema), `missing Prisma model ${model}`);
}

for (const requiredField of [
  "conditionAst   Json",
  "outputAst      Json",
  "requiredInputs Json",
  "sourceRefs     Json",
  "fallbackPolicy String",
  "reviewStatus   LegalReviewStatus",
]) {
  assert(schema.includes(requiredField), `missing compliance rule field: ${requiredField}`);
}

const migrationRoot = join(root, "prisma", "migrations");
const migrationFiles = readdirSync(migrationRoot)
  .filter((name) => /^\d/.test(name))
  .sort()
  .map((name) => join(migrationRoot, name, "migration.sql"));

assert(
  migrationFiles.some((file) => file.includes("20260701090000_phase1_operational_domain")),
  "missing Phase 1 Prisma migration"
);

const db = new Database(":memory:");
try {
  db.exec("PRAGMA foreign_keys = ON;");
  for (const file of migrationFiles) {
    db.exec(readFileSync(file, "utf8"));
  }
  for (const model of requiredModels) {
    const row = db
      .query<{ name: string }, [string]>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(model);
    assert(row?.name === model, `migration did not create table ${model}`);
  }
} finally {
  db.close();
}

const postgresMigration = join(
  root,
  "prisma",
  "postgres",
  "migrations",
  "20260701090000_phase1_operational_domain",
  "migration.sql"
);
const postgresSchema = join(root, "prisma", "postgres", "schema.prisma");
assert(existsSync(postgresSchema), "missing PostgreSQL Prisma schema");
const postgresSchemaText = readFileSync(postgresSchema, "utf8");
assert(postgresSchemaText.includes('provider = "postgresql"'), "PostgreSQL schema must use provider postgresql");
assert(!postgresSchemaText.includes('provider = "sqlite"'), "PostgreSQL schema must not use sqlite provider");
assertBlockParity("enum", schema, postgresSchemaText);
assertBlockParity("model", schema, postgresSchemaText);

assert(existsSync(postgresMigration), "missing PostgreSQL operational migration");
const postgresSql = readFileSync(postgresMigration, "utf8");
for (const model of requiredModels) {
  assert(postgresSql.includes(`CREATE TABLE "${model}"`), `PostgreSQL migration missing table ${model}`);
}
assert(postgresSql.includes("CREATE TYPE \"OrgType\""), "PostgreSQL migration should create enum types");
assert(postgresSql.includes("JSONB"), "PostgreSQL migration should use JSONB for structured fields");

console.log(`PASS DB schema policy: ${requiredModels.length} domain models, dual schemas, and migrations verified`);
