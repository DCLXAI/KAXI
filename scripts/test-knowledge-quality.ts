import {
  baseKnowledgeDocId,
  canonicalKnowledgeTitle,
  cleanKnowledgeChunkContent,
  evaluateKnowledgeDocumentQuality,
} from "../src/lib/knowledge/chunk-quality";
import { KNOWLEDGE_DOCS } from "../src/lib/data/knowledge-corpus";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

const noisyLawArticle = `
# 출입국관리법 제22조 활동범위의 제한
source_url: https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0022&lsiSeq=272921&urlMode=lsScJoRltInfoR
source_type: official_law
topic: legal
국가법령정보센터 | 변경조문
법령
출입국관리법
[시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정]
법무부 ( 출입국기획과 ), 02-2110-4116
제22조(활동범위의 제한) 법무부장관은 공공의 안녕질서나 대한민국의 중요한 이익을 위하여 필요하다고 인정하면 대한민국에 체류하는 외국인에 대하여 거소 또는 활동의 범위를 제한하거나 그 밖에 필요한 준수사항을 정할 수 있다.
제22조에 따른 제한은 체류자격별 활동범위, 거소 제한, 준수사항 고지와 함께 판단되어야 하며 행정처분 전후의 사실관계 확인이 필요하다.
이 조문은 D-2, D-4, D-10, E-7, F-2, F-5 상담에서 체류자격 범위와 별도 허가 필요성을 설명할 때 우선 근거로 사용한다.
관련 상담은 현재 체류자격, 목표 활동, 체류기간, 외국인등록 여부, 위반 이력, 관할 출입국기관의 요구자료를 함께 확인해야 한다.
또한 제한 또는 준수사항의 적용 여부는 법무부장관의 처분 근거, 고지 내용, 체류자격별 허용 활동과 실제 활동의 차이를 대조하여 설명해야 한다.
화면내검색 입력 폼
HTML XLS(엑셀)
HWP(한글)
파일형식 선택
`;

const cleaned = cleanKnowledgeChunkContent(noisyLawArticle);
assert(cleaned.includes("제22조(활동범위의 제한)"), "article body should remain after cleaning");
assert(!cleaned.includes("화면내검색"), "search UI text must be removed");
assert(!cleaned.includes("HTML XLS"), "download format UI text must be removed");
assert(!cleaned.includes("파일형식"), "file format UI text must be removed");

const approvedReady = evaluateKnowledgeDocumentQuality({
  docId: "immigration-act-activity-scope-restriction__candidate__abc123",
  title: "[검토 후보] 출입국관리법 제22조 활동범위의 제한",
  sourceUrl: "https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0022&lsiSeq=272921&urlMode=lsScJoRltInfoR",
  sourceType: "official_law",
  topic: "legal",
  chunks: [{ chunkIndex: 0, content: noisyLawArticle }],
});
assert(approvedReady.grade === "approve_ready", "clean article-level law candidate should be approval-ready");
assert(!approvedReady.issues.includes("missing_required_article_body"), "article body marker should satisfy required body gate");

const bodylessLawCandidate = evaluateKnowledgeDocumentQuality({
  docId: "immigration-act-visa-issuance-certificate__candidate__abc123",
  title: "[검토 후보] 출입국관리법 제8조·제9조 사증·사증발급인정서",
  sourceUrl: "https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=272921",
  sourceType: "official_law",
  topic: "process",
  chunks: [
    {
      chunkIndex: 0,
      content: `
# 출입국관리법 제8조·제9조 사증·사증발급인정서
source_url: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=272921
source_type: official_law
topic: process
법령 > 본문 > 출입국관리법 | 국가법령정보센터
출입국관리법 [시행 2026. 1. 23.] [법률 제20992호, 2025. 7. 22., 일부개정]
조문의 목록을 제공하고 바로가기 기능을 제공합니다.
화면내검색 입력 폼
한글(본문)
HTML XLS(엑셀)
HWP(한글)
파일형식 선택
`,
    },
  ],
});
assert(bodylessLawCandidate.grade !== "approve_ready", "article-required law candidate without body must not be approved");
assert(
  bodylessLawCandidate.issues.includes("missing_required_article_body"),
  "article-required law candidate should report missing body"
);

assert(
  baseKnowledgeDocId("immigration-act-status-change__candidate__abc123") === "immigration-act-status-change",
  "candidate suffix should be stripped to base doc id"
);
assert(
  canonicalKnowledgeTitle("[검토 후보] 출입국관리법 제24조 체류자격 변경허가") === "출입국관리법 제24조 체류자격 변경허가",
  "candidate title prefix should be stripped"
);

const visaPortal = KNOWLEDGE_DOCS.find((document) => document.id === "visa-portal-visa-types");
assert(visaPortal, "visa portal knowledge document should exist");
assert(
  !/[a-z]/iu.test(visaPortal.title.ko),
  "Korean visa portal title must not mix Latin branding into the localized title",
);
assert(
  /[А-Яа-яЁёӨөҮү]/u.test(visaPortal.title.mn) && !/[a-z]/iu.test(visaPortal.title.mn),
  "Mongolian visa portal title must remain fully localized in Cyrillic",
);

console.log("PASS knowledge quality: law UI cleaning, required body gate, canonicalization, localized titles");
