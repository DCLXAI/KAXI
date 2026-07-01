import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import cases from "../quality/visa-rule-golden-cases.json";
import { prepareLocalDb } from "./prepare-local-db";
import { VISA_COMPLIANCE_RULE_SEEDS } from "../src/lib/rules/visa-rule-seed";
import { VISA_RULES, type VisaRuleInput } from "../src/lib/rules/visa-rules";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

function includesText(values: string[], needle: string): boolean {
  return values.some((value) => value.includes(needle));
}

function jsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

async function deleteRuleByCode(db: any, code: string) {
  await db.complianceRule.delete({ where: { code } }).catch(() => {});
}

async function createTestRuleVersion(
  db: any,
  code: string,
  overrides: Record<string, unknown> = {}
) {
  const rule = await db.complianceRule.create({
    data: {
      code,
      domain: "student_visa",
      visaType: "D-2/D-4",
      ruleType: "test_guard",
      status: "ACTIVE",
    },
  });

  return db.complianceRuleVersion.create({
    data: {
      ruleId: rule.id,
      version: 1,
      effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
      effectiveTo: null,
      conditionAst: { op: "always" },
      outputAst: {
        riskLevel: "LOW",
        resultType: "visa_rule",
        messageKey: code,
        requiresHumanReview: false,
        operations: [{ op: "add_core_documents" }],
      },
      requiredInputs: ["visa_type"],
      sourceRefs: ["test-source"],
      fallbackPolicy: "Test rule fallback policy.",
      reviewStatus: "APPROVED",
      reviewedBy: "test",
      reviewedAt: new Date("2026-07-01T00:00:00.000Z"),
      ...overrides,
    },
  });
}

if (VISA_RULES.length !== 5) {
  fail(`expected exactly 5 D-2/D-4 core rules, got ${VISA_RULES.length}`);
}

if (VISA_COMPLIANCE_RULE_SEEDS.length !== VISA_RULES.length) {
  fail(`expected ${VISA_RULES.length} DB rule seeds, got ${VISA_COMPLIANCE_RULE_SEEDS.length}`);
}

for (const rule of VISA_COMPLIANCE_RULE_SEEDS) {
  assert(rule.requiredInputs.length > 0, `${rule.code} missing requiredInputs`);
  assert(Boolean(rule.effectiveFrom), `${rule.code} missing effectiveFrom`);
  assert(rule.sourceRefs.length > 0, `${rule.code} missing sourceRefs`);
  assert(rule.reviewStatus === "APPROVED", `${rule.code} must be APPROVED`);
  assert(Boolean(rule.fallbackPolicy), `${rule.code} missing fallbackPolicy`);
  assert(rule.outputAst.operations.length > 0, `${rule.code} missing outputAst operations`);
}

if (cases.length < 20) {
  fail(`expected at least 20 golden test cases, got ${cases.length}`);
}

const tmpDir = mkdtempSync(join(tmpdir(), "kaxi-rule-test-"));
process.env.DATABASE_URL = `file:${join(tmpDir, "rules.db")}`;
process.env.RESTORE_SQLITE_DEMO_DB = "false";
prepareLocalDb(process.env.DATABASE_URL);

const { db } = await import("../src/lib/db");
const { seedComplianceRules } = await import("./seed-compliance-rules");
const { ComplianceRuleValidationError, evaluateVisaRulesFromDb } = await import(
  "../src/lib/rules/visa-rule-engine"
);

