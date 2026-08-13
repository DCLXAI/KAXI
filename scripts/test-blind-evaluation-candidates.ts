import { strict as assert } from "assert";
import {
  BLIND_EVAL_LOCALES,
  buildBlindEvaluationCandidates,
} from "../quality/blind-eval-candidates";

const cases = buildBlindEvaluationCandidates();
assert.equal(cases.length, 208, "blind candidate bank must contain exactly 208 cases");
assert.equal(new Set(cases.map((item) => item.id)).size, cases.length, "case ids must be unique");
assert.equal(new Set(cases.map((item) => item.question.trim().toLocaleLowerCase())).size, cases.length, "questions must be unique");

for (const locale of BLIND_EVAL_LOCALES) {
  assert.equal(cases.filter((item) => item.locale === locale).length, 52, `${locale} must have 52 cases`);
}

const categoryCounts = Object.fromEntries(
  [...new Set(cases.map((item) => item.category))].map((category) => [
    category,
    cases.filter((item) => item.category === category).length,
  ]),
);
for (const required of ["visa", "documents", "cost", "school", "process", "warning", "general"]) {
  assert(Number(categoryCounts[required]) > 0, `category ${required} must be represented`);
}

for (const item of cases) {
  assert(item.question.trim().length >= 12, `${item.id} question is too short`);
  assert(item.expectedNoContext || item.expectedDocIds.length > 0, `${item.id} needs expected evidence or no-context`);
  assert(!item.expectedNoContext || item.expectedDocIds.length === 0, `${item.id} no-context case cannot expect evidence`);
}

console.log(`PASS blind evaluation candidates: ${cases.length} cases, ${JSON.stringify(categoryCounts)}`);
