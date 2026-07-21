import assert from "node:assert/strict";
const { searchServingRagDocuments } = await import("../src/lib/chat/direct-lexical-fallback");
const { createRagQueryEmbedding } = await import("../src/lib/chat/query-embedding");
import type { QueryEmbeddingResult } from "../src/lib/chat/query-embedding";

// Characterization suite for the deterministic reranker in parseCandidates.
// Method: coefficient-isolating pairs — two candidates identical except for
// the ONE attribute a boost rewards, so the rerank-score delta IS the
// coefficient. This pins every magic number without reimplementing the
// tokenizer. It must pass byte-unchanged across the retrieval-tuning
// extraction refactor.

const noEmbedding: QueryEmbeddingResult = await createRagQueryEmbedding("probe", {
  env: {} as NodeJS.ProcessEnv,
});
assert.equal(noEmbedding.status, "not_configured");

let rowCounter = 0;
function candidateRow(overrides: {
  docId: string;
  title: string;
  content: string;
  category?: string;
  keywords?: string;
}) {
  rowCounter += 1;
  return {
    id: rowCounter,
    content: overrides.content,
    metadata: {
      doc_id: overrides.docId,
      title: overrides.title,
      source: "Hi Korea",
      source_url: `https://www.hikorea.go.kr/${overrides.docId}`,
      last_checked_at: "2026-07-10T00:00:00.000Z",
      checked_by: "kaxi-legal-review",
      language: "ko",
      category: overrides.category || "visa",
      lexical_score: 0.5,
      keywords: overrides.keywords || "",
    },
    similarity: 0,
  };
}

async function scores(question: string, rows: unknown[], category: "visa" | "documents" | "cost" | "school" | "general" = "visa") {
  const result = await searchServingRagDocuments(
    {
      question,
      category,
      locale: "ko",
      tenantId: "default",
      requestId: "11111111-1111-4111-8111-111111111111",
      fallbackReason: "characterization",
      maxDocuments: 6,
    },
    {
      createEmbedding: async () => noEmbedding,
      rpc: async () => ({ data: rows }),
    },
  );
  return new Map(result.documents.map((document) => [document.id, document.rerankScore]));
}

function delta(map: Map<string, number>, a: string, b: string) {
  const left = map.get(a);
  const right = map.get(b);
  assert.ok(left !== undefined && right !== undefined, `both ${a} and ${b} must survive parsing`);
  return Number((left! - right!).toFixed(4));
}

// Shared neutral body: Korean (locale gate), no query-token overlap with the
// questions below, no visa codes, no risk/operational vocabulary.
const NEUTRAL_CONTENT = "## 안내 문서\n대한민국 생활 정보에 대한 일반적인 안내입니다. 지역 행사와 편의시설 정보를 담고 있습니다.";
const NEUTRAL_TITLE = "안내 문서";

// ── categoryExact (0.18), categoryScope (0.08), bias (0.02) ──
// Question is deliberately boost-inert. Base lexical_score is 0.5, so the
// absolute scores pin bias and both category coefficients at once.
{
  const map = await scores("공항 라운지 이용 방법을 알려줘", [
    candidateRow({ docId: "cat-exact", title: NEUTRAL_TITLE, content: NEUTRAL_CONTENT, category: "visa" }),
    candidateRow({ docId: "cat-scope", title: NEUTRAL_TITLE, content: NEUTRAL_CONTENT, category: "legal" }),
  ]);
  assert.equal(map.get("cat-exact"), 0.7, "base 0.5 + categoryExact 0.18 + bias 0.02");
  assert.equal(map.get("cat-scope"), 0.6, "base 0.5 + categoryScope 0.08 + bias 0.02");
  assert.equal(delta(map, "cat-exact", "cat-scope"), 0.1);
  console.log("PASS retrieval tuning: category boosts + bias (absolute anchors)");
}

