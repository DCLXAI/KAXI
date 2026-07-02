import {
  getKnowledgeDocsWithMetadata,
  type KnowledgeDoc,
  type KnowledgeDocWithMetadata,
} from "../data/knowledge";

const BASE_IMMIGRATION_LEGAL_DOC_IDS = [
  "immigration-law-interpretation-hierarchy",
  "immigration-act-stay-status-scope",
  "immigration-decree-current-text",
] as const;

const IMMIGRATION_RECENT_PROMULGATIONS_DOC_ID = "immigration-law-recent-promulgations";
const IMMIGRATION_STATUS_DOC_ID = "immigration-decree-long-term-status-table";
const IMMIGRATION_SHORT_TERM_STATUS_DOC_ID = "immigration-decree-short-term-status-table";
const IMMIGRATION_PERMANENT_RESIDENCE_DOC_ID = "immigration-decree-permanent-residence-table";
const IMMIGRATION_PERMISSION_DOC_ID = "immigration-act-permission-matrix";
const IMMIGRATION_EMPLOYMENT_RESTRICTION_DOC_ID = "immigration-act-employment-restriction";
const IMMIGRATION_OUTSIDE_STATUS_ACTIVITY_DOC_ID = "immigration-act-outside-status-activity";
const IMMIGRATION_WORKPLACE_CHANGE_DOC_ID = "immigration-act-workplace-change-addition";
const IMMIGRATION_ACTIVITY_SCOPE_RESTRICTION_DOC_ID = "immigration-act-activity-scope-restriction";
const IMMIGRATION_FALSE_APPLICATION_DOCS_ID = "immigration-act-false-application-documents";
const IMMIGRATION_STATUS_GRANT_DOC_ID = "immigration-act-status-grant";
const IMMIGRATION_STATUS_CHANGE_DOC_ID = "immigration-act-status-change";
const IMMIGRATION_STAY_EXTENSION_DOC_ID = "immigration-act-stay-extension";
const IMMIGRATION_REENTRY_DOC_ID = "immigration-act-reentry-permit";
const IMMIGRATION_ALIEN_REGISTRATION_DOC_ID = "immigration-act-alien-registration";
const IMMIGRATION_REGISTRATION_CHANGE_DOC_ID = "immigration-act-registration-change-report";
const IMMIGRATION_ADDRESS_CHANGE_DOC_ID = "immigration-act-address-change-report";
const IMMIGRATION_REVIEW_CRITERIA_DOC_ID = "immigration-rule-stay-permission-review-criteria";
const IMMIGRATION_ATTACHMENTS_DOC_ID = "immigration-rule-documents-attachments";
const IMMIGRATION_FEES_DOC_ID = "immigration-rule-fees";
const IMMIGRATION_VIOLATION_DOC_ID = "immigration-law-violation-risk";

function stripSourceMeta(doc: KnowledgeDocWithMetadata): KnowledgeDoc {
  const { sourceMeta: _sourceMeta, ...knowledgeDoc } = doc;
  return knowledgeDoc;
}

export function isImmigrationStayQuestion(query: string, mode?: string): boolean {
  const text = `${mode || ""} ${query}`.toLowerCase();
  return /비자|체류|출입국|외국인등록|유학|어학|연수|구직|특정활동|거주|영주|취업|고용|근무처|아르바이트|시간제|불법취업|d-?2|d-?4|d-?10|e-?7|f-?2|f-?5|visa|immigration|stay status|sojourn|employment|workplace|part-?time/.test(text);
}

export function immigrationLegalBasisDocIdsForQuery(query: string, mode?: string): string[] {
  if (!isImmigrationStayQuestion(query, mode)) return [];

  const text = `${mode || ""} ${query}`.toLowerCase();
  const ids = new Set<string>(BASE_IMMIGRATION_LEGAL_DOC_IDS);
  ids.add(IMMIGRATION_STATUS_DOC_ID);

  if (/단기|단기방문|단기취업|무사증|사증면제|관광|통과|입국|b-?1|b-?2|c-?1|c-?3|c-?4|short.?term|visa.?free|waiver|tourist|transit/.test(text)) {
    ids.add(IMMIGRATION_SHORT_TERM_STATUS_DOC_ID);
  }
  if (/영주|영주권|f-?5|permanent|residence/.test(text)) {
    ids.add(IMMIGRATION_PERMANENT_RESIDENCE_DOC_ID);
  }
  if (/최신|최근공포|시행일|시행예정|개정|변경된|바뀐|현행|current|recent|updated|amended|effective date/.test(text)) {
    ids.add(IMMIGRATION_RECENT_PROMULGATIONS_DOC_ID);
  }
  if (/변경|연장|자격외|근무처|외국인등록|등록|신고|취업|일|change|extend|extension|work|registration/.test(text)) {
    ids.add(IMMIGRATION_PERMISSION_DOC_ID);
    ids.add(IMMIGRATION_REVIEW_CRITERIA_DOC_ID);
  }
  if (/취업|고용|일할|일해|근무|불법취업|employment|work authorization|unauthorized work|work status/.test(text)) {
    ids.add(IMMIGRATION_EMPLOYMENT_RESTRICTION_DOC_ID);
  }
  if (/체류자격\s*외|체류자격외|자격외|아르바이트|시간제|part-?time|outside[-\s]?status/.test(text)) {
    ids.add(IMMIGRATION_OUTSIDE_STATUS_ACTIVITY_DOC_ID);
  }
  if (/근무처|사업장\s*변경|직장\s*변경|고용주\s*변경|workplace|employer change|change.*workplace/.test(text)) {
    ids.add(IMMIGRATION_WORKPLACE_CHANGE_DOC_ID);
  }
  if (/활동범위|거소|준수사항|공공의\s*안녕|activity scope|residence restriction|compliance condition/.test(text)) {
    ids.add(IMMIGRATION_ACTIVITY_SCOPE_RESTRICTION_DOC_ID);
  }
  if (/허위|위조|변조|거짓|브로커|알선|fake|forged|false application|broker/.test(text)) {
    ids.add(IMMIGRATION_FALSE_APPLICATION_DOCS_ID);
  }
  if (/체류자격\s*부여|체류자격부여|출생|태어난|국적\s*(상실|이탈)|status grant|born in korea|loss of nationality/.test(text)) {
    ids.add(IMMIGRATION_STATUS_GRANT_DOC_ID);
  }
  if (/체류자격\s*변경|체류자격변경|비자\s*변경|d-?4\s*(에서|to)\s*d-?2|change of status|status change/.test(text)) {
    ids.add(IMMIGRATION_STATUS_CHANGE_DOC_ID);
  }
  if (/체류기간\s*연장|체류기간연장|비자\s*연장|연장허가|만료|만료일|extend|extension|stay extension|expiry/.test(text)) {
    ids.add(IMMIGRATION_STAY_EXTENSION_DOC_ID);
  }
  if (/재입국|re-?entry|reentry/.test(text)) {
    ids.add(IMMIGRATION_REENTRY_DOC_ID);
  }
  if (/외국인등록|등록증|arc|alien registration/.test(text)) {
    ids.add(IMMIGRATION_ALIEN_REGISTRATION_DOC_ID);
  }
  if (/여권|등록사항|성명|성별|생년월일|국적|passport|nationality|name change/.test(text)) {
    ids.add(IMMIGRATION_REGISTRATION_CHANGE_DOC_ID);
  }
  if (/체류지|주소|전입|이사|기숙사|거주지|address|place of stay|move|moving|dorm/.test(text)) {
    ids.add(IMMIGRATION_ADDRESS_CHANGE_DOC_ID);
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
