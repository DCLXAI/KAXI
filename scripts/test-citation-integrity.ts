import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { auditCitations, citedIndexes, remapCitations } from "../src/lib/chat/citation-audit";

// P0-6. The grounded answer path renumbered citation markers to match the
// sources it kept and left anything it could not map exactly as written:
//
//   return mapped ? `[${mapped}]` : citation;
//
// The failure this allows is not a broken link. With the model writing [1] and
// [3] but declaring usedSourceIndexes=[3], source 3 became [1] and the original
// [1] — whose document was dropped — stayed [1]. Two markers, same number,
// pointing at one document that only supports one of the claims. A reader who
// checks the citation lands on a real, current, official-looking source that
// says something else.
//
// These are pure functions, so this suite needs no credentials and no model.

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assertOk(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

// 1. The exact collision the old code produced.
{
  const answer = "체류 기간은 2년입니다[1]. 연장은 온라인으로 신청합니다[3].";
  const { answer: remapped, unmapped } = remapCitations(answer, [3]);

  assert.deepEqual(unmapped, [1], "a marker the model never declared must be reported, not passed through");

  // The old implementation produced "…2년입니다[1]…신청합니다[1]" — the first
  // claim silently reattributed to document 3.
  const markers = citedIndexes(remapped);
  assertOk(
    !(markers.length === 1 && markers[0] === 1 && unmapped.length === 0),
    "an undeclared marker must never be silently merged into a surviving source",
  );
}

// 2. A clean generation renumbers correctly and reports nothing.
{
  const answer = "A는 X입니다[2]. B는 Y입니다[5]. C도 X입니다[2].";
  const { answer: remapped, unmapped } = remapCitations(answer, [2, 5]);

  assert.deepEqual(unmapped, [], "a generation citing only what it declared is not a failure");
  assert.equal(remapped, "A는 X입니다[1]. B는 Y입니다[2]. C도 X입니다[1].");
  assert.deepEqual(citedIndexes(remapped), [1, 2], "markers must be renumbered to the kept source positions");

  const audit = auditCitations(remapped, 2);
  assertOk(audit.valid, "every marker resolves, so the answer is renderable");
  assert.deepEqual(audit.invalidIndexes, []);
}

// 3. An answer with no markers at all is valid — some answers legitimately cite
//    nothing — but it must not be confused with one whose markers all failed.
{
  const audit = auditCitations("근거 표시 없는 문장입니다.", 2);
  assertOk(audit.valid, "an uncited answer is not an invalid one");
  assert.deepEqual(audit.citedIndexes, []);
}

console.log("PASS citation integrity: an undeclared marker is reported instead of pointing at another document");

// 4. Out-of-range markers, including the one the plan calls out: one source must
//    not permit [2].
{
  const single = auditCitations("비용은 30만원입니다[2].", 1);
  assertOk(!single.valid, "[2] with one source must be invalid");
  assert.deepEqual(single.invalidIndexes, [2]);

  const zero = auditCitations("문장입니다[0].", 3);
  assertOk(!zero.valid, "[0] points at nothing and must be invalid");
  assert.deepEqual(zero.invalidIndexes, [0]);

  const none = auditCitations("문장입니다[1].", 0);
  assertOk(!none.valid, "any marker is invalid when the answer is shown with no sources");

  const edge = auditCitations("문장입니다[3].", 3);
  assertOk(edge.valid, "the last source must be citable, or the bound is off by one");
}

console.log("PASS citation integrity: a marker outside the rendered source list is invalid");

// 5. The route must act on both signals. This is a source-level pin because the
//    alternative is standing up an LLM — but it is the assertion that matters:
//    an audit nobody branches on is decoration.
{
  const route = readFileSync("src/lib/chat/direct-lexical-fallback.ts", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*\/\//.test(line))
    .join("\n");

  assertOk(
    !/return mapped \? `\[\$\{mapped\}\]` : citation/.test(route),
    "the pass-through remap must be gone, not shadowed by a second copy",
  );

  const auditAt = route.indexOf("auditCitations(");
  assertOk(auditAt !== -1, "the grounded path must audit its citations");

  const downgradeAt = route.indexOf("remapped.unmapped.length > 0 || !audit.valid");
  assertOk(downgradeAt !== -1, "both an undeclared marker and an out-of-range one must downgrade");
  assertOk(downgradeAt > auditAt, "the downgrade must read the audit, not precede it");

  // The rendered answer must be produced after the downgrade branch, or an
  // invalid generation reaches the user before anything checks it.
  const renderAt = route.indexOf("answerWithSources(answer, sources, input.locale)");
  assertOk(renderAt !== -1, "the grounded answer must still be rendered with its sources");
  assertOk(renderAt > downgradeAt, "an invalid generation must be discarded before it is rendered");

  assertOk(
    /answerGenerationFailureReason: "invalid_generation"/.test(route.slice(downgradeAt, renderAt)),
    "the downgrade must report invalid_generation so the failure is visible in searchMeta",
  );
}

console.log("PASS citation integrity: an invalid generation is discarded before it can be rendered");