try {
  await seedComplianceRules();
  const seededTestCount = await db.complianceRuleTest.count();
  assert(seededTestCount >= 20, `expected at least 20 DB compliance rule tests, got ${seededTestCount}`);

  let passed = 0;
  for (const testCase of cases) {
    const result = await evaluateVisaRulesFromDb(testCase.input as VisaRuleInput, {
      referenceDate: new Date("2026-07-01T12:00:00.000Z"),
    });
    const expected = testCase.expect as {
      visa_type?: string | null;
      includes_docs?: string[];
      excludes_docs?: string[];
      includes_missing?: string[];
      missing_inputs?: string[];
      includes_warnings?: string[];
      financial_note_contains?: string;
      partner_escalation?: boolean;
      blocked?: boolean;
    };

    if ("visa_type" in expected) {
      assert(
        result.visa_type === expected.visa_type,
        `${testCase.id} visa_type expected ${expected.visa_type}, got ${result.visa_type}`
      );
    }

    const docIds = result.documents.map((doc) => doc.id);
    for (const docId of expected.includes_docs || []) {
      assert(docIds.includes(docId), `${testCase.id} expected doc ${docId}, got ${docIds.join(", ")}`);
    }
    for (const docId of expected.excludes_docs || []) {
      assert(!docIds.includes(docId), `${testCase.id} should not include doc ${docId}, got ${docIds.join(", ")}`);
    }

    if (expected.financial_note_contains) {
      const financial = result.documents.find((doc) => doc.id === "financial_proof");
      assert(
        financial?.note.includes(expected.financial_note_contains),
        `${testCase.id} financial note expected ${expected.financial_note_contains}, got ${financial?.note}`
      );
    }

    if (expected.missing_inputs) {
      assert(
        JSON.stringify(result.missing_inputs.sort()) === JSON.stringify([...expected.missing_inputs].sort()),
        `${testCase.id} missing_inputs expected ${expected.missing_inputs}, got ${result.missing_inputs}`
      );
    }
    for (const missing of expected.includes_missing || []) {
      assert(
        result.missing_inputs.includes(missing),
        `${testCase.id} expected missing input ${missing}, got ${result.missing_inputs.join(", ")}`
      );
    }

    for (const warning of expected.includes_warnings || []) {
      assert(
        includesText(result.warnings, warning),
        `${testCase.id} expected warning containing ${warning}, got ${result.warnings.join(" | ")}`
      );
    }

    if (typeof expected.partner_escalation === "boolean") {
      assert(
        (result.partner_escalation_reasons.length > 0) === expected.partner_escalation,
        `${testCase.id} partner escalation expected ${expected.partner_escalation}, got ${result.partner_escalation_reasons}`
      );
    }
    if (typeof expected.blocked === "boolean") {
      assert(
        (result.blocked_reasons.length > 0) === expected.blocked,
        `${testCase.id} blocked expected ${expected.blocked}, got ${result.blocked_reasons}`
      );
    }

    assert(
      result.applied_rule_ids.length === VISA_COMPLIANCE_RULE_SEEDS.length,
      `${testCase.id} should apply ${VISA_COMPLIANCE_RULE_SEEDS.length} approved DB rule versions`
    );
    assert(result.review_status === "approved", `${testCase.id} expected approved review status`);
    assert(result.source_refs.length > 0, `${testCase.id} expected source refs`);
    assert(
      result.documents.every((doc) => doc.source_refs.length > 0),
      `${testCase.id} every returned document must carry source refs`
    );

    await db.complianceRuleTest.updateMany({
      where: { caseId: testCase.id },
      data: {
        passed: true,
        lastResult: jsonValue(result),
      },
    });
    passed += 1;
  }

  const dbPassedCount = await db.complianceRuleTest.count({ where: { passed: true } });
  assert(dbPassedCount === seededTestCount, `expected 100% DB rule test pass rate, got ${dbPassedCount}/${seededTestCount}`);

  const pendingCode = "test-pending-rule-cannot-execute";
  await deleteRuleByCode(db, pendingCode);
  await createTestRuleVersion(db, pendingCode, { reviewStatus: "PENDING", reviewedAt: null });
  const pendingResult = await evaluateVisaRulesFromDb({ visa_type: "D-2", nationality: "vn" }, {
    referenceDate: new Date("2026-07-01T12:00:00.000Z"),
  });
  assert(!pendingResult.applied_rule_ids.includes(pendingCode), "unapproved PENDING rule must not execute");
  await deleteRuleByCode(db, pendingCode);

  const futureCode = "test-future-rule-cannot-execute";
  await deleteRuleByCode(db, futureCode);
  await createTestRuleVersion(db, futureCode, { effectiveFrom: new Date("2099-01-01T00:00:00.000Z") });
  const futureResult = await evaluateVisaRulesFromDb({ visa_type: "D-2", nationality: "vn" }, {
    referenceDate: new Date("2026-07-01T12:00:00.000Z"),
  });
  assert(!futureResult.applied_rule_ids.includes(futureCode), "future effectiveFrom rule must not execute");
  await deleteRuleByCode(db, futureCode);

  const expiredCode = "test-expired-rule-cannot-execute";
  await deleteRuleByCode(db, expiredCode);
  await createTestRuleVersion(db, expiredCode, {
    effectiveFrom: new Date("2020-01-01T00:00:00.000Z"),
    effectiveTo: new Date("2025-12-31T23:59:59.000Z"),
  });
  const expiredResult = await evaluateVisaRulesFromDb({ visa_type: "D-2", nationality: "vn" }, {
    referenceDate: new Date("2026-07-01T12:00:00.000Z"),
  });
  assert(!expiredResult.applied_rule_ids.includes(expiredCode), "expired effectiveTo rule must not execute");
  await deleteRuleByCode(db, expiredCode);

  const invalidSourceCode = "test-missing-source-refs-fails";
  await deleteRuleByCode(db, invalidSourceCode);
  await createTestRuleVersion(db, invalidSourceCode, { sourceRefs: [] });
  let sourceRefsFailureObserved = false;
  try {
    await evaluateVisaRulesFromDb({ visa_type: "D-2", nationality: "vn" }, {
      referenceDate: new Date("2026-07-01T12:00:00.000Z"),
    });
  } catch (err) {
    sourceRefsFailureObserved = err instanceof ComplianceRuleValidationError;
  }
  assert(sourceRefsFailureObserved, "approved active rule without sourceRefs must fail CI");
  await deleteRuleByCode(db, invalidSourceCode);

  const user = await db.user.create({
    data: {
      role: "STUDENT",
      email: `visa-rule-${Date.now()}@example.test`,
      studentProfile: {
        create: {
          nationality: "VN",
          visaType: "D-2",
          programType: "degree",
        },
      },
    },
    include: { studentProfile: true },
  });
  assert(user.studentProfile?.id, "test student profile should be created");
  const persistedResult = await evaluateVisaRulesFromDb(
    { visa_type: "D-2", nationality: "vn" },
    {
      referenceDate: new Date("2026-07-01T12:00:00.000Z"),
      studentProfileId: user.studentProfile.id,
      persistEvaluation: true,
    }
  );
  const evaluationCount = await db.complianceEvaluation.count({
    where: { studentProfileId: user.studentProfile.id },
  });
  assert(
    evaluationCount === persistedResult.applied_rule_ids.length,
    `expected one ComplianceEvaluation per applied rule version, got ${evaluationCount}`
  );
  await db.user.delete({ where: { id: user.id } });

  console.log(`PASS visa DB rules golden cases: ${passed}/${cases.length}; DB pass rate ${dbPassedCount}/${seededTestCount}`);
} finally {
  await db.$disconnect();
  rmSync(tmpDir, { recursive: true, force: true });
}
