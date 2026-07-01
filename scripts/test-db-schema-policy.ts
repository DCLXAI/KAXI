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
assert(existsSync(postgresMigration), "missing PostgreSQL operational migration");
const postgresSql = readFileSync(postgresMigration, "utf8");
for (const model of requiredModels) {
  assert(postgresSql.includes(`CREATE TABLE "${model}"`), `PostgreSQL migration missing table ${model}`);
}
assert(postgresSql.includes("CREATE TYPE \"OrgType\""), "PostgreSQL migration should create enum types");
assert(postgresSql.includes("JSONB"), "PostgreSQL migration should use JSONB for structured fields");

console.log(`PASS DB schema policy: ${requiredModels.length} domain models and migrations verified`);

