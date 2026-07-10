import { readFileSync } from "fs";
import { join } from "path";
import {
  VISA_DOCUMENT_REQUIREMENT_SEEDS,
  matrixCompletenessSummary,
} from "../src/lib/documents/visa-document-matrix";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

const root = process.cwd();
const schema = readFileSync(join(root, "prisma", "postgres", "schema.prisma"), "utf8");
const migration = readFileSync(
  join(root, "prisma", "postgres", "migrations", "20260708090000_visa_document_matrix", "migration.sql"),
  "utf8"
);
const summary = matrixCompletenessSummary();

assert(schema.includes("model VisaDocumentRequirement"), "Prisma schema must include VisaDocumentRequirement");
assert(migration.includes('CREATE TABLE "VisaDocumentRequirement"'), "migration must create VisaDocumentRequirement table");
assert(
  migration.includes('ALTER TABLE "VisaDocumentRequirement" ENABLE ROW LEVEL SECURITY;'),
  "VisaDocumentRequirement must enable RLS"
);
assert(
  migration.includes("CREATE POLICY kaxi_visa_document_requirement_public_read") &&
    migration.includes("\"reviewStatus\" = 'APPROVED'::\"LegalReviewStatus\""),
  "VisaDocumentRequirement public policy must expose approved rows only"
);

assert(summary.totalRows === 50, `Phase 0 document matrix must contain exactly 50 labeled rows, got ${summary.totalRows}`);
assert(summary.uniqueCodes === summary.totalRows, "document matrix codes must be unique");
assert(summary.uniqueCompositeRows === summary.totalRows, "visa/action/context/documentType matrix rows must be unique");
assert(summary.validationRuleRows >= 20, `expected at least 20 validation-rule rows, got ${summary.validationRuleRows}`);

for (const visaType of ["D-2", "D-4", "D-10", "E-7", "F-2", "F-5"]) {
  assert(summary.visaTypes.includes(visaType), `matrix must include ${visaType}`);
}

for (const row of VISA_DOCUMENT_REQUIREMENT_SEEDS) {
  assert(row.code.trim().length > 0, "row code is required");
  assert(row.documentType.trim().length > 0, `${row.code} missing documentType`);
  assert(row.issuer.trim().length > 0, `${row.code} missing issuer`);
  assert(row.sourceRefs.length > 0, `${row.code} missing sourceRefs`);
  assert(row.sourceUrl.startsWith("https://"), `${row.code} must use https sourceUrl`);
  assert(row.requiredFields.length > 0, `${row.code} must define requiredFields`);
  assert(row.validationRules.includes("required_document_present"), `${row.code} must check document presence`);
  for (const key of ["balance", "paid_amount", "income_amount", "wage"]) {
    if (row.requiredFields.some((field) => field.key === key && field.required)) {
      assert(row.validationRules.includes(`numeric_positive:${key}`), `${row.code} must validate ${key} as positive numeric`);
    }
  }
  if (row.requiredFields.some((field) => field.key === "attendance_rate" && field.required)) {
    assert(row.validationRules.includes("numeric_range:attendance_rate:0:100"), `${row.code} must validate attendance_rate as a 0-100 numeric range`);
  }
  for (const field of row.requiredFields) {
    assert(field.key.trim().length > 0, `${row.code} has required field without key`);
    assert(field.labelKo.trim().length > 0, `${row.code}.${field.key} missing Korean label`);
    assert(field.labelEn.trim().length > 0, `${row.code}.${field.key} missing English label`);
  }
}

console.log(
  `PASS visa document matrix: ${summary.totalRows} rows, ${summary.validationRuleRows} validation rows, visaTypes=${summary.visaTypes.join(",")}`
);
