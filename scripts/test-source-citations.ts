import {
  linkCitationMarkers,
  sourceAnnotationDomId,
  type SourceAnnotation,
} from "../src/components/kbridge/SourceAnnotations";

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
  linked.includes("[1](#consult-message-0-source-1)[2](#consult-message-0-source-2)"),
  `citation markers should link to source cards: ${linked}`
);
assert(linked.includes("없는 출처 [3]"), `out-of-range citation should remain plain text: ${linked}`);
assert(linked.includes("[1](https://example.com)"), `existing markdown link should remain unchanged: ${linked}`);
assert(
  sourceAnnotationDomId("consult message:0", 1) === "consult-message-0-source-2",
  "source DOM id should be stable and safe"
);

console.log("PASS source citation links");
