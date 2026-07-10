import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import {
  getKnowledgeDocsWithMetadata,
  getRagDocumentMetadata,
  pickLangText,
  type KnowledgeDocWithMetadata,
} from "../src/lib/data/knowledge";
import type { Lang } from "../src/lib/i18n/translations";
import { db } from "../src/lib/db";
import { VISA_DOCUMENT_REQUIREMENT_SEEDS } from "../src/lib/documents/visa-document-matrix";
import { parseOfficialSourceExtractionMetadata } from "../src/lib/knowledge/harvest-metadata";
import { VISA_COMPLIANCE_RULE_SEEDS } from "../src/lib/rules/visa-rule-seed";
import { VISA_RULES, VISA_RULE_SOURCE_REFS } from "../src/lib/rules/visa-rules";

type DbKnowledgeDoc = Awaited<ReturnType<typeof loadDbKnowledgeDocuments>>[number];
type DbKnowledgeCandidate = Awaited<ReturnType<typeof loadDbKnowledgeCandidates>>[number];
type DbRuleVersion = Awaited<ReturnType<typeof loadDbRuleVersions>>[number];
type DbVisaDocumentRequirement = Awaited<ReturnType<typeof loadDbVisaDocumentRequirements>>[number];

const TODAY = new Date().toISOString().slice(0, 10);
const DEFAULT_OUT_DIR = join(process.cwd(), "legal-review", "latest");
const REVIEW_LANGS: Lang[] = ["ko", "en", "vi", "mn"];

const SERVICE_REVIEW_ITEMS = [
  {
    id: "B1",
    group: "legal_documents",
    title: "역할 경계 정의",
    path: "docs/legal/role-boundary.md",
    focus: "AI 상담·서류 사전검증·케이스 인계가 행정사 업무 대행으로 오인되지 않는지",
  },
  {
    id: "B2",
    group: "legal_documents",
    title: "파트너 행정사 계약 초안",
    path: "docs/legal/admin-scrivener-partner-contract-draft.md",
    focus: "수수료 모델, 책임 분담, 손해배상, 소개·알선료 리스크",
  },
  {
    id: "B3",
    group: "legal_documents",
    title: "개인정보처리방침 초안",
    path: "docs/legal/privacy-policy-draft.md",
    focus: "수집 항목, 보존기간, Claude API 국외이전 고지",
  },
  {
    id: "B4",
    group: "legal_documents",
    title: "제3자 제공 흐름",
    path: "docs/legal/data-sharing-flow.md",
    focus: "THIRD_PARTY_PROVISION 동의 시점과 행정사 제공 정보 범위",
  },
  {
    id: "B5",
    group: "legal_documents",
    title: "학생 이용약관 초안",
    path: "docs/legal/student-terms-draft.md",
    focus: "AI 안내 한계 고지와 면책 조항",
  },
  {
    id: "C1",
    group: "service_copy",
    title: "AI 답변 고지문",
    path: "src/components/kbridge/SourceAnnotations.tsx, src/app/api/ai/consult/route.ts, src/lib/agent/meta.ts",
    focus: "법률 자문 아님, 출처, 확인일, 4개 언어 문구의 법적 등가성",
  },
  {
    id: "C2",
    group: "service_copy",
    title: "거절·경고 시나리오",
    path: "src/lib/agent/fallback.ts, src/lib/agent/agent.ts, src/app/api/ai/consult/route.ts",
    focus: "허위서류, 비자보장, 불법취업, 취업매칭 제외 문구의 적정성",
  },
  {
    id: "C3",
    group: "service_copy",
    title: "파트너 노출 문구",
    path: "src/components, src/app",
    focus: "검증된 행정사 표현의 근거와 자격 확인 절차",
  },
  {
    id: "C4",
    group: "service_copy",
    title: "고위험 에스컬레이션 트리거",
    path: "src/lib/cases/high-risk-hook.ts",
    focus: "불법체류, 강제퇴거, 이의신청 등 AI가 넘겨야 하는 케이스 누락 여부",
  },
  {
    id: "D1",
    group: "facts",
    title: "학교 DB 50곳",
    path: "src/lib/data/schools.ts, School table",
    focus: "인증대학 여부, 학비 범위, 비자심사 강화 플래그 근거와 명예훼손 리스크",
  },
  {
    id: "D2",
    group: "facts",
    title: "비용 계산 수치",
    path: "src/lib, components cost breakdown",
    focus: "학비, 비자수수료, 생활비, 처리비용의 최신성",
  },
  {
    id: "D3",
    group: "facts",
    title: "서류 체크리스트/OCR 유형",
    path: "Documents 화면, src/lib/documents",
    focus: "체류유형별 필수 서류 누락·과잉 여부",
  },
];

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] || null;
}

