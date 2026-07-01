import cases from "../quality/visa-rule-golden-cases.json";
import { evaluateVisaRules, VISA_RULES, type VisaRuleInput } from "../src/lib/rules/visa-rules";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

function includesText(values: string[], needle: string): boolean {
  return values.some((value) => value.includes(needle));
}

if (VISA_RULES.length !== 5) {
  fail(`expected exactly 5 D-2/D-4 core rules, got ${VISA_RULES.length}`);
}

for (const rule of VISA_RULES) {
  assert(rule.required_inputs.length > 0, `${rule.id} missing required_inputs`);
  assert(Boolean(rule.effective_from), `${rule.id} missing effective_from`);
  assert(rule.source_refs.length > 0, `${rule.id} missing source_refs`);
  assert(Boolean(rule.review_status), `${rule.id} missing review_status`);
  assert(Boolean(rule.fallback_policy), `${rule.id} missing fallback_policy`);
}

if (cases.length !== 20) {
  fail(`expected 20 golden test cases, got ${cases.length}`);
}

let passed = 0;

for (const testCase of cases) {
  const result = evaluateVisaRules(testCase.input as VisaRuleInput);
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

  assert(result.applied_rule_ids.length === 5, `${testCase.id} should apply 5 rule metadata entries`);
  assert(result.review_status === "approved", `${testCase.id} expected approved review status`);
  assert(result.source_refs.length > 0, `${testCase.id} expected source refs`);
  passed += 1;
}

console.log(`PASS visa rules golden cases: ${passed}/${cases.length}`);

