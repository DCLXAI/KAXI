import {
  getKnowledgeDocsWithMetadata,
  type KnowledgeDoc,
  type KnowledgeDocWithMetadata,
} from "../data/knowledge";

const BASE_IMMIGRATION_LEGAL_DOC_IDS = [
  "immigration-law-recent-promulgations",
  "immigration-law-interpretation-hierarchy",
  "immigration-act-stay-status-scope",
  "immigration-decree-current-text",
] as const;

const IMMIGRATION_STATUS_DOC_ID = "immigration-decree-long-term-status-table";
const IMMIGRATION_PERMISSION_DOC_ID = "immigration-act-permission-matrix";
const IMMIGRATION_ATTACHMENTS_DOC_ID = "immigration-rule-documents-attachments";
const IMMIGRATION_FEES_DOC_ID = "immigration-rule-fees";
const IMMIGRATION_VIOLATION_DOC_ID = "immigration-law-violation-risk";

function stripSourceMeta(doc: KnowledgeDocWithMetadata): KnowledgeDoc {
  const { sourceMeta: _sourceMeta, ...knowledgeDoc } = doc;
  return knowledgeDoc;
}

export function isImmigrationStayQuestion(query: string, mode?: string): boolean {
  const text = `${mode || ""} ${query}`.toLowerCase();
  return /비자|체류|출입국|외국인등록|유학|어학|연수|구직|특정활동|거주|영주|d-?2|d-?4|d-?10|e-?7|f-?2|f-?5|visa|immigration|stay status|sojourn/.test(text);
}

export function immigrationLegalBasisDocIdsForQuery(query: string, mode?: string): string[] {
  if (!isImmigrationStayQuestion(query, mode)) return [];

  const text = `${mode || ""} ${query}`.toLowerCase();
  const ids = new Set<string>(BASE_IMMIGRATION_LEGAL_DOC_IDS);
  ids.add(IMMIGRATION_STATUS_DOC_ID);

  if (/변경|연장|자격외|근무처|외국인등록|등록|신고|취업|일|change|extend|extension|work|registration/.test(text)) {
    ids.add(IMMIGRATION_PERMISSION_DOC_ID);
  }
  if (/서류|제출|첨부|아포스티유|영사확인|공증|번역|체크리스트|신청|document|apostille|notar/.test(text)) {
    ids.add(IMMIGRATION_ATTACHMENTS_DOC_ID);
  }
  if (/수수료|비용|처리기간|납부|fee|cost|payment/.test(text)) {
    ids.add(IMMIGRATION_FEES_DOC_ID);
  }
  if (/불법|허위|위조|무허가|강제퇴거|입국금지|overstay|fake|illegal|deport/.test(text)) {
    ids.add(IMMIGRATION_PERMISSION_DOC_ID);
    ids.add(IMMIGRATION_VIOLATION_DOC_ID);
  }

  return Array.from(ids);
}

export function withImmigrationLegalBasisDocs(
  query: string,
  docs: KnowledgeDoc[],
  options: { mode?: string; maxDocs?: number } = {}
): KnowledgeDoc[] {
  const legalDocIds = immigrationLegalBasisDocIdsForQuery(query, options.mode);
  if (legalDocIds.length === 0) return docs.slice(0, options.maxDocs || docs.length);

  const maxDocs = options.maxDocs || Math.max(docs.length, legalDocIds.length);
  const activeDocs = new Map(
    getKnowledgeDocsWithMetadata().map((doc) => [doc.id, stripSourceMeta(doc)])
  );
  const retrievedDocs = new Map(docs.map((doc) => [doc.id, doc]));

  const legalDocs = legalDocIds
    .map((id) => retrievedDocs.get(id) || activeDocs.get(id))
    .filter((doc): doc is KnowledgeDoc => Boolean(doc));
  const rest = docs.filter((doc) => !legalDocIds.includes(doc.id));

  return [...legalDocs, ...rest].slice(0, maxDocs);
}