function isStaticOnlyMode(): boolean {
  return process.argv.includes("--static-only");
}

function outDir(): string {
  return argValue("--out") || DEFAULT_OUT_DIR;
}

function mdEscape(value: unknown): string {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
}

function codeBlock(value: unknown, lang = ""): string {
  return `\`\`\`${lang}\n${String(value ?? "").replace(/```/g, "'''")}\n\`\`\``;
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 10);
}

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function normalizeStaticStatus(status: string): "PENDING" | "APPROVED" | "REJECTED" {
  if (status === "approved") return "APPROVED";
  if (status === "deprecated") return "REJECTED";
  return "PENDING";
}

function sourceRefMap() {
  return new Map<string, (typeof VISA_RULE_SOURCE_REFS)[keyof typeof VISA_RULE_SOURCE_REFS]>(
    Object.values(VISA_RULE_SOURCE_REFS).map((source) => [source.id, source])
  );
}

async function loadDbKnowledgeDocuments() {
  return db.knowledgeDocument.findMany({
    include: {
      _count: { select: { chunks: true } },
    },
    orderBy: [{ topic: "asc" }, { docId: "asc" }],
  });
}

async function loadDbKnowledgeCandidates() {
  return db.knowledgeDocument.findMany({
    where: {
      OR: [
        { docId: { contains: "__candidate__" } },
        { reviewStatus: "PENDING" },
      ],
    },
    include: {
      chunks: {
        orderBy: { chunkIndex: "asc" },
        select: {
          chunkIndex: true,
          content: true,
          contentHash: true,
        },
      },
    },
    orderBy: [{ lastCheckedAt: "desc" }, { docId: "asc" }],
  });
}

async function loadDbRuleVersions() {
  return db.complianceRuleVersion.findMany({
    include: {
      rule: true,
      tests: {
        select: { caseId: true, passed: true },
        orderBy: { caseId: "asc" },
      },
    },
    orderBy: [{ rule: { code: "asc" } }, { version: "desc" }],
  });
}

async function loadDbVisaDocumentRequirements() {
  return db.visaDocumentRequirement.findMany({
    orderBy: [{ visaType: "asc" }, { stayAction: "asc" }, { applicantContext: "asc" }, { documentType: "asc" }],
  });
}

