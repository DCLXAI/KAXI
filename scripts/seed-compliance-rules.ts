import { Prisma } from "@prisma/client";
import cases from "../quality/visa-rule-golden-cases.json";
import { db } from "../src/lib/db";
import { VISA_COMPLIANCE_RULE_SEEDS } from "../src/lib/rules/visa-rule-seed";

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function seedComplianceRules() {
  const versions: { code: string; id: string }[] = [];

  for (const seed of VISA_COMPLIANCE_RULE_SEEDS) {
    const rule = await db.complianceRule.upsert({
      where: { code: seed.code },
      update: {
        domain: seed.domain,
        visaType: seed.visaType,
        ruleType: seed.ruleType,
        status: seed.status,
      },
      create: {
        code: seed.code,
        domain: seed.domain,
        visaType: seed.visaType,
        ruleType: seed.ruleType,
        status: seed.status,
      },
    });

    const version = await db.complianceRuleVersion.upsert({
      where: {
        ruleId_version: {
          ruleId: rule.id,
          version: seed.version,
        },
      },
      update: {
        effectiveFrom: new Date(seed.effectiveFrom),
        effectiveTo: seed.effectiveTo ? new Date(seed.effectiveTo) : null,
        conditionAst: jsonValue(seed.conditionAst),
        outputAst: jsonValue(seed.outputAst),
        requiredInputs: jsonValue(seed.requiredInputs),
        sourceRefs: jsonValue(seed.sourceRefs),
        fallbackPolicy: seed.fallbackPolicy,
        reviewStatus: seed.reviewStatus,
        reviewedBy: seed.reviewedBy,
        reviewedAt: new Date(seed.reviewedAt),
      },
      create: {
        ruleId: rule.id,
        version: seed.version,
        effectiveFrom: new Date(seed.effectiveFrom),
        effectiveTo: seed.effectiveTo ? new Date(seed.effectiveTo) : null,
        conditionAst: jsonValue(seed.conditionAst),
        outputAst: jsonValue(seed.outputAst),
        requiredInputs: jsonValue(seed.requiredInputs),
        sourceRefs: jsonValue(seed.sourceRefs),
        fallbackPolicy: seed.fallbackPolicy,
        reviewStatus: seed.reviewStatus,
        reviewedBy: seed.reviewedBy,
        reviewedAt: new Date(seed.reviewedAt),
      },
    });
    versions.push({ code: seed.code, id: version.id });
  }

  const anchorVersion = versions.find((version) => version.code === "visa-type-from-program") || versions[0];
  if (!anchorVersion) throw new Error("No compliance rule version was seeded.");

  for (const testCase of cases) {
    await db.complianceRuleTest.upsert({
      where: {
        ruleVersionId_caseId: {
          ruleVersionId: anchorVersion.id,
          caseId: testCase.id,
        },
      },
      update: {
        input: jsonValue(testCase.input),
        expected: jsonValue(testCase.expect),
        passed: false,
        lastResult: Prisma.JsonNull,
      },
      create: {
        ruleVersionId: anchorVersion.id,
        caseId: testCase.id,
        input: jsonValue(testCase.input),
        expected: jsonValue(testCase.expect),
      },
    });
  }

  return {
    rules: VISA_COMPLIANCE_RULE_SEEDS.length,
    versions: versions.length,
    tests: cases.length,
  };
}

if (import.meta.main) {
  seedComplianceRules()
    .then(async (result) => {
      console.log(
        `[seed-compliance-rules] seeded ${result.rules} rule(s), ${result.versions} version(s), ${result.tests} test case(s)`
      );
      await db.$disconnect();
    })
    .catch(async (err) => {
      console.error(`[seed-compliance-rules] ${err instanceof Error ? err.message : String(err)}`);
      await db.$disconnect();
      process.exit(1);
    });
}