// ── risk (0.58) ── risk marker lives in docId only (docId is NOT part of
// body/heading coverage text), so the pair isolates the risk coefficient.
// Fixture adjustment: the brief's original question ("허위 서류를 내면 어떤
// 처벌을 받나요") contains "서류", which trips the required_documents
// QUESTION_INTENTS pattern; selectAnswerableDocuments then hard-filters to
// only documents whose text matches that intent's evidence pattern, and
// "ordinary-guide" has no such evidence and is dropped from the result
// entirely (not merely re-scored), breaking isolation. "위조" (forgery)
// alone still trips RISK_QUERY_PATTERN without matching any
// QUESTION_INTENTS questionPattern, so both candidates survive selection.
{
  const map = await scores("여권을 위조하면 어떻게 되나요", [
    candidateRow({ docId: "fake-documents-warning", title: NEUTRAL_TITLE, content: NEUTRAL_CONTENT }),
    candidateRow({ docId: "ordinary-guide", title: NEUTRAL_TITLE, content: NEUTRAL_CONTENT }),
  ]);
  assert.equal(delta(map, "fake-documents-warning", "ordinary-guide"), 0.58);
  console.log("PASS retrieval tuning: risk boost");
}

// ── visaCode (0.34) ── code appears in docId only; content/title carry none.
// Fixture adjustment: the brief's original question ("D-4 비자 정보를 알려줘")
// makes selectAnswerableDocuments apply its requestedVisaCodes filter (any
// question containing a visa code narrows results to documents whose text
// carries a matching code, or that satisfy a question-intent's evidence
// pattern with no code at all). "guide-plain-info" carries no visa code and
// the plain question triggers no QUESTION_INTENTS, so it was dropped from
// the result outright (not merely re-scored), breaking isolation. Adding
// "자격 요건" to the question activates the eligibility intent, and adding
// the same neutral "자격 요건" evidence phrase to BOTH candidates' shared
// content lets "guide-plain-info" survive via genericSupportingEvidence
// while the added body-coverage/heading-coverage effect is identical for
// both candidates and cancels out of the delta.
{
  const VISA_CODE_TEST_CONTENT = `${NEUTRAL_CONTENT} 일반적인 자격 요건 정보를 담고 있습니다.`;
  const map = await scores("D-4 비자 자격 요건을 알려줘", [
    candidateRow({ docId: "guide-d4-info", title: NEUTRAL_TITLE, content: VISA_CODE_TEST_CONTENT }),
    candidateRow({ docId: "guide-plain-info", title: NEUTRAL_TITLE, content: VISA_CODE_TEST_CONTENT }),
  ]);
  assert.equal(delta(map, "guide-d4-info", "guide-plain-info"), 0.34);
  console.log("PASS retrieval tuning: visa-code boost");
}

// ── exactOperational (0.56) ── question triggers the stay-extension rule;
// the hyphenated hint token in docId marks an exact operational identity.
// Fixture adjustment: the brief's original question ("체류기간 연장 신청은
// 어떻게 하나요") contains "기간" (inside "체류기간"), which trips the
// deadline_or_timing QUESTION_INTENTS pattern. Neither candidate's text
// carries any deadline_or_timing evidence (no "기간"/"만료"/etc. in the
// docId/title/content), so BOTH candidates get hard-filtered out of the
// result by selectAnswerableDocuments (coveredIntentIds stays empty),
// breaking isolation entirely. Dropping "기간" ("체류 연장 신청은 어떻게
// 하나요") still trips the stay-extension OPERATIONAL_QUERY_RULES pattern
// ("연장\s*신청") without matching any QUESTION_INTENTS pattern, so both
// candidates survive selection.
{
  const map = await scores("체류 연장 신청은 어떻게 하나요", [
    candidateRow({ docId: "hikorea-stay-extension", title: NEUTRAL_TITLE, content: NEUTRAL_CONTENT }),
    candidateRow({ docId: "unrelated-guide", title: NEUTRAL_TITLE, content: NEUTRAL_CONTENT }),
  ]);
  assert.equal(delta(map, "hikorea-stay-extension", "unrelated-guide"), 0.56);
  console.log("PASS retrieval tuning: exact operational identity boost");
}