async function safeLoadDb<T>(label: string, loader: () => Promise<T>): Promise<T | null> {
  if (isStaticOnlyMode()) return null;
  try {
    return await loader();
  } catch (error) {
    console.warn(`[legal-review:export] DB ${label} unavailable; using static source only: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function knowledgeRows(
  staticDocs: KnowledgeDocWithMetadata[],
  dbDocs: DbKnowledgeDoc[] | null
) {
  const byDocId = new Map((dbDocs || []).map((doc) => [doc.docId, doc]));
  return staticDocs.map((doc, index) => {
    const meta = getRagDocumentMetadata(doc, "ko");
    const dbDoc = byDocId.get(doc.id);
    return {
      index: index + 1,
      doc,
      meta,
      dbDoc,
      reviewStatus: dbDoc?.reviewStatus || normalizeStaticStatus(meta.review_status),
      checkedBy: dbDoc?.checkedBy || meta.checked_by,
      lastCheckedAt: formatDate(dbDoc?.lastCheckedAt) || meta.last_checked_at,
      validTo: formatDate(dbDoc?.validTo) || meta.valid_to,
      supersededBy: dbDoc?.supersededBy || meta.superseded_by,
      chunkCount: dbDoc?._count.chunks,
    };
  });
}

function ruleRows(dbVersions: DbRuleVersion[] | null) {
  const dbByCode = new Map((dbVersions || []).map((version) => [`${version.rule.code}:${version.version}`, version]));
  return VISA_RULES.map((rule, index) => {
    const seed = VISA_COMPLIANCE_RULE_SEEDS.find((candidate) => candidate.code === rule.id);
    const versionNumber = seed?.version || 1;
    const dbVersion = dbByCode.get(`${rule.id}:${versionNumber}`);
    return {
      index: index + 1,
      rule,
      seed,
      versionNumber,
      dbVersion,
      reviewStatus: dbVersion?.reviewStatus || (rule.review_status === "approved" ? "APPROVED" : "PENDING"),
      reviewedBy: dbVersion?.reviewedBy || seed?.reviewedBy || "",
      reviewedAt: formatDate(dbVersion?.reviewedAt) || formatDate(seed?.reviewedAt),
      effectiveFrom: formatDate(dbVersion?.effectiveFrom) || rule.effective_from,
      effectiveTo: formatDate(dbVersion?.effectiveTo) || formatDate(seed?.effectiveTo),
    };
  });
}

function visaDocumentRows(dbRows: DbVisaDocumentRequirement[] | null) {
  const byCode = new Map((dbRows || []).map((row) => [row.code, row]));
  return VISA_DOCUMENT_REQUIREMENT_SEEDS.map((seed, index) => {
    const dbRow = byCode.get(seed.code);
    return {
      index: index + 1,
      seed,
      dbRow,
      reviewStatus: dbRow?.reviewStatus || seed.reviewStatus,
      checkedBy: dbRow?.checkedBy || seed.checkedBy,
      lastCheckedAt: formatDate(dbRow?.lastCheckedAt) || seed.lastCheckedAt,
      validityDays: dbRow?.validityDays ?? seed.validityDays,
    };
  });
}

function knowledgeCandidateRows(
  candidates: DbKnowledgeCandidate[] | null,
  staticDocs: KnowledgeDocWithMetadata[]
) {
  const staticDocIds = new Set(staticDocs.map((doc) => doc.id));
  return (candidates || [])
    .filter((row) => row.docId.includes("__candidate__") || !staticDocIds.has(row.docId))
    .map((row, index) => {
      const supersedes = Array.isArray(row.supersedes)
        ? row.supersedes.filter((item): item is string => typeof item === "string")
        : [];
      const extraction = parseOfficialSourceExtractionMetadata(
        row.chunks.slice(0, 4).map((chunk) => chunk.content).join("\n")
      );
      return {
        index: index + 1,
        row,
        supersedes,
        extraction,
        reviewStatus: row.reviewStatus,
        checkedBy: row.checkedBy,
        lastCheckedAt: formatDate(row.lastCheckedAt),
        validTo: formatDate(row.validTo),
        chunkCount: row.chunks.length,
        contentPreview: row.chunks
          .slice(0, 8)
          .map((chunk) => `## chunk ${chunk.chunkIndex}\n${chunk.content}`)
          .join("\n\n---\n\n"),
      };
    });
}

