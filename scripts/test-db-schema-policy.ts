import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const root = process.cwd();
const schemaPath = join(root, "prisma", "postgres", "schema.prisma");
const removedLegacySchemaPath = join(root, "prisma", "schema.prisma");
const schema = readFileSync(schemaPath, "utf8");

function validatePrismaSchema(schemaFile: string): void {
  const result = spawnSync("bunx", ["prisma", "validate", "--schema", schemaFile], {
    cwd: root,
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || "postgresql://schema_policy:schema_policy@localhost:5432/kaxi_schema_policy",
    },
    encoding: "utf8",
  });

  if (result.status !== 0) {
    fail(
      [
        `Prisma schema validation failed for ${schemaFile}`,
        result.stdout.trim(),
        result.stderr.trim(),
      ]
        .filter(Boolean)
        .join("\n")
    );
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
  "CaseTimelineEvent",
  "CaseDocumentLink",
  "AgentReview",
  "AuditEvent",
];

assert(!existsSync(removedLegacySchemaPath), "legacy root Prisma schema must be removed");
assert(schema.includes('provider = "postgresql"'), "Prisma schema must use provider postgresql");

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

validatePrismaSchema(schemaPath);

const migrationRoot = join(root, "prisma", "postgres", "migrations");
const migrationFiles = readdirSync(migrationRoot)
  .filter((name) => /^\d/.test(name))
  .sort()
  .map((name) => join(migrationRoot, name, "migration.sql"));

assert(
  migrationFiles.some((file) => file.includes("20260701090000_phase1_operational_domain")),
  "missing Phase 1 PostgreSQL migration"
);
assert(
  migrationFiles.some((file) => file.includes("20260708000000_enable_pgvector")),
  "missing pgvector extension migration"
);
assert(
  migrationFiles.some((file) => file.includes("20260708010000_pgvector_rag")),
  "missing pgvector RAG migration"
);

const postgresSql = migrationFiles.map((file) => readFileSync(file, "utf8")).join("\n");
for (const model of requiredModels) {
  assert(postgresSql.includes(`CREATE TABLE "${model}"`), `PostgreSQL migration missing table ${model}`);
}
assert(postgresSql.includes("CREATE TYPE \"OrgType\""), "PostgreSQL migration should create enum types");
assert(postgresSql.includes("JSONB"), "PostgreSQL migration should use JSONB for structured fields");
assert(/CREATE EXTENSION IF NOT EXISTS vector/i.test(postgresSql), "PostgreSQL migrations must enable pgvector");
assert(/embedding vector\(384\)/i.test(postgresSql), "KnowledgeChunk migration must add 384d pgvector column");
assert(/USING hnsw \(embedding vector_cosine_ops\)/i.test(postgresSql), "KnowledgeChunk migration must add HNSW cosine index");
assert(/USING gin \(tsv\)/i.test(postgresSql), "KnowledgeChunk migration must add tsv GIN index");
assert(postgresSql.includes("kaxi_hybrid_knowledge_search"), "missing RRF hybrid search SQL function");

console.log(`PASS DB schema policy: ${requiredModels.length} domain models, single PostgreSQL schema, pgvector indexes, and RRF function verified`);