// ── operationalCoverageCap (0.3) ── keywords stuffed with the rule's hint
// vocabulary (non-Korean tokens only, so body coverage is untouched; no
// hyphenated token in docId/title, so the exact-identity path stays off).
// Two different stuffing levels both landing on the cap prove the cap.
// Fixture adjustment: the brief's original question ("체류기간이 만료되기
// 전에 무엇을 해야 하나요") contains "기간" (inside "체류기간이"), which
// trips the deadline_or_timing QUESTION_INTENTS pattern; none of the three
// candidates' text carries deadline_or_timing evidence, so all three get
// hard-filtered out of the result (coveredIntentIds stays empty), breaking
// isolation entirely. Dropping "기간" ("체류가 만료되기 전에 무엇을 해야
// 하나요") still trips the stay-extension OPERATIONAL_QUERY_RULES pattern
// ("체류.{0,20}(?:만료|연장)") without matching any QUESTION_INTENTS
// pattern, so all three candidates survive selection.
{
  const map = await scores("체류가 만료되기 전에 무엇을 해야 하나요", [
    candidateRow({ docId: "capped-a", title: NEUTRAL_TITLE, content: NEUTRAL_CONTENT, keywords: "stay extension gia hạn хугацаа сунгах" }),
    candidateRow({ docId: "capped-b", title: NEUTRAL_TITLE, content: NEUTRAL_CONTENT, keywords: "stay extension gia hạn хугацаа сунгах hikorea-stay-extension immigration-act-stay-extension" }),
    candidateRow({ docId: "no-keywords", title: NEUTRAL_TITLE, content: NEUTRAL_CONTENT }),
  ]);
  assert.equal(delta(map, "capped-a", "capped-b"), 0, "both stuffing levels must hit the cap");
  assert.equal(delta(map, "capped-a", "no-keywords"), 0.3, "cap value");
  console.log("PASS retrieval tuning: operational coverage cap");
}

// ── bodyCoverage (0.45) and headingCoverage (0.25) ── query tokens appear
// only in keywords (body-only: +0.45) or only in the title (title text is
// part of the body text too: +0.45 + 0.25 = 0.70).
{
  const map = await scores("환승공항 라운지 위치", [
    candidateRow({ docId: "kw-only", title: NEUTRAL_TITLE, content: NEUTRAL_CONTENT, keywords: "환승공항 라운지 위치" }),
    // localizedTitle prefers the CONTENT's first heading over metadata.title,
    // so the tokens must live in the heading line itself.
    candidateRow({ docId: "title-hit", title: "환승공항 라운지 위치", content: "## 환승공항 라운지 위치\n대한민국 생활 정보에 대한 일반적인 안내입니다." }),
    candidateRow({ docId: "no-hit", title: NEUTRAL_TITLE, content: NEUTRAL_CONTENT }),
  ]);
  assert.equal(delta(map, "kw-only", "no-hit"), 0.45, "body coverage weight");
  assert.equal(delta(map, "title-hit", "no-hit"), 0.7, "heading 0.25 + body 0.45 (title feeds both)");
  console.log("PASS retrieval tuning: coverage weights");
}

// ── ordering + dedup + result-size clamp ──
{
  const dupA = candidateRow({ docId: "dup-doc", title: NEUTRAL_TITLE, content: NEUTRAL_CONTENT });
  const dupB = candidateRow({ docId: "dup-doc", title: NEUTRAL_TITLE, content: NEUTRAL_CONTENT });
  const distinct = Array.from({ length: 7 }, (_, index) =>
    candidateRow({ docId: `doc-${index}`, title: NEUTRAL_TITLE, content: NEUTRAL_CONTENT }));
  const map = await scores("공항 라운지 이용 방법을 알려줘", [dupA, dupB, ...distinct]);
  assert.equal(map.size, 6, "dedup by docId + clamp to maxDocuments");
  assert.equal(map.has("dup-doc"), true);
  console.log("PASS retrieval tuning: dedup and result clamp");
}

console.log("PASS retrieval tuning characterization: every rerank coefficient pinned");