function renderReadme(input: {
  outDir: string;
  knowledgeCount: number;
  knowledgeCandidateCount: number;
  knowledgeCandidateChunkCount: number;
  ruleCount: number;
  visaDocumentCount: number;
  dbLoaded: boolean;
}) {
  return `# KAXI 자문 행정사 검수 패킷

생성일: ${TODAY}

## 포함 파일

| 파일 | 용도 |
|---|---|
| A1-knowledge-corpus-review.md | RAG 지식 문서별 원문/출처/확인일/검수 체크란 |
| A1B-harvested-candidates-review.md | 공식 출처 harvest 후보 문서/청크 검수 체크란 |
| A2-compliance-rule-review.md | 비자 룰 엔진/DB seed 규칙별 조건·출처·검수 체크란 |
| A3-visa-document-matrix-review.md | 체류자격별 서류 매트릭스 50건 검수 체크란 |
| BCD-service-boundary-review.md | 법무 문서, UI 문구, 사실 데이터 검수 체크리스트 |
| review-decisions.template.jsonl | DB 반영용 결정 입력 템플릿 |
| review-decisions.example.jsonl | 작성 예시 |

## 현재 범위

- 지식 코퍼스: ${input.knowledgeCount}건
- 공식 출처 harvest 후보: ${input.knowledgeCandidateCount}건 / 후보 청크 ${input.knowledgeCandidateChunkCount}개
- 비자 룰: ${input.ruleCount}건
- 비자 서류 매트릭스: ${input.visaDocumentCount}건
- DB 상태 포함: ${input.dbLoaded ? "예" : "아니오(static source only)"}
- 출력 디렉터리: ${input.outDir}

## 검수 결정 입력 방법

\`review-decisions.template.jsonl\`에서 각 줄의 \`decision\`, \`checkedBy\`, \`checkedAt\`, \`notes\`를 채웁니다.

허용 decision:

- \`APPROVED\`: 검수 승인, production RAG/룰 반영 가능
- \`PENDING\`: 수정 또는 추가 검토 필요
- \`REJECTED\`: 폐기 또는 검색/룰 적용 금지
- 빈 문자열: 아직 미검수, DB 반영 스크립트가 건너뜀

DB 반영 전 사전검증:

${codeBlock("bun run legal-review:validate -- --file legal-review/latest/review-decisions.template.jsonl")}

공식 출처 후보를 500+ production RAG 청크로 승인하는 파일은 strict 검증을 먼저 통과해야 합니다:

${codeBlock("bun run legal-review:validate -- --file legal-review/latest/harvested-candidate-decisions.approved.jsonl --require-decisions --require-candidate-coverage --require-approved-candidate-chunks 500")}

DB 반영 dry-run:

${codeBlock("bun run legal-review:apply -- --file legal-review/latest/review-decisions.template.jsonl")}

DB 실제 반영:

${codeBlock("LEGAL_REVIEW_CHECKED_BY=\"홍길동 행정사 00-0000\" bun run legal-review:apply -- --file legal-review/latest/review-decisions.template.jsonl --apply")}

공식 출처 후보를 500+ production RAG corpus로 전환할 때는 apply 단계에서도 strict gate를 켭니다:

${codeBlock("bun run legal-review:apply -- --file legal-review/latest/harvested-candidate-decisions.approved.jsonl --apply --require-decisions --require-candidate-coverage --require-approved-candidate-chunks 500")}

권장 원샷 승격 명령:

${codeBlock("bun run knowledge:promote:candidates -- --file legal-review/latest/harvested-candidate-decisions.approved.jsonl --min-approved-candidate-chunks 500 --min-approved-chunks 500 --min-approved-embedded-chunks 500")}

주의: \`notes\`는 \`AuditEvent.metadata\`에 남기고, 현재 \`KnowledgeDocument\`와 \`ComplianceRuleVersion\` 본문 테이블에는 별도 note 컬럼이 없습니다.

공식 출처 harvest 후보는 \`APPROVED\` 후에만 production RAG 대상이 됩니다. 승인 뒤 \`bun run knowledge:pgvector\`를 실행해 승인된 청크를 임베딩하세요.
`;
}

