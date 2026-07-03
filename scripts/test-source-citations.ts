import {
  linkCitationMarkers,
  sourceAnnotationDomId,
  type SourceAnnotation,
} from "../src/components/kbridge/SourceAnnotations";
import {
  buildKnowledgeAnswerBasis,
  compactKnowledgeExcerpt,
  KNOWLEDGE_DOCS,
} from "../src/lib/data/knowledge";
import {
  buildKnowledgeSourceList,
  ensureGroundedCitationAnswer,
} from "../src/lib/knowledge/citations";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string): void {
  if (!condition) fail(message);
}

const sources: SourceAnnotation[] = [
  {
    id: "law",
    title: "출입국관리법",
    url: "https://www.law.go.kr",
    verifiedAt: "2026-07-02",
    basis: "체류자격과 신고 의무의 법령 근거",
  },
  {
    id: "hikorea",
    title: "하이코리아 체류 안내",
    url: "https://www.hikorea.go.kr",
    verifiedAt: "2026-07-03",
  },
];

const linked = linkCitationMarkers(
  "법령 근거는 [1][2]입니다. 없는 출처 [3]은 그대로 두고, 기존 링크 [1](https://example.com)은 보존합니다.",
  sources,
  "consult message:0",
  2
);

assert(
  linked.includes(
    '[1](#consult-message-0-source-1 "출입국관리법 — 체류자격과 신고 의무의 법령 근거")[2](#consult-message-0-source-2 "하이코리아 체류 안내")'
  ),
  `citation markers should link to source cards: ${linked}`
);
assert(linked.includes("없는 출처 [3]"), `out-of-range citation should remain plain text: ${linked}`);
assert(linked.includes("[1](https://example.com)"), `existing markdown link should remain unchanged: ${linked}`);
assert(
  sourceAnnotationDomId("consult message:0", 1) === "consult-message-0-source-2",
  "source DOM id should be stable and safe"
);

const doc = KNOWLEDGE_DOCS[0];
const excerpt = compactKnowledgeExcerpt(doc, "ko", 80);
const basis = buildKnowledgeAnswerBasis(doc, "ko");
assert(excerpt.length <= 83, `knowledge excerpt should respect max length: ${excerpt.length}`);
assert(basis.includes("확인일"), `answer basis should include checked date: ${basis}`);

const sourceList = buildKnowledgeSourceList([doc], "ko", 1);
assert(sourceList.includes("📚 출처:"), `source list should include heading: ${sourceList}`);
assert(sourceList.includes("<http"), `source list should include source URL: ${sourceList}`);
assert(sourceList.includes("확인일"), `source list should include checked date: ${sourceList}`);

const normalized = ensureGroundedCitationAnswer({
  answer: "D-4 체류기간 연장은 공식 기준 확인이 필요합니다.",
  docs: [doc],
  lang: "ko",
  sourceNotice: "이 안내는 테스트 출처 기준입니다.",
  maxSources: 1,
});

assert(
  normalized.startsWith("D-4 체류기간 연장은 공식 기준 확인이 필요합니다. [1]"),
  `uncited answer should receive a citation marker: ${normalized}`
);
assert(normalized.includes("📚 출처:"), `normalized answer should include source list: ${normalized}`);
assert(normalized.includes("이 안내는 테스트 출처 기준입니다."), `normalized answer should include source notice: ${normalized}`);

const sourceListOnly = ensureGroundedCitationAnswer({
  answer: "요건은 원문 확인이 필요합니다.\n\n📚 출처:\n- [1] 기존 출처",
  docs: [doc],
  lang: "ko",
  maxSources: 1,
});
assert(
  sourceListOnly.startsWith("요건은 원문 확인이 필요합니다. [1]"),
  `source-list-only citations should not satisfy answer-body citation check: ${sourceListOnly}`
);

console.log("PASS source citation links");