function renderKnowledgeMarkdown(rows: ReturnType<typeof knowledgeRows>) {
  const summaryRows = rows
    .map((row) =>
      `| A1-${String(row.index).padStart(3, "0")} | ${mdEscape(row.doc.id)} | ${mdEscape(pickLangText(row.doc.title, "ko"))} | ${mdEscape(row.doc.category)} | ${mdEscape(row.reviewStatus)} | ${mdEscape(row.lastCheckedAt)} | ${mdEscape(row.meta.source_label)} |`
    )
    .join("\n");

  const details = rows
    .map((row) => {
      const translations = REVIEW_LANGS.map((lang) => {
        const title = pickLangText(row.doc.title, lang);
        const content = pickLangText(row.doc.content, lang);
        return `### ${lang.toUpperCase()} — ${title}\n\n${codeBlock(content)}`;
      }).join("\n\n");

      return `## A1-${String(row.index).padStart(3, "0")} ${row.doc.id}

- 제목: ${pickLangText(row.doc.title, "ko")}
- 카테고리: ${row.doc.category}
- 출처 라벨: ${row.meta.source_label}
- 출처 URL: ${row.meta.source_url}
- 출처 유형: ${row.meta.source_type}
- 관할: ${row.meta.jurisdiction}
- 유효기간: ${row.meta.valid_from} ~ ${row.validTo || "없음"}
- 최종 확인일: ${row.lastCheckedAt}
- 확인자: ${row.checkedBy}
- 현재 검수상태: ${row.reviewStatus}
- supersededBy: ${row.supersededBy || "없음"}
- DB chunk 수: ${row.chunkCount ?? "DB 미확인"}

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

${codeBlock("")}

${translations}
`;
    })
    .join("\n---\n\n");

  return `# A1. RAG 지식 코퍼스 검수

검수 관점:

- 법령 인용의 정확성: 조·항 번호, 기간, 수수료 숫자
- 최신성: lastCheckedAt 이후 개정 여부
- 요약 과정의 왜곡 여부
- validTo/supersededBy 설정 적정성
- 사용자 답변에 보여도 되는 공식 근거인지

| 항목 | doc_id | 제목 | topic | 현재 상태 | 확인일 | 출처 |
|---|---|---|---|---|---|---|
${summaryRows}

---

${details}
`;
}

function renderRulesMarkdown(rows: ReturnType<typeof ruleRows>) {
  const refs = sourceRefMap();
  const summaryRows = rows
    .map((row) =>
      `| A2-${String(row.index).padStart(3, "0")} | ${mdEscape(row.rule.id)} | v${row.versionNumber} | ${mdEscape(row.rule.title)} | ${mdEscape(row.reviewStatus)} | ${mdEscape(row.effectiveFrom)} | ${mdEscape(row.rule.required_inputs.join(", "))} |`
    )
    .join("\n");

  const details = rows
    .map((row) => {
      const sourceLines = row.rule.source_refs
        .map((sourceId) => {
          const source = refs.get(sourceId);
          return source
            ? `- ${source.id}: ${source.title} (${source.checked_at}) ${source.url}`
            : `- ${sourceId}: source ref metadata missing`;
        })
        .join("\n");

      return `## A2-${String(row.index).padStart(3, "0")} ${row.rule.id} v${row.versionNumber}

- 제목: ${row.rule.title}
- 현재 검수상태: ${row.reviewStatus}
- reviewedBy: ${row.reviewedBy || "미지정"}
- reviewedAt: ${row.reviewedAt || "미지정"}
- effectiveFrom: ${row.effectiveFrom}
- effectiveTo: ${row.effectiveTo || "없음"}
- requiredInputs: ${row.rule.required_inputs.join(", ") || "없음"}
- fallbackPolicy: ${row.rule.fallback_policy}
- DB tests: ${row.dbVersion?.tests.length ?? "DB 미확인"}

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

${codeBlock("")}

### Source refs

${sourceLines}

### Condition AST

${codeBlock(formatJson(row.seed?.conditionAst || { staticRule: row.rule.id }), "json")}

### Output AST

${codeBlock(formatJson(row.seed?.outputAst || {}), "json")}
`;
    })
    .join("\n---\n\n");

  return `# A2. 비자 룰 엔진 검수

검수 관점:

- 룰 조건이 실제 심사 기준과 일치하는지
- source_refs가 법적 근거로 충분한지
- HIGH/MEDIUM/LOW 위험 판정이 과소·과대하지 않은지
- fallbackPolicy가 사용자에게 과도한 확정 답변을 만들지 않는지

| 항목 | rule code | version | 제목 | 현재 상태 | 시행일 | required inputs |
|---|---|---:|---|---|---|---|
${summaryRows}

---

${details}
`;
}

function renderKnowledgeCandidatesMarkdown(rows: ReturnType<typeof knowledgeCandidateRows>) {
  const summaryRows = rows
    .map((item) =>
      `| A1B-${String(item.index).padStart(3, "0")} | ${mdEscape(item.row.docId)} | ${mdEscape(item.row.title)} | ${mdEscape(item.row.topic)} | ${mdEscape(item.reviewStatus)} | ${item.chunkCount} | ${mdEscape(item.extraction.extractionMethod)} | ${mdEscape(item.extraction.extractionError || "")} | ${mdEscape(item.supersedes.join(", "))} | ${mdEscape(item.row.sourceUrl)} |`
    )
    .join("\n");

  const details = rows
    .map((item) => `## A1B-${String(item.index).padStart(3, "0")} ${item.row.docId}

- 제목: ${item.row.title}
- sourceUrl: ${item.row.sourceUrl}
- sourceType: ${item.row.sourceType}
- topic: ${item.row.topic}
- language: ${item.row.language}
- jurisdiction: ${item.row.jurisdiction}
- validFrom: ${formatDate(item.row.validFrom)}
- validTo: ${item.validTo || "없음"}
- lastCheckedAt: ${item.lastCheckedAt}
- checkedBy: ${item.checkedBy}
- reviewStatus: ${item.reviewStatus}
- supersedes: ${item.supersedes.join(", ") || "없음"}
- supersededBy: ${item.row.supersededBy || "없음"}
- chunkCount: ${item.chunkCount}
- extractionMethod: ${item.extraction.extractionMethod}
- contentType: ${item.extraction.contentType || "없음"}
- byteLength: ${item.extraction.byteLength ?? "없음"}
- extractedChars: ${item.extraction.extractedChars ?? "없음"}
- extractionError: ${item.extraction.extractionError || "없음"}

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

${codeBlock("")}

### Candidate Content Preview

${codeBlock(item.contentPreview || "(no chunks)")}
`)
    .join("\n---\n\n");

  return `# A1B. 공식 출처 Harvest 후보 검수

검수 관점:

- 공식 출처 본문이 정상 추출되었는지
- UI 메뉴/푸터/반복 잡음이 과도하지 않은지
- production RAG에 넣어도 되는 최신 공식 근거인지
- supersedes 대상 문서가 올바른지
- 승인 시 기존 답변/룰 영향이 있는지

| 항목 | doc_id | 제목 | topic | 현재 상태 | chunks | 추출 방식 | 추출 오류 | supersedes | 출처 |
|---|---|---|---|---|---:|---|---|---|---|
${summaryRows || "| - | - | - | - | - | 0 | - | - | - | - |"}

---

${details || "현재 DB-only 공식 출처 후보가 없습니다."}
`;
}

function renderVisaDocumentMatrixMarkdown(rows: ReturnType<typeof visaDocumentRows>) {
  const summaryRows = rows
    .map((row) =>
      `| A3-${String(row.index).padStart(3, "0")} | ${mdEscape(row.seed.code)} | ${mdEscape(row.seed.visaType)} | ${mdEscape(row.seed.stayAction)} | ${mdEscape(row.seed.applicantContext)} | ${mdEscape(row.seed.documentType)} | ${mdEscape(row.reviewStatus)} | ${mdEscape(row.validityDays ?? "")} |`
    )
    .join("\n");

  const details = rows
    .map((row) => `## A3-${String(row.index).padStart(3, "0")} ${row.seed.code}

- 체류자격: ${row.seed.visaType}
- 신청유형: ${row.seed.stayAction}
- 신청자 맥락: ${row.seed.applicantContext}
- 서류 유형: ${row.seed.documentType}
- 한글명: ${row.seed.labelKo}
- 영문명: ${row.seed.labelEn}
- 필수 여부: ${row.seed.required ? "required" : "optional"}
- 유효기간: ${row.validityDays ?? "없음"}
- 발행기관: ${row.seed.issuer}
- 현재 검수상태: ${row.reviewStatus}
- 확인자: ${row.checkedBy}
- 확인일: ${row.lastCheckedAt}
- 출처: ${row.seed.sourceUrl}
- sourceRefs: ${row.seed.sourceRefs.join(", ")}

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

${codeBlock("")}

### 필수 기재 항목

${codeBlock(formatJson(row.seed.requiredFields), "json")}

### Layer 1 검증 rule keys

${codeBlock(formatJson(row.seed.validationRules), "json")}

${row.seed.notes ? `### Seed note\n\n${row.seed.notes}\n` : ""}
`)
    .join("\n---\n\n");

  return `# A3. 비자 서류 매트릭스 검수

검수 관점:

- 체류자격/신청유형별 서류 포함 여부가 실제 업무 기준과 맞는지
- 유효기간, 발행기관, 필수 기재 항목이 과소·과대하지 않은지
- \`validationRules\`가 OCR/Layer 1 검증에 충분한지
- 국적·대사관·학교별 차이가 있는 항목은 applicantContext 또는 notes로 분리해야 하는지

| 항목 | code | visa | action | context | documentType | 현재 상태 | validityDays |
|---|---|---|---|---|---|---|---:|
${summaryRows}

---

${details}
`;
}

function renderServiceBoundaryMarkdown() {
  const rows = SERVICE_REVIEW_ITEMS.map((item) =>
    `| ${item.id} | ${mdEscape(item.group)} | ${mdEscape(item.title)} | ${mdEscape(item.path)} | ${mdEscape(item.focus)} |`
  ).join("\n");

  const details = SERVICE_REVIEW_ITEMS.map((item) => `## ${item.id}. ${item.title}

- 그룹: ${item.group}
- 위치: ${item.path}
- 검수 관점: ${item.focus}

검수 체크:

- [ ] APPROVED
- [ ] PENDING / 수정 요청
- [ ] REJECTED / 폐기

검수자 메모:

${codeBlock("")}
`).join("\n---\n\n");

  return `# B/C/D. 법무 문서·서비스 문구·사실 데이터 검수

| 항목 | 그룹 | 대상 | 위치 | 검수 관점 |
|---|---|---|---|---|
${rows}

---

${details}
`;
}

function renderDecisionTemplates(
  knowledge: ReturnType<typeof knowledgeRows>,
  knowledgeCandidates: ReturnType<typeof knowledgeCandidateRows>,
  rules: ReturnType<typeof ruleRows>,
  visaDocs: ReturnType<typeof visaDocumentRows>
) {
  const lines: string[] = [];
  for (const row of knowledge) {
    lines.push(JSON.stringify({
      targetType: "knowledge_document",
      targetId: row.doc.id,
      decision: "",
      checkedBy: "",
      checkedAt: TODAY,
      notes: "",
      validTo: row.validTo || null,
      supersededBy: row.supersededBy || null,
    }));
  }
  for (const item of knowledgeCandidates) {
    lines.push(JSON.stringify({
      targetType: "knowledge_document",
      targetId: item.row.docId,
      decision: "",
      checkedBy: "",
      checkedAt: TODAY,
      notes: "",
      validTo: item.validTo || null,
      supersededBy: item.row.supersededBy || null,
    }));
  }
  for (const row of rules) {
    lines.push(JSON.stringify({
      targetType: "compliance_rule_version",
      targetId: row.rule.id,
      version: row.versionNumber,
      decision: "",
      checkedBy: "",
      checkedAt: TODAY,
      notes: "",
      effectiveTo: row.effectiveTo || null,
    }));
  }
  for (const row of visaDocs) {
    lines.push(JSON.stringify({
      targetType: "visa_document_requirement",
      targetId: row.seed.code,
      decision: "",
      checkedBy: "",
      checkedAt: TODAY,
      notes: "",
      validityDays: row.validityDays,
    }));
  }
  return `${lines.join("\n")}\n`;
}

function renderDecisionExample() {
  return [
    {
      targetType: "knowledge_document",
      targetId: "visa-documents",
      decision: "APPROVED",
      checkedBy: "홍길동 행정사 00-0000",
      checkedAt: TODAY,
      notes: "재정증빙 문구는 접수 전 원문 확인 안내를 유지하는 조건으로 승인.",
      validTo: null,
      supersededBy: null,
    },
    {
      targetType: "compliance_rule_version",
      targetId: "financial-proof-threshold",
      version: 1,
      decision: "PENDING",
      checkedBy: "홍길동 행정사 00-0000",
      checkedAt: TODAY,
      notes: "잔고 기준액은 대사관/국적별 차이를 더 명시해야 함.",
      effectiveTo: null,
    },
    {
      targetType: "visa_document_requirement",
      targetId: "d2_issuance_financial_proof",
      decision: "APPROVED",
      checkedBy: "홍길동 행정사 00-0000",
      checkedAt: TODAY,
      notes: "발급일/잔고/예금주 필드는 유지. 대사관별 잔고 기준은 별도 context로 분리 필요.",
      validityDays: 90,
    },
  ].map((row) => JSON.stringify(row)).join("\n") + "\n";
}

async function main() {
  const targetDir = outDir();
  const [dbKnowledgeDocs, dbKnowledgeCandidates, dbRuleVersions, dbVisaDocumentRequirements] = await Promise.all([
    safeLoadDb("knowledge documents", loadDbKnowledgeDocuments),
    safeLoadDb("knowledge candidates", loadDbKnowledgeCandidates),
    safeLoadDb("rule versions", loadDbRuleVersions),
    safeLoadDb("visa document matrix", loadDbVisaDocumentRequirements),
  ]);
  const staticDocs = getKnowledgeDocsWithMetadata({ includeExpired: true });
  const knowledge = knowledgeRows(staticDocs, dbKnowledgeDocs);
  const knowledgeCandidates = knowledgeCandidateRows(dbKnowledgeCandidates, staticDocs);
  const rules = ruleRows(dbRuleVersions);
  const visaDocs = visaDocumentRows(dbVisaDocumentRequirements);

  await mkdir(targetDir, { recursive: true });
  await Promise.all([
    writeFile(join(targetDir, "README.md"), renderReadme({
      outDir: targetDir,
      knowledgeCount: knowledge.length,
      knowledgeCandidateCount: knowledgeCandidates.length,
      knowledgeCandidateChunkCount: knowledgeCandidates.reduce((sum, item) => sum + item.chunkCount, 0),
      ruleCount: rules.length,
      visaDocumentCount: visaDocs.length,
      dbLoaded: Boolean(dbKnowledgeDocs && dbKnowledgeCandidates && dbRuleVersions && dbVisaDocumentRequirements),
    })),
    writeFile(join(targetDir, "A1-knowledge-corpus-review.md"), renderKnowledgeMarkdown(knowledge)),
    writeFile(join(targetDir, "A1B-harvested-candidates-review.md"), renderKnowledgeCandidatesMarkdown(knowledgeCandidates)),
    writeFile(join(targetDir, "A2-compliance-rule-review.md"), renderRulesMarkdown(rules)),
    writeFile(join(targetDir, "A3-visa-document-matrix-review.md"), renderVisaDocumentMatrixMarkdown(visaDocs)),
    writeFile(join(targetDir, "BCD-service-boundary-review.md"), renderServiceBoundaryMarkdown()),
    writeFile(join(targetDir, "review-decisions.template.jsonl"), renderDecisionTemplates(knowledge, knowledgeCandidates, rules, visaDocs)),
    writeFile(join(targetDir, "review-decisions.example.jsonl"), renderDecisionExample()),
  ]);

  console.log(`[legal-review:export] wrote ${knowledge.length} knowledge docs, ${knowledgeCandidates.length} candidates, ${rules.length} rules, and ${visaDocs.length} visa document rows to ${targetDir}`);
  await db.$disconnect();
}

main().catch(async (error) => {
  console.error(`[legal-review:export] ${error instanceof Error ? error.message : String(error)}`);
  await db.$disconnect().catch(() => undefined);
  process.exit(1);
});
