// KAXI RAG 지식 베이스
// 공식 출처: 한국유학종합시스템(Study in Korea)·교육부·법무부·법제처
// 각 문서는 {ko, vi, mn, en} 다국어 텍스트를 가짐
// 간단한 키워드 기반 retrieval + LLM 답변 생성

import type { Lang } from "../i18n/translations";

export interface KnowledgeDoc {
  id: string;
  category: "visa" | "cost" | "documents" | "school" | "legal" | "process" | "warning";
  title: { ko: string; vi: string; mn: string; en: string };
  // 검색용 키워드 (소문자)
  keywords: string[];
  content: { ko: string; vi: string; mn: string; en: string };
  source: string;
  ragMeta?: RagDocumentMetadata;
}

export interface SourceMetadata {
  label: string;
  url: string;
  verifiedAt: string;
  reviewAfter: string;
  owner: "official" | "internal";
  sourceType?: SourceType;
  jurisdiction?: "KR" | "KAXI";
  validFrom?: string;
  validTo?: string | null;
  checkedBy?: string;
  reviewStatus?: ReviewStatus;
  supersedes?: string[];
  supersededBy?: string | null;
}

export type SourceType = "official_government" | "official_law" | "internal_analysis" | "internal_policy";
export type ReviewStatus = "draft" | "approved" | "needs_review" | "deprecated";

export interface ResolvedSourceMetadata extends SourceMetadata {
  sourceType: SourceType;
  jurisdiction: "KR" | "KAXI";
  validFrom: string;
  validTo: string | null;
  checkedBy: string;
  reviewStatus: ReviewStatus;
  supersedes: string[];
  supersededBy: string | null;
}

export interface KnowledgeDocWithMetadata extends KnowledgeDoc {
  sourceMeta: ResolvedSourceMetadata;
}

export interface RagDocumentMetadata {
  doc_id: string;
  title: string;
  source_url: string;
  source_type: SourceType;
  language: Lang;
  jurisdiction: "KR" | "KAXI";
  topic: KnowledgeDoc["category"];
  valid_from: string;
  valid_to: string | null;
  last_checked_at: string;
  checked_by: string;
  review_status: ReviewStatus;
  supersedes: string[];
  superseded_by: string | null;
  review_after: string;
  source_label: string;
  owner: "official" | "internal";
}

const DEFAULT_VERIFIED_AT = "2026-07-01";
const DEFAULT_REVIEW_AFTER = "2026-10-01";
const DEFAULT_VALID_FROM = "2026-01-01";
const DEFAULT_CHECKED_BY = "partner_agent_001";
const HIKOREA_VERIFIED_AT = "2026-07-02";
const HIKOREA_REVIEW_AFTER = "2026-08-31";
const IMMIGRATION_LAW_VERIFIED_AT = "2026-07-02";
const IMMIGRATION_LAW_REVIEW_AFTER = "2026-08-31";

export const SOURCE_METADATA: Record<string, SourceMetadata> = {
  "Study in Korea · 한국유학종합시스템": {
    label: "Study in Korea · 한국유학종합시스템",
    url: "https://www.studyinkorea.go.kr",
    verifiedAt: DEFAULT_VERIFIED_AT,
    reviewAfter: DEFAULT_REVIEW_AFTER,
    owner: "official",
  },
  "Study in Korea · 교육부": {
    label: "Study in Korea · 교육부",
    url: "https://www.studyinkorea.go.kr",
    verifiedAt: DEFAULT_VERIFIED_AT,
    reviewAfter: DEFAULT_REVIEW_AFTER,
    owner: "official",
  },
  "Study in Korea (studyinkorea.go.kr)": {
    label: "Study in Korea",
    url: "https://www.studyinkorea.go.kr",
    verifiedAt: DEFAULT_VERIFIED_AT,
    reviewAfter: DEFAULT_REVIEW_AFTER,
    owner: "official",
  },
  "법무부 출입국외국인정책본부": {
    label: "법무부 출입국외국인정책본부",
    url: "https://www.immigration.go.kr",
    verifiedAt: DEFAULT_VERIFIED_AT,
    reviewAfter: DEFAULT_REVIEW_AFTER,
    owner: "official",
  },
  "교육부 보도자료 (2026.02)": {
    label: "교육부 보도자료",
    url: "https://www.moe.go.kr",
    verifiedAt: DEFAULT_VERIFIED_AT,
    reviewAfter: DEFAULT_REVIEW_AFTER,
    owner: "official",
  },
  "NIIED 한국교육과정평가원": {
    label: "국립국제교육원/TOPIK",
    url: "https://www.topik.go.kr",
    verifiedAt: DEFAULT_VERIFIED_AT,
    reviewAfter: DEFAULT_REVIEW_AFTER,
    owner: "official",
  },
  "법무부 비자 발급 안내": {
    label: "법무부 비자 발급 안내",
    url: "https://www.visa.go.kr",
    verifiedAt: DEFAULT_VERIFIED_AT,
    reviewAfter: DEFAULT_REVIEW_AFTER,
    owner: "official",
  },
  "HiKorea · 체류자격별 통합 안내 매뉴얼": {
    label: "하이코리아 체류자격별 통합 안내 매뉴얼",
    url: "https://www.hikorea.go.kr/board/BoardNtcDetailR.pt?BBS_GB_CD=BS10&BBS_SEQ=1&NTCCTT_SEQ=1062&page=1",
    verifiedAt: HIKOREA_VERIFIED_AT,
    reviewAfter: HIKOREA_REVIEW_AFTER,
    owner: "official",
    sourceType: "official_government",
    jurisdiction: "KR",
    validFrom: "2026-06-23",
  },
  "HiKorea · 출입국/체류안내": {
    label: "하이코리아 출입국/체류안내",
    url: "https://www.hikorea.go.kr/info/InfoMain.pt",
    verifiedAt: HIKOREA_VERIFIED_AT,
    reviewAfter: HIKOREA_REVIEW_AFTER,
    owner: "official",
    sourceType: "official_government",
    jurisdiction: "KR",
    validFrom: "2026-07-02",
  },
  "HiKorea · 체류기간연장 안내": {
    label: "하이코리아 체류기간연장 안내",
    url: "https://www.hikorea.go.kr/info/InfoDatail.pt?CAT_SEQ=181&PARENT_ID=140",
    verifiedAt: HIKOREA_VERIFIED_AT,
    reviewAfter: HIKOREA_REVIEW_AFTER,
    owner: "official",
    sourceType: "official_government",
    jurisdiction: "KR",
    validFrom: "2026-07-02",
  },
  "HiKorea · 체류자격변경 안내": {
    label: "하이코리아 체류자격변경 안내",
    url: "https://www.hikorea.go.kr/info/InfoDatail.pt?CAT_SEQ=184&PARENT_ID=141",
    verifiedAt: HIKOREA_VERIFIED_AT,
    reviewAfter: HIKOREA_REVIEW_AFTER,
    owner: "official",
    sourceType: "official_government",
    jurisdiction: "KR",
    validFrom: "2026-07-02",
  },
  "HiKorea · 체류자격외활동 안내": {
    label: "하이코리아 체류자격외활동 안내",
    url: "https://www.hikorea.go.kr/info/InfoDatail.pt?CAT_SEQ=187&PARENT_ID=142",
    verifiedAt: HIKOREA_VERIFIED_AT,
    reviewAfter: HIKOREA_REVIEW_AFTER,
    owner: "official",
    sourceType: "official_government",
    jurisdiction: "KR",
    validFrom: "2026-07-02",
  },
  "HiKorea · 민원서식": {
    label: "하이코리아 민원서식",
    url: "https://www.hikorea.go.kr/board/BoardApplicationListR.pt",
    verifiedAt: HIKOREA_VERIFIED_AT,
    reviewAfter: HIKOREA_REVIEW_AFTER,
    owner: "official",
    sourceType: "official_government",
    jurisdiction: "KR",
    validFrom: "2026-07-02",
  },
  "HiKorea · 전자민원": {
    label: "하이코리아 전자민원",
    url: "https://www.hikorea.go.kr/cvlappl/CvlapplStep1.pt",
    verifiedAt: HIKOREA_VERIFIED_AT,
    reviewAfter: HIKOREA_REVIEW_AFTER,
    owner: "official",
    sourceType: "official_government",
    jurisdiction: "KR",
    validFrom: "2026-07-02",
  },
  "HiKorea · 공지사항": {
    label: "하이코리아 공지사항",
    url: "https://www.hikorea.go.kr/board/BoardNtcListR.pt",
    verifiedAt: HIKOREA_VERIFIED_AT,
    reviewAfter: HIKOREA_REVIEW_AFTER,
    owner: "official",
    sourceType: "official_government",
    jurisdiction: "KR",
    validFrom: "2026-07-02",
  },
  "HiKorea · 육성형 전문기술인력 사증·체류관리 매뉴얼": {
    label: "하이코리아 육성형 전문기술인력 사증·체류관리 매뉴얼",
    url: "https://www.hikorea.go.kr/board/BoardNtcDetailR.pt?BBS_GB_CD=BS10&BBS_SEQ=1&NTCCTT_SEQ=1968",
    verifiedAt: HIKOREA_VERIFIED_AT,
    reviewAfter: HIKOREA_REVIEW_AFTER,
    owner: "official",
    sourceType: "official_government",
    jurisdiction: "KR",
    validFrom: "2026-06-29",
  },
  "출입국관리법 제89조·형법 제231조": {
    label: "국가법령정보센터",
    url: "https://www.law.go.kr",
    verifiedAt: DEFAULT_VERIFIED_AT,
    reviewAfter: DEFAULT_REVIEW_AFTER,
    owner: "official",
  },
  "출입국관리법 제10조·제17조": {
    label: "국가법령정보센터 · 출입국관리법",
    url: "https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=245973",
    verifiedAt: IMMIGRATION_LAW_VERIFIED_AT,
    reviewAfter: IMMIGRATION_LAW_REVIEW_AFTER,
    owner: "official",
    sourceType: "official_law",
    jurisdiction: "KR",
    validFrom: "2026-07-02",
  },
  "출입국관리법 제18조·제20조·제21조": {
    label: "국가법령정보센터 · 출입국관리법",
    url: "https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=245973",
    verifiedAt: IMMIGRATION_LAW_VERIFIED_AT,
    reviewAfter: IMMIGRATION_LAW_REVIEW_AFTER,
    owner: "official",
    sourceType: "official_law",
    jurisdiction: "KR",
    validFrom: "2026-07-02",
  },
  "출입국관리법 제24조·제25조·제31조": {
    label: "국가법령정보센터 · 출입국관리법",
    url: "https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=245973",
    verifiedAt: IMMIGRATION_LAW_VERIFIED_AT,
    reviewAfter: IMMIGRATION_LAW_REVIEW_AFTER,
    owner: "official",
    sourceType: "official_law",
    jurisdiction: "KR",
    validFrom: "2026-07-02",
  },
  "출입국관리법 제46조 및 위반 제재": {
    label: "국가법령정보센터 · 출입국관리법",
    url: "https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=245973",
    verifiedAt: IMMIGRATION_LAW_VERIFIED_AT,
    reviewAfter: IMMIGRATION_LAW_REVIEW_AFTER,
    owner: "official",
    sourceType: "official_law",
    jurisdiction: "KR",
    validFrom: "2026-07-02",
  },
  "출입국관리법 시행령 제12조·별표 1의2": {
    label: "국가법령정보센터 · 출입국관리법 시행령",
    url: "https://www.law.go.kr/flDownload.do?flNm=%5B%EB%B3%84%ED%91%9C+1%EC%9D%982%5D+%EC%9E%A5%EA%B8%B0%EC%B2%B4%EB%A5%98%EC%9E%90%EA%B2%A9%28%EC%A0%9C12%EC%A1%B0+%EA%B4%80%EB%A0%A8%29%0A&flSeq=53439589",
    verifiedAt: IMMIGRATION_LAW_VERIFIED_AT,
    reviewAfter: IMMIGRATION_LAW_REVIEW_AFTER,
    owner: "official",
    sourceType: "official_law",
    jurisdiction: "KR",
    validFrom: "2026-07-02",
  },
  "출입국관리법 시행규칙 제76조·별표 5·별표 5의2": {
    label: "국가법령정보센터 · 출입국관리법 시행규칙",
    url: "https://www.law.go.kr/LSW//lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0076&lsiSeq=283059&urlMode=lsScJoRltInfoR",
    verifiedAt: IMMIGRATION_LAW_VERIFIED_AT,
    reviewAfter: IMMIGRATION_LAW_REVIEW_AFTER,
    owner: "official",
    sourceType: "official_law",
    jurisdiction: "KR",
    validFrom: "2026-07-02",
  },
  "출입국관리법 시행규칙 별표 5의2": {
    label: "국가법령정보센터 · 체류자격 외 활동허가 신청 등 첨부서류",
    url: "https://www.law.go.kr/lsBylInfoPLinkR.do?bylBrNo=02&bylCls=BE&bylNo=0005&lsNm=%EC%B6%9C%EC%9E%85%EA%B5%AD%EA%B4%80%EB%A6%AC%EB%B2%95+%EC%8B%9C%ED%96%89%EA%B7%9C%EC%B9%99",
    verifiedAt: IMMIGRATION_LAW_VERIFIED_AT,
    reviewAfter: IMMIGRATION_LAW_REVIEW_AFTER,
    owner: "official",
    sourceType: "official_law",
    jurisdiction: "KR",
    validFrom: "2026-07-02",
  },
  "출입국관리법 시행규칙 제71조·제72조": {
    label: "국가법령정보센터 · 출입국관리법 시행규칙 수수료",
    url: "https://www.law.go.kr/LSW//lumLsLinkPop.do?chrClsCd=010202&lspttninfSeq=82731",
    verifiedAt: IMMIGRATION_LAW_VERIFIED_AT,
    reviewAfter: IMMIGRATION_LAW_REVIEW_AFTER,
    owner: "official",
    sourceType: "official_law",
    jurisdiction: "KR",
    validFrom: "2026-07-02",
  },
  "직업안정법 제47조·출입국관리법 제18조": {
    label: "국가법령정보센터",
    url: "https://www.law.go.kr",
    verifiedAt: DEFAULT_VERIFIED_AT,
    reviewAfter: DEFAULT_REVIEW_AFTER,
    owner: "official",
  },
  "행정사법 제2조 (법제처 해석례)": {
    label: "국가법령정보센터",
    url: "https://www.law.go.kr",
    verifiedAt: DEFAULT_VERIFIED_AT,
    reviewAfter: DEFAULT_REVIEW_AFTER,
    owner: "official",
  },
  "출입국관리사무소 안내": {
    label: "법무부 출입국외국인정책본부",
    url: "https://www.immigration.go.kr",
    verifiedAt: DEFAULT_VERIFIED_AT,
    reviewAfter: DEFAULT_REVIEW_AFTER,
    owner: "official",
  },
  "출입국관리사무소 체류자격 변경 안내": {
    label: "법무부 출입국외국인정책본부",
    url: "https://www.immigration.go.kr",
    verifiedAt: DEFAULT_VERIFIED_AT,
    reviewAfter: DEFAULT_REVIEW_AFTER,
    owner: "official",
  },
  "KAXI 분석 (공식 학사운영 지침 기반)": {
    label: "KAXI internal analysis",
    url: "internal://kaxi/cost-analysis",
    verifiedAt: DEFAULT_VERIFIED_AT,
    reviewAfter: DEFAULT_REVIEW_AFTER,
    owner: "internal",
  },
  "KAXI 안전 가이드라인": {
    label: "KAXI safety guideline",
    url: "internal://kaxi/safety-guideline",
    verifiedAt: DEFAULT_VERIFIED_AT,
    reviewAfter: DEFAULT_REVIEW_AFTER,
    owner: "internal",
  },
};

function inferSourceType(source: string, meta: SourceMetadata): SourceType {
  if (meta.owner === "internal") {
    return source.includes("안전") ? "internal_policy" : "internal_analysis";
  }
  const explicitLawSource =
    meta.url.includes("law.go.kr") ||
    /제\d+조/.test(source) ||
    ["출입국관리법", "직업안정법", "형법", "행정사법"].some((name) => source.includes(name));
  if (explicitLawSource) return "official_law";
  return "official_government";
}

function resolveSourceMetadata(source: string, meta: SourceMetadata): ResolvedSourceMetadata {
  return {
    ...meta,
    sourceType: meta.sourceType || inferSourceType(source, meta),
    jurisdiction: meta.jurisdiction || (meta.owner === "internal" ? "KAXI" : "KR"),
    validFrom: meta.validFrom || DEFAULT_VALID_FROM,
    validTo: meta.validTo ?? null,
    checkedBy: meta.checkedBy || DEFAULT_CHECKED_BY,
    reviewStatus: meta.reviewStatus || "approved",
    supersedes: meta.supersedes || [],
    supersededBy: meta.supersededBy ?? null,
  };
}

export function getSourceMetadata(source: string): ResolvedSourceMetadata {
  const meta = SOURCE_METADATA[source] ?? {
    label: source,
    url: "internal://kaxi/unregistered-source",
    verifiedAt: "1970-01-01",
    reviewAfter: "1970-01-01",
    owner: "internal",
  };
  return resolveSourceMetadata(source, meta);
}

export function hasRegisteredSourceMetadata(source: string): boolean {
  return Object.prototype.hasOwnProperty.call(SOURCE_METADATA, source);
}

function dateAtStartOfDay(value: Date | string): number {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function isSourceReviewCurrent(
  source: string,
  referenceDate: Date = new Date()
): boolean {
  if (!hasRegisteredSourceMetadata(source)) return false;
  const meta = getSourceMetadata(source);
  const reference = dateAtStartOfDay(referenceDate);
  if (meta.reviewStatus !== "approved") return false;
  if (meta.supersededBy) return false;
  if (dateAtStartOfDay(meta.validFrom) > reference) return false;
  if (meta.validTo && dateAtStartOfDay(meta.validTo) < reference) return false;
  return dateAtStartOfDay(meta.reviewAfter) >= reference;
}

export function getRagDocumentMetadata(doc: KnowledgeDoc, lang: Lang): RagDocumentMetadata {
  if (doc.ragMeta) {
    return {
      ...doc.ragMeta,
      title: pickLangText(doc.title, lang),
      language: lang,
      topic: doc.category,
    };
  }

  const meta = getSourceMetadata(doc.source);
  return {
    doc_id: doc.id,
    title: pickLangText(doc.title, lang),
    source_url: meta.url,
    source_type: meta.sourceType,
    language: lang,
    jurisdiction: meta.jurisdiction,
    topic: doc.category,
    valid_from: meta.validFrom,
    valid_to: meta.validTo,
    last_checked_at: meta.verifiedAt,
    checked_by: meta.checkedBy,
    review_status: meta.reviewStatus,
    supersedes: meta.supersedes,
    superseded_by: meta.supersededBy,
    review_after: meta.reviewAfter,
    source_label: meta.label,
    owner: meta.owner,
  };
}

function compactSourceLabel(label: string): string {
  if (/hikorea|하이코리아/i.test(label)) return "하이코리아";
  if (/study in korea|한국유학종합시스템/i.test(label)) return "Study in Korea";
  if (/법무부|출입국/i.test(label)) return "법무부";
  if (/교육부/i.test(label)) return "교육부";
  if (/국가법령|법제처/i.test(label)) return "국가법령정보센터";
  if (/topik|국립국제교육원/i.test(label)) return "국립국제교육원/TOPIK";
  if (/kaxi/i.test(label)) return "KAXI";
  return label;
}

function earliestDate(values: string[]): string {
  return values
    .filter(Boolean)
    .sort((a, b) => dateAtStartOfDay(a) - dateAtStartOfDay(b))[0] || DEFAULT_VERIFIED_AT;
}

export function buildRagBasisNoticeFromMetadata(
  lang: Lang,
  metas: RagDocumentMetadata[]
): string {
  if (metas.length === 0) return "";
  const checkedAt = earliestDate(metas.map((meta) => meta.last_checked_at));
  const officialMetas = metas.filter((meta) => meta.owner === "official");
  const sourceLabels = Array.from(
    new Set((officialMetas.length > 0 ? officialMetas : metas).map((meta) => compactSourceLabel(meta.source_label)))
  ).slice(0, 4);
  const sourceText = sourceLabels.join(" / ");

  return {
    ko: `이 안내는 ${checkedAt}에 확인된 ${sourceText} 출처 기준입니다. 개인 상황에 따라 달라질 수 있어 접수 전 행정사 검토가 필요합니다.`,
    vi: `Hướng dẫn này dựa trên nguồn ${sourceText} được kiểm tra ngày ${checkedAt}. Tình huống cá nhân có thể khác, nên cần chuyên gia hành chính kiểm tra trước khi nộp.`,
    mn: `Энэхүү мэдээлэл нь ${checkedAt}-нд шалгасан ${sourceText} эх сурвалжид үндэслэв. Хувийн нөхцөл өөр байж болох тул мэдүүлэхээс өмнө мэргэжлийн зөвлөгөө авна уу.`,
    en: `This guidance is based on ${sourceText} sources checked on ${checkedAt}. Individual circumstances may differ, so administrative-scrivener review is needed before filing.`,
  }[lang];
}

export function buildRagBasisNotice(lang: Lang, docs: KnowledgeDoc[]): string {
  return buildRagBasisNoticeFromMetadata(lang, docs.map((doc) => getRagDocumentMetadata(doc, lang)));
}

export function getKnowledgeDocsWithMetadata(
  options: { includeExpired?: boolean; referenceDate?: Date } = {}
): KnowledgeDocWithMetadata[] {
  const referenceDate = options.referenceDate || new Date();
  return KNOWLEDGE_DOCS.map((doc) => ({
    ...doc,
    sourceMeta: getSourceMetadata(doc.source),
  })).filter((doc) => options.includeExpired || isSourceReviewCurrent(doc.source, referenceDate));
}

export function getKnowledgeSourceAudit(referenceDate: Date = new Date()) {
  const registeredSources = new Set(Object.keys(SOURCE_METADATA));
  const usedSources = new Set(KNOWLEDGE_DOCS.map((doc) => doc.source));
  const missingMetadata = Array.from(usedSources).filter((source) => !registeredSources.has(source));
  const unusedMetadata = Array.from(registeredSources).filter((source) => !usedSources.has(source));
  const expiredDocs = KNOWLEDGE_DOCS
    .map((doc) => ({ doc, sourceMeta: getSourceMetadata(doc.source) }))
    .filter(({ doc }) => !isSourceReviewCurrent(doc.source, referenceDate))
    .map(({ doc, sourceMeta }) => ({
      id: doc.id,
      source: doc.source,
      reviewAfter: sourceMeta.reviewAfter,
    }));

  return {
    totalDocs: KNOWLEDGE_DOCS.length,
    activeDocs: getKnowledgeDocsWithMetadata({ referenceDate }).length,
    expiredDocs,
    missingMetadata,
    unusedMetadata,
  };
}

export const KNOWLEDGE_DOCS: KnowledgeDoc[] = [
  {
    id: "d2-overview",
    category: "visa",
    title: {
      ko: "D-2 비자 개요",
      vi: "Tổng quan visa D-2",
      mn: "D-2 визийн тойм",
      en: "D-2 Visa Overview",
    },
    keywords: ["d-2", "d2", "학위", "degree", "전문대", "대학교", "대학원", "đại học", "thạc sĩ", "бакалавр", "магистр"],
    content: {
      ko: "D-2는 학위과정 유학생 체류자격입니다. 전문대·대학교·대학원·전문대학원 학위과정에 등록된 외국인 유학생이 신청합니다. 교육부 인증대학(교육국제화역량 인증)은 사증 심사 혜택을 받을 수 있으며, 비인증대학은 기준 미충족 시 비자심사 강화대학으로 지정될 수 있습니다. 2025년 기준 학위과정 비자정밀 심사대학은 16개교입니다.",
      vi: "D-2 là visa cho sinh viên quốc tế theo học chương trình cấp bằng (cao đẳng, đại học, thạc sĩ, tiến sĩ). Trường được认证 (giáo dục quốc tế hóa) được hưởng lợi khi xét visa. Các trường không đạt chuẩn có thể bị đưa vào danh sách kiểm tra gắt. Năm 2025 có 16 trường bị xét visa kỹ.",
      mn: "D-2 нь зэргийн курсийн оюутны виз. Коллеж, их сургууль, магистр, докторын курс. Боловсролын олон улсын чадавхын итгэмжлэлтэй сургууль нь визний давуу эрхтэй. 2025 онд 16 сургууль нарийвчилсан шалгалтад орсон.",
      en: "D-2 is for degree-program international students (college, university, graduate school). Accredited universities (education internationalization capacity认证) get visa screening benefits. Non-accredited schools may be designated as strict visa review schools. In 2025, 16 degree programs are under strict visa review.",
    },
    source: "Study in Korea · 한국유학종합시스템",
  },
  {
    id: "d4-overview",
    category: "visa",
    title: {
      ko: "D-4 비자 개요",
      vi: "Tổng quan visa D-4",
      mn: "D-4 визийн тойм",
      en: "D-4 Visa Overview",
    },
    keywords: ["d-4", "d4", "어학당", "연수", "language", "tiếng hàn", "хэл", "korean language", "du học tiếng"],
    content: {
      ko: "D-4는 비학위 연수과정 유학생 체류자격입니다. 어학당·교환학생·연구원 등이 해당합니다. 한국어 기초가 없어도 입학 가능합니다. 2025년 기준 어학연수과정 비자정밀 심사대학은 4개교이며, 2026년 2학기부터 1년간 해당 대학은 비자 발급이 제한됩니다.",
      vi: "D-4 là visa cho chương trình không cấp bằng (lớp tiếng Hàn, trao đổi, nghiên cứu). Không cần TOPIK. Năm 2025 có 4 trường bị xét visa kỹ, từ kỳ 2/2026 bị hạn chế visa 1 năm.",
      mn: "D-4 нь зэргийн бус курсийн виз. Солонгос хэлний курс, солилцооны оюутан, судлаач. TOPIK шаардлагагүй. 2025 онд 4 сургууль, 2026/II-ээс 1 жил виз хязгаарлагдана.",
      en: "D-4 is for non-degree programs (Korean language institutes, exchange students, researchers). No TOPIK required. In 2025, 4 language programs are under strict review, with 1-year visa restriction from 2026 semester 2.",
    },
    source: "Study in Korea · 교육부",
  },
  {
    id: "visa-documents",
    category: "documents",
    title: {
      ko: "비자 신청 필수 서류",
      vi: "Hồ sơ visa bắt buộc",
      mn: "Визийн шаардлагатай баримт",
      en: "Required visa documents",
    },
    keywords: [
      "d-2",
      "d2",
      "d-4",
      "d4",
      "비자 서류",
      "d-2 비자 서류",
      "d-4 비자 서류",
      "서류",
      "documents",
      "hồ sơ",
      "barimt",
      "여권",
      "사진",
      "입학허가서",
      "사업자등록증",
      "학력",
      "재정",
      "표준입학허가서",
    ],
    content: {
      ko: "한국유학종합시스템에 따르면 D-2/D-4 비자 신청에는 여권 사본, 증명사진, 교육기관 사업자등록증, 표준입학허가서, 학력 증빙, 재정능력 증빙 등이 필요합니다. 국가·프로그램에 따라 추가 서류가 요구될 수 있으며, 관할 재외공관 확인이 필수입니다. 결핵진단서는 베트남·몽골·중국·필리핀·미얀마·우즈베키스탄·태국·인도네시아·네팔 등 일부 국가 출신자에게 필요합니다.",
      vi: "Theo hệ thống Study in Korea, visa D-2/D-4 cần: hộ chiếu, ảnh, giấy ĐKKD cơ sở giáo dục, giấy nhập học chuẩn, bằng cấp, chứng minh tài chính. Có thể cần thêm giấy khám LAO cho công dân Việt Nam, Mông Cổ, Trung Quốc, Philippines...",
      mn: "Study in Korea системд D-2/D-4 визанд: паспорт, зураг, боловсролын байгууллагын гэрчилгээ, стандарт элсэлтийн зөвшөөрөл, боловсролын баталгаа, санхүүгийн баталгаа хэрэгтэй. Монгол, Вьетнам, Хятад, Филиппин зэрэг орны иргэдэд сүрьеэний үзлэг шаардлагатай.",
      en: "Per Study in Korea, D-2/D-4 visa requires: passport copy, ID photo, school business registration, standard admission letter, education proof, financial proof. TB test required for citizens of Vietnam, Mongolia, China, Philippines, Myanmar, Uzbekistan, Thailand, Indonesia, Nepal.",
    },
    source: "Study in Korea (studyinkorea.go.kr)",
  },
  {
    id: "tuberculosis-test",
    category: "documents",
    title: {
      ko: "결핵진단서 안내",
      vi: "Giấy khám LAO",
      mn: "Сүрьеэний үзлэг",
      en: "Tuberculosis test",
    },
    keywords: ["결핵", "lao", "tuberculosis", "сүрьеэ", "tb", "진단서"],
    content: {
      ko: "결핵진단서는 한국법무부 지정 병원에서 검사받아야 하며, 결과는 6개월 유효합니다. 베트남 (하노이 가톨릭대학교 강북성모병원, 호치민 빈머 의과대학병원), 몽골 (국립제3병원, 가축위생병원) 등에 지정 병원이 있습니다. 검사 비용은 국가별로 약 30~80달러입니다. 검사 결과 이상 발견시 비자 발급이 제한될 수 있습니다.",
      vi: "Giấy khám LAO phải khám tại bệnh viện chỉ định của Bộ Tư pháp Hàn Quốc. Kết quả có hiệu lực 6 tháng. Tại Việt Nam: bệnh viện Đức (Hà Nội), Chợ Rẫy (HCMC). Chi phí khoảng 30-80 USD.",
      mn: "Сүрьеэний үзлэгийг Солонгосын Хууль зүй яамны заасан эмнэлэгт хийлгэх. Үр дүн 6 сар хүчинтэй. Монголд Үндэсний 3-р эмнэлэг, мал амьтны эрүүл мэндийн эмнэлэгт. Үнэ 30-80 ам.доллар.",
      en: "TB test must be at Korean Ministry of Justice designated hospitals. Result valid 6 months. In Vietnam: Duc Hospital (Hanoi), Chợ Rẫy (HCMC). Mongolia: National 3rd Hospital. Cost ~30-80 USD. Abnormal results may restrict visa.",
    },
    source: "법무부 출입국외국인정책본부",
  },
  {
    id: "accredited-university",
    category: "school",
    title: {
      ko: "교육국제화역량 인증대학 제도",
      vi: "Trường认证 năng lực quốc tế hóa",
      mn: "Олон улсын чадавхын итгэмжлэлтэй сургууль",
      en: "Accredited universities (Internationalization Capacity)",
    },
    keywords: ["인증대학", "accredited", "인증", "국제화역량", "công nhận", "итгэмжлэл", "비자혜택", "visa benefit"],
    content: {
      ko: "교육부는 매년 대학의 교육국제화역량을 평가하여 인증대학을 선정합니다. 인증대학은 사증 심사 간소화, 유학생 체류기간 단축 등의 혜택이 있습니다. 비인증대학은 유학생 유치가 제한되거나 비자심사 강화대학으로 지정될 수 있습니다. 2025년 기준 학위과정 16개교, 어학연수과정 4개교가 비자정밀 심사대학으로 지정되었으며, 2026년 2학기부터 1년간 비자 발급이 제한됩니다.",
      vi: "MOE hàng năm đánh giá và认证 các trường đạt chuẩn quốc tế hóa. Trường认证 được hưởng lợi: visa gọn, thời gian lưu trú ngắn hơn. Trường không认证 có thể bị hạn chế hoặc đưa vào danh sách visa gắt. 2025: 16 trường ĐH, 4 trường tiếng bị xét kỹ, hạn chế visa từ 2026/2.",
      mn: "Боловсролын яам жил бүр олон улсын чадавхын итгэмжлэл олгоно. Итгэмжлэгдсэн сургууль визний хөнгөлөлттэй. Итгэмжлэгдээгүй сургууль визний нарийн шалгалтад орж болно. 2025: 16 их сургууль, 4 хэлний курс нарийн шалгалтад, 2026/II-ээс 1 жил виз хязгаарлагдана.",
      en: "MOE annually certifies universities with internationalization capacity. Accredited schools get simplified visa screening, shorter stay periods. Non-accredited may face restrictions or strict visa review. In 2025: 16 degree + 4 language programs under strict review, visa restricted 1 year from 2026/2.",
    },
    source: "교육부 보도자료 (2026.02)",
  },
  {
    id: "cost-breakdown",
    category: "cost",
    title: {
      ko: "유학 총비용 항목 분해",
      vi: "Phân tích tổng chi phí du học",
      mn: "Нийт зардлын задаргаа",
      en: "Total cost itemized breakdown",
    },
    keywords: ["비용", "cost", "chi phí", "зардал", "tuition", "등록금", "기숙사", "서류", "번역", "공증", "비자수수료", "항공", "정착비"],
    content: {
      ko: "한국 유학 총비용은 등록금·기숙사비·서류비·번역공증비·비자수수료·항공권·입국 초기 정착비로 분해됩니다. 어학당 1학기 등록금은 130~190만원, 4년제는 350~520만원 정도입니다. 기숙사비는 6개월 150~300만원. 번역공증은 문서당 15,000~50,000원. 비자 신청 수수료는 60,000원(단수). 항공권은 편도 30~60만원. 정착비는 통신·교통·생활비 포함 1~2백만원이 적정합니다. 브로커가 총액만 말하면 30% 이상 부풀려져 있을 수 있으므로 항목별 비교가 필수입니다.",
      vi: "Tổng chi phí du học Hàn Quốc: học phí, KTX, hồ sơ, dịch+công chứng, phí visa, vé máy bay, chi phí ban đầu. Lớp tiếng: 1.3-1.9 triệu KRW/kỳ. Đại học: 3.5-5.2 triệu/kỳ. KTX: 1.5-3 triệu/6 tháng. Dịch+công chứng: 15,000-50,000 KRW/tài liệu. Visa: 60,000 KRW. Vé: 300-600k KRW. Nếu môi giới báo tổng cao hơn 30% → so sánh kỹ.",
      mn: "Солонгос улсад сурах нийт зардал: төлбөр, дотуур байр, баримт, орчуулга гэрчилгээ, виз хураамж, нисэх тийз, анхны зардал. Хэлний курс 1.3-1.9 сая/семестр. Их сургууль 3.5-5.2 сая. Дотуур байр 1.5-3 сая/6 сар. Орчуулга 15-50 мянга/баримт. Виз 60,000. Зуучлагч 30%+ өндөр бол харьцуул.",
      en: "Korea study total cost: tuition, dorm, docs, translation, visa, flight, settlement. Language: 1.3-1.9M KRW/semester. University: 3.5-5.2M/semester. Dorm: 1.5-3M/6mo. Translation: 15-50K/doc. Visa: 60K. Flight: 300-600K. Settlement: 1-2M. If broker total is 30%+ higher, compare items.",
    },
    source: "KAXI 분석 (공식 학사운영 지침 기반)",
  },
  {
    id: "topik-requirement",
    category: "documents",
    title: {
      ko: "TOPIK 요구 등급",
      vi: "Yêu cầu TOPIK",
      mn: "TOPIK шаардлага",
      en: "TOPIK requirement",
    },
    keywords: ["topik", "토픽", "한국어능력시험", "korean exam", "tiếng hàn", "level", "등급"],
    content: {
      ko: "TOPIK(Test of Proficiency in Korean)은 1~6급으로 구성됩니다. 학위과정 입학은 보통 TOPIK 4급 이상이 필요하며, 전공·대학에 따라 3급 또는 5급이 요구될 수 있습니다. 어학당은 TOPIK 점수가 필요 없습니다. 일부 대학은 자체 한국어 시험으로 대체 가능합니다. TOPIK은 매년 4~6회 시행되며 응시료는 약 40,000~60,000원입니다.",
      vi: "TOPIK có 6 cấp. ĐH cần TOPIK 4+ (có nơi 3 hoặc 5). Lớp tiếng không cần. Một số trường cho phép thi riêng. TOPIK 4-6 lần/năm, phí 40-60k KRW.",
      mn: "TOPIK 6 түвшинтэй. Их сургууль 4+ шаардлагатай (зарим 3 эсвэл 5). Хэлний курс шаардлагагүй. Зарим сургууль өөрийн шалгалттай. Жилд 4-6 удаа, хураамж 40-60k KRW.",
      en: "TOPIK levels 1-6. Universities typically require 4+ (some 3 or 5). Language programs: none. Some schools have own tests. Held 4-6 times/year, fee 40-60K KRW.",
    },
    source: "NIIED 한국교육과정평가원",
  },
  {
    id: "standard-admission",
    category: "documents",
    title: {
      ko: "표준입학허가서 제도",
      vi: "Giấy nhập học chuẩn",
      mn: "Стандарт элсэлтийн зөвшөөрөл",
      en: "Standard Admission Letter",
    },
    keywords: ["표준입학허가서", "standard admission", "입학허가", "사업자등록증", "giấy nhập học", "элсэлтийн зөвшөөрөл"],
    content: {
      ko: "표준입학허가서는 법무부 지정 양식으로 학교가 발급하는 공식 입학 허가 문서입니다. 일반 입학허가서와 달리 비자 신청시 필수이며, 학교의 사업자등록증 사본과 함께 제출해야 합니다. 학교 합격 후 학교 유학담당자에게 요청하여 발급받아야 합니다. 발급에는 보통 1~2주가 소요됩니다.",
      vi: "Giấy nhập học chuẩn là mẫu của Bộ Tư pháp, do trường cấp. Bắt buộc khi xin visa, kèm ĐKKD của trường. Sau khi đậu, yêu cầu trường cấp. Mất 1-2 tuần.",
      mn: "Стандарт элсэлтийн зөвшөөрөл нь Хууль зүй яамны загвараар сургууль олгоно. Визанд заавал хэрэгтэй, сургуулийн гэрчилгээтэй хамт. 1-2 долоо хоног болно.",
      en: "Standard Admission Letter is a Ministry of Justice-designated form issued by the school. Required for visa, with school business registration. Request from school after admission. Takes 1-2 weeks.",
    },
    source: "법무부 출입국외국인정책본부",
  },
  {
    id: "financial-proof",
    category: "documents",
    title: {
      ko: "재정능력 증빙",
      vi: "Chứng minh tài chính",
      mn: "Санхүүгийн баталгаа",
      en: "Financial proof",
    },
    keywords: ["재정", "financial", "tài chính", "санхүү", "잔고증명서", "balance", "은행잔고", "sổ tiết kiệm", "danisch"],
    content: {
      ko: "재정능력 증빙은 본인 또는 부모 명의 은행 잔고증명서로 제출합니다. D-2는 보통 20,000달러 이상, D-4는 13,000달러 이상의 잔고를 1개월 이상 유지해야 합니다. 국가에 따라 6개월 이상 유지를 요구할 수 있습니다. 허위 잔고증명서 제출은 강제퇴거·입국금지 대상이며, 플랫폼은 허위서류 요청을 거부합니다.",
      vi: "Chứng minh tài chính bằng sổ tiết kiệm bản thân hoặc bố mẹ. D-2 cần 20,000+ USD, D-4 cần 13,000+ USD, duy trì 1+ tháng. Một số nước cần 6 tháng. Sổ giả = trục xuất + cấm nhập cảnh.",
      mn: "Санхүүгийн баталгаа нь өөрийн эсвэл эцэг эхийн нэр дээрх банкны үлдэгдлийн гэрчилгээ. D-2 20,000+ ам.доллар, D-4 13,000+ ам.доллар, 1+ сар хадгалах. Хуурамч баримт = албадан гаргах + хориг.",
      en: "Financial proof via bank balance certificate (self or parents). D-2: 20,000+ USD, D-4: 13,000+ USD, held 1+ month. Some countries need 6 months. Fake certificates = deportation + entry ban. Platform refuses fake document requests.",
    },
    source: "법무부 비자 발급 안내",
  },
  {
    id: "visa-guarantee-warning",
    category: "warning",
    title: {
      ko: "비자 보장 거짓 광고 경고",
      vi: "Cảnh báo quảng cáo xảo trá 'bảo đảm visa'",
      mn: "'Виз баталгаа' хуурамч зар сурталчилгаа",
      en: "Visa guarantee false advertising warning",
    },
    keywords: ["비자 보장", "visa guarantee", "bảo đảm", "баталгаа", "100% 비자", "guaranteed", "보장"],
    content: {
      ko: "비자 발급 여부는 영사의 재량이며, 어떤 브로커나 유학원도 '비자 100% 보장'을 약속할 수 없습니다. 비자 보장을 약속하는 것은 허위 광고에 해당하며, 계약 후 비자 거절시 책임을 회피하는 경우가 많습니다. KAXI는 비자 발급을 보장하지 않으며, 비자 가능성을 판단하지 않습니다. 개별 비자 판단은 행정사 상담으로 연결됩니다.",
      vi: "Visa do lãnh sự quyết định. Không ai bảo đảm 100% visa. Hứa 'bảo đảm visa' là quảng cáo giả. Nền tảng không bảo đảm visa, chuyển sang luật sư cho từng trường hợp.",
      mn: "Визийг консул шийдвэрлэнэ. 'Виз 100% баталгаа' гэдэг хуурамч зар. Платформ виз баталгаажуулдаггүй, тусгай зөвлөгөөнд шилжүүлнэ.",
      en: "Visa is at consul's discretion. No one can guarantee 100% visa. 'Visa guarantee' is false advertising. Platform does not guarantee visa, refers to admin lawyer for individual cases.",
    },
    source: "KAXI 안전 가이드라인",
  },
  {
    id: "fake-documents-warning",
    category: "warning",
    title: {
      ko: "허위서류 불법 위험",
      vi: "Rủi ro hồ sơ giả",
      mn: "Хуурамч баримтын хууль бус эрсдэл",
      en: "Fake documents illegal risk",
    },
    keywords: ["허위", "fake", "giả", "хуурамч", "거짓", "잔고증명", "거짓 서류", "false document", "위조"],
    content: {
      ko: "허위 잔고증명·허위 학력증명서·허위 재직증명서 제출은 출입국관리법 위반으로 강제퇴거·입국금지(최장 10년) 대상입니다. 또한 사문서위조죄(형법 제231조)로 형사처벌 대상입니다. KAXI는 허위서류 작성·제공을 요청하는 사용자에게 서비스를 제공하지 않으며, 합법적 준비 경로를 안내합니다.",
      vi: "Sổ tiết kiệm giả, bằng giả, giấy chứng nhận giả = trục xuất + cấm nhập cảnh tới 10 năm. Hình phạt hình sự theo luật. Nền tảng từ chối hồ sơ giả, hướng dẫn chuẩn bị hợp pháp.",
      mn: "Хуурамч банкны баримт, боловсролын гэрчилгээ = албадан гаргах + 10 жил хүртэл хориг. Эрүүгийн хариуцлага. Платформ татгалзаж, хууль ёсны замаар зааварлана.",
      en: "Fake bank statements, fake diplomas = deportation + entry ban up to 10 years. Criminal liability under criminal code. Platform refuses, guides to legal preparation.",
    },
    source: "출입국관리법 제89조·형법 제231조",
  },
  {
    id: "illegal-employment-warning",
    category: "warning",
    title: {
      ko: "불법취업·취업 매칭 위험",
      vi: "Rủi ro việc làm bất hợp pháp",
      mn: "Хууль бус ажлын эрсдэл",
      en: "Illegal employment risk",
    },
    keywords: ["취업", "알바", "공장", "job", "work", "việc làm", "ажил", "직업소개", "employment", "취업 매칭"],
    content: {
      ko: "미등록 유료직업소개사업은 직업안정법 제47조 위반으로 5년 이하 징역 또는 5천만원 이하 벌금 대상입니다. D-2/D-4 비자 소지자의 아르바이트는 별도 시간제취업허가(S-3)를 받아야 하며, 허가 없는 취업은 불법취업으로 강제퇴거 대상입니다. KAXI는 취업 매칭을 제공하지 않으며, 합법 취업은 고용노동부 고용허가제를 통해야 함을 안내합니다.",
      vi: "Giới thiệu việc làm không đăng ký = phạt 5 năm tù hoặc 50 triệu KRW. D-2/D-4 muốn làm thêm cần giấy phép (S-3). Không phép = trục xuất. Nền tảng không ghép việc làm.",
      mn: "Бүртгэлгүй ажлын байрны зуучлал = 5 жил хүртэл хорих эсвэл 50 сая KRW торгууль. D-2/D-4 ажиллахын тулд тусгай зөвшөөрөл (S-3) хэрэгтэй. Платформ ажил холбохгүй.",
      en: "Unregistered job matching = up to 5yr prison or 50M KRW fine. D-2/D-4 part-time work needs S-3 permit. Without = illegal work → deportation. Platform provides no job matching.",
    },
    source: "직업안정법 제47조·출입국관리법 제18조",
  },
  {
    id: "administrative-scrivener",
    category: "legal",
    title: {
      ko: "행정사 업무 영역",
      vi: "Lĩnh vực luật sư hành chính",
      mn: "Зөвлөгөөний талбар",
      en: "Administrative scrivener scope",
    },
    keywords: ["행정사", "administrative", "luật sư hành chính", "зөвлөгөө", "비자대행", "visa agent", "출입국", "immigration"],
    content: {
      ko: "행정사법 제2조에 따라 행정사는 행정기관 제출 서류 작성, 권리·의무나 사실증명 서류 작성, 작성된 서류의 제출 대행 등을 업무로 합니다. 비자 신청서 작성, 출입국 제출서류 작성, 체류자격 변경 신청 대행은 행정사 영역입니다. KAXI는 일반 안내만 제공하며, 개별 비자 판단·서류 작성·제출 대행은 행정사 파트너에게 위탁합니다.",
      vi: "Theo luật hành chính, luật sư hành chính được phép soạn hồ sơ nộp cơ quan, đại diện nộp. Visa, thay đổi tư cách lưu trú → cần luật sư. Nền tảng chỉ hướng dẫn chung.",
      mn: "Зөвлөгөөний хуулиар албан баримт бэлтгэх, төлөөлөн гаргах эрхтэй. Виз, байршил өөрчлөх → зөвлөгөө шаардлагатай. Платформ ерөнхий заавар өгнө.",
      en: "Per Admin Scrivener Act Art. 2, admin lawyers prepare administrative documents and submit on behalf. Visa applications, stay status changes need admin lawyer. Platform provides general guidance only.",
    },
    source: "행정사법 제2조 (법제처 해석례)",
  },
  {
    id: "after-arrival",
    category: "process",
    title: {
      ko: "입국 후 의무 절차",
      vi: "Thủ tục bắt buộc sau nhập cảnh",
      mn: "Орсны дараах заавал хийх ажил",
      en: "Mandatory procedures after arrival",
    },
    keywords: ["입국", "arrival", "nhập cảnh", "орох", "외국인등록", "arc", "alien registration", "정착", "settlement"],
    content: {
      ko: "외국인 유학생은 입국 후 90일 이내 외국인등록을 해야 합니다. 등록시 여권·표준입학허가서·증명사진·수수료 30,000원이 필요합니다. 건강보험 가입은 의무이며 월 35,000~70,000원입니다. 은행 계좌 개설시 외국인등록증·여권·주소 증빙이 필요합니다. 통신 가입은 외국인등록증 또는 여권+입국사실증명으로 가능합니다.",
      vi: "Sau nhập cảnh, đăng ký người nước ngoài trong 90 ngày. Cần: hộ chiếu, giấy nhập học, ảnh, phí 30,000 KRW. Bắt buộc bảo hiểm y tế 35-70k/tháng. Mở tài khoản cần ARC, hộ chiếu, địa chỉ.",
      mn: "Орсны дараа 90 хоногийн дотор гадаадын иргэний бүртгэл хийх. Пасспорт, элсэлтийн зөвшөөрөл, зураг, 30,000 KRW. Эрүүл мэндийн даатгал заавал. Банкны данс нээхэд ARC шаардлагатай.",
      en: "Within 90 days of arrival, register for ARC. Requires: passport, admission letter, photo, 30,000 KRW fee. Health insurance mandatory (35-70K/month). Bank account needs ARC, passport, address proof.",
    },
    source: "출입국관리사무소 안내",
  },
  {
    id: "immigration-law-interpretation-hierarchy",
    category: "legal",
    title: {
      ko: "출입국·체류 답변의 법령 해석 순서",
      vi: "Thứ tự giải thích pháp luật về xuất nhập cảnh/lưu trú",
      mn: "Цагаачлал, оршин суух асуудлын эрх зүйн тайлбарын дараалал",
      en: "Legal hierarchy for immigration and stay-status answers",
    },
    keywords: [
      "법령",
      "법적 근거",
      "해석",
      "출입국관리법",
      "시행령",
      "시행규칙",
      "별표",
      "고시",
      "하이코리아",
      "legal basis",
      "law hierarchy",
    ],
    content: {
      ko: "외국인 출입국·비자·체류 답변은 법률인 출입국관리법을 최상위 근거로 보고, 그 위임을 받은 출입국관리법 시행령의 체류자격 분류와 시행규칙의 제출서류·수수료를 차례로 확인해야 합니다. 하이코리아 안내, 비자 내비게이터, 체류자격별 매뉴얼은 행정 실무를 이해하는 보조 근거입니다. 법령과 안내가 충돌하거나 최신성이 불명확하면 법령과 관할 출입국외국인관서 확인을 우선하고, 개별 사례 판단은 행정사 검토로 연결합니다.",
      vi: "Câu trả lời về xuất nhập cảnh, visa và lưu trú phải đặt Luật Quản lý xuất nhập cảnh làm căn cứ cao nhất, sau đó kiểm tra phân loại tư cách lưu trú trong Nghị định thi hành và hồ sơ/phí trong Quy tắc thi hành. Hướng dẫn HiKorea, Visa Navigator và sổ tay theo tư cách lưu trú là căn cứ nghiệp vụ bổ trợ. Nếu có mâu thuẫn hoặc chưa chắc mới nhất, ưu tiên luật và xác nhận với cơ quan xuất nhập cảnh có thẩm quyền.",
      mn: "Гадаад иргэний хил нэвтрэх, виз, оршин суух асуултад эхлээд Цагаачлалын хяналтын тухай хуулийг, дараа нь хэрэгжүүлэх журам дахь ангилал, хэрэгжүүлэх дүрмийн материал/хураамжийг шалгана. HiKorea болон гарын авлага нь практик туслах эх сурвалж. Зөрчил эсвэл шинэчлэл тодорхойгүй бол хууль болон харьяа байгууллагын баталгааг түрүүнд үзнэ.",
      en: "Immigration, visa, and stay-status answers must start from the Immigration Act, then apply the Enforcement Decree's stay-status classifications and the Enforcement Rule's document and fee rules. HiKorea, Visa Navigator, and status manuals are operational guidance. If guidance conflicts with law or freshness is unclear, prioritize law and competent immigration-office confirmation, and route case-specific judgment to an administrative scrivener.",
    },
    source: "출입국관리법 제10조·제17조",
  },
  {
    id: "immigration-act-stay-status-scope",
    category: "legal",
    title: {
      ko: "체류자격과 활동범위의 기본 법리",
      vi: "Nguyên tắc pháp lý về tư cách lưu trú và phạm vi hoạt động",
      mn: "Оршин суух ангилал ба үйл ажиллагааны хүрээний үндсэн зарчим",
      en: "Core rule: stay status and permitted activity scope",
    },
    keywords: [
      "제10조",
      "제17조",
      "체류자격",
      "활동범위",
      "외국인의 체류",
      "stay status",
      "permitted activity",
      "d-2",
      "d-4",
      "d-10",
      "e-7",
      "f-2",
      "f-5",
    ],
    content: {
      ko: "출입국관리법 체계에서 외국인은 체류자격을 가져야 하고, 대한민국 체류 중에는 그 체류자격과 체류기간의 범위 안에서 활동해야 합니다. 따라서 D-2, D-4, D-10, E-7, F-2, F-5 같은 기호는 단순한 명칭이 아니라 허용 활동과 체류관리 판단의 출발점입니다. 답변은 먼저 현재 체류자격, 목표 활동, 체류기간 만료일, 등록 여부를 확인한 뒤 법령상 허용 범위와 별도 허가 필요성을 구분해야 합니다.",
      vi: "Theo hệ thống Luật Quản lý xuất nhập cảnh, người nước ngoài phải có tư cách lưu trú và chỉ được hoạt động trong phạm vi tư cách và thời hạn được cho phép. Vì vậy D-2, D-4, D-10, E-7, F-2, F-5 không chỉ là tên visa mà là điểm bắt đầu để xác định hoạt động được phép. Cần hỏi tư cách hiện tại, hoạt động muốn làm, ngày hết hạn và tình trạng đăng ký trước khi trả lời.",
      mn: "Цагаачлалын хуулийн тогтолцоонд гадаад иргэн оршин суух ангилалтай байх бөгөөд зөвшөөрөгдсөн ангилал, хугацааны хүрээнд үйл ажиллагаа явуулна. D-2, D-4, D-10, E-7, F-2, F-5 нь зөвшөөрөгдөх үйл ажиллагааг тогтоох эхлэл. Хариулт өгөхөөс өмнө одоогийн ангилал, хийх үйл ажиллагаа, дуусах огноо, бүртгэлийг шалгана.",
      en: "Under the Immigration Act system, a foreign national must hold a stay status and act only within the permitted status and period. Codes like D-2, D-4, D-10, E-7, F-2, and F-5 are not mere labels; they define the starting point for permitted activities and stay management. Answers must first identify current status, target activity, expiry date, and registration status.",
    },
    source: "출입국관리법 제10조·제17조",
  },
  {
    id: "immigration-decree-long-term-status-table",
    category: "legal",
    title: {
      ko: "시행령 별표상 장기체류자격 분류",
      vi: "Phân loại tư cách lưu trú dài hạn trong phụ lục nghị định",
      mn: "Хэрэгжүүлэх журмын урт хугацааны оршин суух ангилал",
      en: "Long-term stay-status classifications under the Enforcement Decree",
    },
    keywords: [
      "시행령",
      "제12조",
      "별표 1의2",
      "장기체류자격",
      "유학 d-2",
      "일반연수 d-4",
      "구직 d-10",
      "특정활동 e-7",
      "거주 f-2",
      "영주 f-5",
    ],
    content: {
      ko: "출입국관리법 시행령 제12조 관련 별표는 장기체류자격의 사람 또는 활동범위를 정합니다. 유학(D-2)은 전문대학 이상 교육기관 또는 학술연구기관의 정규과정 교육·특정 연구, 일반연수(D-4)는 법무부장관이 정하는 요건의 교육·연수·연구활동, 구직(D-10)은 E계열 취업 분야의 구직·연수 또는 창업 준비, 특정활동(E-7)은 공공기관·민간단체 등과의 계약에 따른 법무부장관 지정 활동으로 해석합니다. F-2, F-5는 거주·영주 영역으로 별도 세부 요건과 심사기준 확인이 필요합니다.",
      vi: "Phụ lục liên quan Điều 12 của Nghị định thi hành quy định đối tượng hoặc phạm vi hoạt động của tư cách lưu trú dài hạn. D-2 là học chính quy/nghiên cứu tại cơ sở từ cao đẳng trở lên hoặc viện nghiên cứu; D-4 là đào tạo/nghiên cứu tại cơ sở đáp ứng điều kiện do Bộ trưởng Tư pháp quy định; D-10 là tìm việc/đào tạo trong lĩnh vực E hoặc chuẩn bị khởi nghiệp; E-7 là hoạt động được Bộ trưởng Tư pháp chỉ định theo hợp đồng. F-2/F-5 cần kiểm tra điều kiện riêng.",
      mn: "Хэрэгжүүлэх журмын 12 дугаар зүйлтэй холбоотой хавсралт нь урт хугацааны оршин суух ангиллын хүн ба үйл ажиллагааг тогтоодог. D-2 нь дээд боловсрол/судалгааны байгууллагын үндсэн сургалт, D-4 нь Хууль зүйн сайдын тогтоосон нөхцөлтэй сургалт/дадлага/судалгаа, D-10 нь E ангиллын ажил хайх эсвэл стартап бэлтгэл, E-7 нь гэрээний үндсэн дээр сайдын тусгайлан заасан үйл ажиллагаа. F-2/F-5 нь тусдаа нарийвчилсан шалгууртай.",
      en: "The Enforcement Decree table linked to Article 12 defines long-term stay statuses by eligible person or activity scope. D-2 covers degree study or specific research at higher-education or research institutions; D-4 covers training, education, or research under Ministry of Justice conditions; D-10 covers job seeking/training for E-series fields or startup preparation; E-7 covers activities specially designated by the Minister of Justice under contract. F-2 and F-5 require separate residence/permanent-residence criteria.",
    },
    source: "출입국관리법 시행령 제12조·별표 1의2",
  },
  {
    id: "immigration-act-permission-matrix",
    category: "legal",
    title: {
      ko: "변경·연장·자격외활동의 허가 구조",
      vi: "Cấu trúc xin phép thay đổi, gia hạn và hoạt động ngoài tư cách",
      mn: "Өөрчлөх, сунгах, ангиллаас гадуурх үйл ажиллагааны зөвшөөрлийн бүтэц",
      en: "Permission matrix for status change, extension, and outside-status activity",
    },
    keywords: [
      "체류자격 변경",
      "체류기간 연장",
      "체류자격외활동",
      "근무처 변경",
      "제20조",
      "제21조",
      "제24조",
      "제25조",
      "외국인등록",
    ],
    content: {
      ko: "출입국관리법상 현 체류자격과 다른 활동을 병행하려면 체류자격 외 활동허가를 검토하고, 근무처 변경·추가는 별도 허가 또는 신고 구조를 확인해야 합니다. 현재 자격을 중지하고 다른 체류자격 활동을 하려면 체류자격 변경허가가 문제 되고, 허가받은 체류기간을 넘겨 계속 체류하려면 체류기간 연장허가가 문제 됩니다. 90일 초과 체류 외국인은 외국인등록 의무와 체류지·등록사항 변경 신고도 함께 확인해야 합니다.",
      vi: "Theo Luật Quản lý xuất nhập cảnh, nếu vừa giữ tư cách hiện tại vừa làm hoạt động khác, cần xem xét phép hoạt động ngoài tư cách; thay đổi/thêm nơi làm việc có cơ chế phép hoặc thông báo riêng. Nếu dừng tư cách hiện tại để làm hoạt động thuộc tư cách khác, cần xem xét thay đổi tư cách; nếu ở quá thời hạn đã được cho phép, cần gia hạn. Người ở quá 90 ngày cũng phải kiểm tra nghĩa vụ đăng ký người nước ngoài và khai báo thay đổi nơi ở/thông tin.",
      mn: "Цагаачлалын хуулиар одоогийн ангиллаа хадгалж өөр үйл ажиллагаа хийх бол ангиллаас гадуурх үйл ажиллагааны зөвшөөрөл, ажлын байр өөрчлөх/нэмэх бол тусдаа зөвшөөрөл эсвэл мэдэгдэл шалгана. Өөр ангиллын үндсэн үйл ажиллагаа хийх бол ангилал өөрчлөх, хугацаа хэтрүүлэн байх бол хугацаа сунгах асуудал болно. 90 хоногоос дээш оршин суух бол бүртгэл болон хаяг/мэдээлэл өөрчлөлтийн үүргийг шалгана.",
      en: "Under the Immigration Act, outside-status activity permission is considered when the person keeps the current status but performs another activity; workplace changes/additions have separate permit or reporting structures. If the current status activity stops and another status activity begins, status-change permission is at issue. If the person stays beyond the permitted period, stay-extension permission is at issue. Stays over 90 days also require alien registration and reporting of address or registration changes.",
    },
    source: "출입국관리법 제18조·제20조·제21조",
  },
  {
    id: "immigration-rule-documents-attachments",
    category: "documents",
    title: {
      ko: "시행규칙상 첨부서류·아포스티유 확인",
      vi: "Hồ sơ đính kèm và apostille theo Quy tắc thi hành",
      mn: "Хавсаргах материал ба апостиль",
      en: "Attachments and apostille under the Enforcement Rule",
    },
    keywords: [
      "시행규칙",
      "제76조",
      "별표 5",
      "별표 5의2",
      "첨부서류",
      "아포스티유",
      "영사확인",
      "통합신청서",
      "서류",
    ],
    content: {
      ko: "출입국관리법 시행규칙 제76조는 사증발급 등 신청의 체류자격별 첨부서류를 별표 5와 별표 5의2로 연결합니다. 별표 5의2는 체류자격외활동, 근무처 변경·추가, 체류자격부여, 체류자격변경, 체류기간연장, 외국인등록 등 국내 체류 민원의 신청구분별 첨부서류를 정합니다. 해외 발급 서류는 국가·문서별로 아포스티유 또는 영사확인, 번역·공증 필요 여부를 확인해야 하며, 담당 공무원은 심사 중 추가 자료를 요구할 수 있습니다.",
      vi: "Điều 76 của Quy tắc thi hành liên kết hồ sơ đính kèm theo từng tư cách lưu trú với Phụ lục 5 và 5-2. Phụ lục 5-2 quy định hồ sơ cho hoạt động ngoài tư cách, thay đổi/thêm nơi làm việc, cấp tư cách, thay đổi tư cách, gia hạn và đăng ký người nước ngoài. Tài liệu cấp ở nước ngoài có thể cần apostille hoặc xác nhận lãnh sự, dịch/công chứng, và cơ quan xét duyệt có thể yêu cầu bổ sung.",
      mn: "Хэрэгжүүлэх дүрмийн 76 дугаар зүйл нь виз болон оршин суух өргөдлийн хавсаргах материалыг 5 болон 5-2 дугаар хавсралтад холбодог. 5-2 хавсралт нь нэмэлт үйл ажиллагаа, ажлын байр өөрчлөх, ангилал олгох/өөрчлөх, хугацаа сунгах, гадаад иргэний бүртгэлийн материалыг тогтооно. Гадаадад олгосон баримтад апостиль эсвэл консулын баталгаа, орчуулга/нотариат шаардагдаж болно.",
      en: "Article 76 of the Enforcement Rule links visa and stay petition attachments to Tables 5 and 5-2. Table 5-2 covers attachments for outside-status activity, workplace changes/additions, grant of status, change of status, extension of stay, and alien registration. Foreign-issued documents may require apostille or consular confirmation, translation, and notarization, and immigration officers may request additional materials during review.",
    },
    source: "출입국관리법 시행규칙 제76조·별표 5·별표 5의2",
  },
  {
    id: "immigration-rule-fees",
    category: "cost",
    title: {
      ko: "사증·체류 민원 수수료의 법령 근거",
      vi: "Căn cứ pháp luật về lệ phí visa/lưu trú",
      mn: "Виз, оршин суух өргөдлийн хураамжийн эрх зүйн үндэс",
      en: "Legal basis for visa and stay petition fees",
    },
    keywords: [
      "수수료",
      "비자 수수료",
      "체류자격 변경 수수료",
      "체류기간 연장 수수료",
      "제71조",
      "제72조",
      "fee",
      "cost",
    ],
    content: {
      ko: "출입국관리법 시행규칙 제71조는 사증발급신청 심사수수료를 단수·복수 및 체류기간 기준으로 정하고, 제72조는 입국·체류 관련 각종 허가 수수료를 정합니다. 체류자격외활동, 근무처 변경·추가, 체류자격부여, 체류자격 변경, 체류기간 연장, 외국인등록증 발급·재발급 등의 수수료가 항목별로 구분됩니다. 실제 납부액은 전자민원 여부, 감면, 국적·상호주의, 고시 변경에 따라 달라질 수 있으므로 접수 전 최신 금액을 확인해야 합니다.",
      vi: "Điều 71 của Quy tắc thi hành quy định phí xét visa theo loại visa và thời hạn lưu trú; Điều 72 quy định phí cho các loại phép liên quan nhập cảnh/lưu trú. Các khoản như hoạt động ngoài tư cách, thay đổi/thêm nơi làm việc, cấp tư cách, thay đổi tư cách, gia hạn và cấp/cấp lại thẻ đăng ký được tách riêng. Số tiền thực tế có thể thay đổi theo nộp online, miễn giảm, quốc tịch/nguyên tắc tương hỗ hoặc thông báo mới.",
      mn: "Хэрэгжүүлэх дүрмийн 71 дүгээр зүйл нь визийн хураамжийг, 72 дугаар зүйл нь хил нэвтрэх болон оршин суух зөвшөөрлийн хураамжийг тогтоодог. Нэмэлт үйл ажиллагаа, ажлын байр өөрчлөх/нэмэх, ангилал олгох/өөрчлөх, хугацаа сунгах, бүртгэлийн карт олгох/дахин олгох зэрэг нь тусдаа. Бодит дүн нь цахим өргөдөл, хөнгөлөлт, харилцан зарчим, шинэ мэдэгдлээс хамаарна.",
      en: "Article 71 of the Enforcement Rule sets visa-application examination fees by visa type and stay period, while Article 72 sets fees for entry and stay permits. Outside-status activity, workplace change/addition, grant or change of status, extension of stay, and alien registration card issuance/reissuance are separate fee categories. Actual payment can vary by e-application, exemption, nationality/reciprocity, or updated notices.",
    },
    source: "출입국관리법 시행규칙 제71조·제72조",
  },
  {
    id: "immigration-law-violation-risk",
    category: "warning",
    title: {
      ko: "체류자격 위반·불법취업·허위서류 위험",
      vi: "Rủi ro vi phạm tư cách lưu trú, làm việc trái phép và hồ sơ giả",
      mn: "Ангилал зөрчих, зөвшөөрөлгүй ажил, хуурамч баримтын эрсдэл",
      en: "Risk of status violation, unauthorized work, and false documents",
    },
    keywords: [
      "불법취업",
      "무허가 취업",
      "체류자격 위반",
      "허위서류",
      "강제퇴거",
      "입국금지",
      "제18조",
      "제46조",
      "illegal work",
      "fake documents",
      "deportation",
    ],
    content: {
      ko: "외국인은 허가된 체류자격과 활동범위를 벗어나 취업하거나 활동하면 체류자격 위반 문제가 발생할 수 있습니다. 취업활동은 취업 가능한 체류자격 또는 별도 허가 구조를 먼저 확인해야 하며, D-2/D-4 유학생의 시간제취업도 허가·신고 요건을 별도로 봐야 합니다. 허위서류, 허위초청, 무허가 취업, 체류기간 도과 등은 사안에 따라 강제퇴거, 입국금지, 형사처벌 또는 과태료·범칙금으로 이어질 수 있으므로 KAXI는 불법 요청을 거절하고 합법 준비 경로만 안내합니다.",
      vi: "Nếu người nước ngoài làm việc hoặc hoạt động ngoài phạm vi tư cách lưu trú đã được phép, có thể phát sinh vi phạm. Hoạt động có thu nhập phải kiểm tra tư cách được làm việc hoặc giấy phép riêng; làm thêm của D-2/D-4 cũng cần kiểm tra điều kiện giấy phép/thông báo. Hồ sơ giả, mời giả, làm việc không phép hoặc quá hạn có thể dẫn đến trục xuất, cấm nhập cảnh, xử phạt hình sự hoặc tiền phạt tùy vụ việc.",
      mn: "Гадаад иргэн зөвшөөрөгдсөн ангилал, үйл ажиллагааны хүрээнээс гадуур ажиллавал зөрчил болно. Ажил хийхийн өмнө ажиллах боломжтой ангилал эсвэл тусгай зөвшөөрлийг шалгана; D-2/D-4 оюутны цагийн ажил ч тусдаа нөхцөлтэй. Хуурамч баримт, хуурамч урилга, зөвшөөрөлгүй ажил, хугацаа хэтрүүлэх нь албадан гаргах, нэвтрэх хориг, эрүүгийн хариуцлага, торгуульд хүргэж болно.",
      en: "A foreign national who works or acts outside the permitted stay status and activity scope can face a status-violation issue. Work requires a work-authorized status or separate permission, and D-2/D-4 student part-time work has its own permission/reporting conditions. False documents, false invitations, unauthorized work, and overstay can lead to deportation, entry bans, criminal penalties, or administrative fines depending on the case.",
    },
    source: "출입국관리법 제46조 및 위반 제재",
  },
  {
    id: "d-4-to-d-2-transfer",
    category: "process",
    title: {
      ko: "D-4 → D-2 전환 절차",
      vi: "Chuyển visa D-4 → D-2",
      mn: "D-4 → D-2 шилжих",
      en: "D-4 to D-2 transfer",
    },
    keywords: ["전환", "transfer", "chuyển", "шилжих", "d-4에서 d-2", "change visa", "체류자격 변경", "status change"],
    content: {
      ko: "어학당 수료 후 학위과정 진학시 체류자격 변경(D-4→D-2) 신청이 필요합니다. 학교 합격통지서, 표준입학허가서, TOPIK 4급 이상 증빙, 재학증명서, 재적증명서를 출입국관리사무소에 제출합니다. 심사는 2~4주 소요됩니다. 국외여행허가를 받지 않고 출국시 변경 신청이 취소될 수 있으므로 주의가 필요합니다.",
      vi: "Học xong tiếng → ĐH cần đổi visa D-4 sang D-2. Nộp: giấy báo đậu, TOPIK 4+, giấy nhập học. 2-4 tuần. Không đi nước ngoài không phép.",
      mn: "Хэл төгсөөд их сургуульд орох D-4 → D-2 шилжих. Элсэлтийн зөвшөөрөл, TOPIK 4+ шаардлагатай. 2-4 долоо хоног. Зөвшөөрөлгүй гадагшаа явахыг хоригдоно.",
      en: "After language program → degree program: change D-4 to D-2. Submit: admission letter, TOPIK 4+, school cert. Takes 2-4 weeks. Don't leave without travel permit.",
    },
    source: "출입국관리사무소 체류자격 변경 안내",
  },
  {
    id: "hikorea-integrated-status-manual",
    category: "visa",
    title: {
      ko: "하이코리아 체류자격별 통합 안내 매뉴얼",
      vi: "Sổ tay HiKorea theo từng tư cách lưu trú",
      mn: "HiKorea оршин суух ангиллын нэгдсэн гарын авлага",
      en: "HiKorea integrated stay-status manual",
    },
    keywords: [
      "hikorea",
      "하이코리아",
      "체류자격별",
      "통합 안내 매뉴얼",
      "사증민원",
      "체류민원",
      "manual",
      "visa status",
      "stay status",
      "d-2",
      "d-4",
      "d-10",
      "e-7",
      "f-2",
      "f-5",
      "1345",
    ],
    content: {
      ko: "하이코리아는 체류자격별 통합 안내 매뉴얼을 통해 사증 및 체류 민원의 신청대상과 필요서류를 안내합니다. 이 매뉴얼은 지침 변경 시 수정되지만 업로드에 시간이 걸릴 수 있으므로, 최신 지침에 따른 정확한 상담은 1345 또는 방문예약 후 관할 출입국외국인관서 확인이 필요합니다. KAXI는 D-2, D-4, D-10, E-7, F-2, F-5 질의에서 출입국관리법·시행령·시행규칙 근거를 먼저 확인하고, 이 문서는 운영 서류·절차 보조 근거로 사용합니다.",
      vi: "HiKorea công bố sổ tay theo từng tư cách lưu trú để hướng dẫn đối tượng nộp và hồ sơ cần thiết cho visa/lưu trú. Tài liệu được cập nhật khi hướng dẫn thay đổi, nhưng có thể chậm đăng tải; vì vậy cần xác nhận qua 1345 hoặc văn phòng xuất nhập cảnh có thẩm quyền. KAXI kiểm tra Luật, Nghị định và Quy tắc thi hành trước, rồi dùng tài liệu này làm căn cứ nghiệp vụ bổ trợ.",
      mn: "HiKorea нь виз болон оршин суух өргөдлийн ангилал бүрийн хамрах хүрээ, бүрдүүлэх материалыг нэгдсэн гарын авлагаар тайлбарладаг. Журам өөрчлөгдвөл шинэчилдэг боловч нийтлэх хугацаа хоцорч болох тул 1345 эсвэл харьяа цагаачлалын байгууллагаар баталгаажуулах шаардлагатай. KAXI нь эхлээд хууль, хэрэгжүүлэх журам, дүрмийг шалгаж, энэ эх сурвалжийг ажиллагааны туслах үндэслэл болгон ашиглана.",
      en: "HiKorea publishes an integrated manual by stay status for visa and residence petitions, covering applicant scope and required documents. The manual is updated when rules change, but publication can lag, so current case advice should be checked through 1345 or the competent immigration office. KAXI checks the Immigration Act, Enforcement Decree, and Enforcement Rule first, then uses this manual as operational document/procedure guidance.",
    },
    source: "HiKorea · 체류자격별 통합 안내 매뉴얼",
  },
  {
    id: "hikorea-d2-d4-d10-e7-f2-f5-requirements",
    category: "visa",
    title: {
      ko: "D-2/D-4/D-10/E-7/F-2/F-5 체류 요건 확인 원칙",
      vi: "Nguyên tắc kiểm tra điều kiện D-2/D-4/D-10/E-7/F-2/F-5",
      mn: "D-2/D-4/D-10/E-7/F-2/F-5 нөхцөл шалгах зарчим",
      en: "D-2/D-4/D-10/E-7/F-2/F-5 requirement check policy",
    },
    keywords: [
      "d-2",
      "d2",
      "d-4",
      "d4",
      "d-10",
      "d10",
      "e-7",
      "e7",
      "f-2",
      "f2",
      "f-5",
      "f5",
      "유학",
      "어학연수",
      "구직",
      "특정활동",
      "거주",
      "영주",
      "변경",
      "연장",
    ],
    content: {
      ko: "체류자격별 판단은 현재 체류자격, 목표 체류자격, 활동 목적, 학교/고용/소득/체류기간/위반 이력에 따라 달라집니다. 먼저 출입국관리법상 체류자격·활동범위와 시행령 별표의 D-2, D-4, D-10, E-7, F-2, F-5 분류를 확인한 뒤, 하이코리아 체류자격별 매뉴얼로 신청대상·첨부서류·변경/연장 가능성을 보조 확인해야 합니다. 불명확하면 사용자의 현재 자격, 만료일, 학교명 또는 고용조건, 예산/재정증빙을 먼저 물어봅니다.",
      vi: "Đánh giá tư cách lưu trú phụ thuộc vào tư cách hiện tại, tư cách muốn chuyển, mục đích hoạt động, trường học/việc làm/thu nhập/thời hạn lưu trú và lịch sử vi phạm. D-2 là du học cấp bằng, D-4 là đào tạo/ngôn ngữ, D-10 là tìm việc/chuẩn bị khởi nghiệp, E-7 là hoạt động chuyên môn, F-2 là cư trú, F-5 là vĩnh trú. Khi thiếu thông tin, cần hỏi tư cách hiện tại, ngày hết hạn, trường hoặc điều kiện tuyển dụng, ngân sách/chứng minh tài chính.",
      mn: "Оршин суух ангиллын үнэлгээ нь одоогийн ангилал, хүсэж буй ангилал, үйл ажиллагааны зорилго, сургууль/ажил/орлого/хугацаа/зөрчлийн түүхээс хамаарна. D-2 нь зэрэг олгох сургалт, D-4 нь хэлний болон сургалтын хөтөлбөр, D-10 нь ажил хайх/стартап бэлтгэл, E-7 нь тусгай мэргэжлийн ажил, F-2 нь оршин суух, F-5 нь байнгын оршин суух ангилал. Мэдээлэл дутуу бол одоогийн ангилал, дуусах огноо, сургууль/ажлын нөхцөл, санхүүгийн нотолгоог асууна.",
      en: "Stay-status evaluation depends on current status, target status, activity purpose, school/employment/income, remaining stay period, and violation history. D-2 covers degree study, D-4 training/language programs, D-10 job seeking or startup preparation, E-7 professional/specific activities, F-2 residence, and F-5 permanent residence. If facts are missing, ask for current status, expiry date, school or employment conditions, and budget/financial proof before answering.",
    },
    source: "HiKorea · 체류자격별 통합 안내 매뉴얼",
  },
  {
    id: "hikorea-stay-extension",
    category: "process",
    title: {
      ko: "하이코리아 체류기간 연장 기준",
      vi: "Gia hạn thời gian lưu trú trên HiKorea",
      mn: "HiKorea оршин суух хугацаа сунгах",
      en: "HiKorea stay extension guidance",
    },
    keywords: ["체류기간연장", "연장", "extension", "gia hạn", "сунгах", "만료일", "expiry", "범칙금", "overstay"],
    content: {
      ko: "체류기간을 초과해 계속 체류하려는 외국인은 체류기간연장허가를 받아야 합니다. 하이코리아 안내 기준으로 연장 신청은 현재 체류기간 만료 전 4개월부터 만료 당일까지 가능하며, 만료일 이후 신청하면 범칙금이 부과될 수 있습니다. 기본 제출 축은 체류기간연장허가 신청서, 여권, 해당자의 외국인등록증, 체류자격별 첨부서류, 수수료입니다. 해외 체류 중 민원신청이나 대리 신청은 불가할 수 있으므로 신청 당일 국내 체류 여부를 확인합니다.",
      vi: "Người muốn ở quá thời hạn đã được cho phép phải xin gia hạn. Theo HiKorea, có thể nộp từ 4 tháng trước ngày hết hạn đến đúng ngày hết hạn; nộp sau hạn có thể bị phạt. Hồ sơ cơ bản gồm đơn gia hạn, hộ chiếu, thẻ đăng ký người nước ngoài nếu có, tài liệu theo tư cách lưu trú và phí. Cần kiểm tra người nộp có đang ở Hàn Quốc vào ngày nộp hay không.",
      mn: "Зөвшөөрөгдсөн хугацаанаас цааш байх бол хугацаа сунгах зөвшөөрөл авах ёстой. HiKorea-ийн дагуу дуусахаас 4 сарын өмнөөс дуусах өдөр хүртэл хүсэлт гаргаж болно; хугацаа өнгөрвөл торгууль гарах эрсдэлтэй. Үндсэн материал нь сунгах өргөдөл, паспорт, гадаад иргэний бүртгэлийн карт, ангиллын нэмэлт материал, хураамж.",
      en: "A foreign national who wants to stay beyond the permitted period must obtain stay-extension permission. HiKorea states that extension can be filed from four months before expiry through the expiry date, and late filing can trigger penalties. The core packet is an extension application, passport, alien registration card if applicable, status-specific attachments, and fee. Confirm the applicant is in Korea on the filing date.",
    },
    source: "HiKorea · 체류기간연장 안내",
  },
  {
    id: "hikorea-status-change",
    category: "process",
    title: {
      ko: "하이코리아 체류자격 변경 기준",
      vi: "Thay đổi tư cách lưu trú trên HiKorea",
      mn: "HiKorea оршин суух ангилал өөрчлөх",
      en: "HiKorea status-change guidance",
    },
    keywords: ["체류자격변경", "자격 변경", "status change", "change of status", "chuyển visa", "өөрчлөх", "d-4 to d-2", "d-10", "e-7"],
    content: {
      ko: "현재 체류자격의 활동을 중지하고 다른 체류자격 활동을 하려는 경우 체류자격변경허가가 필요합니다. 하이코리아는 원칙적으로 출국 후 해당 체류자격 사증을 받아 입국해야 하며, 국내에서 변경 요건을 갖출 수 있는 경우 엄격한 심사를 거쳐 제한적으로 변경할 수 있다고 안내합니다. 변경하려는 활동을 시작하기 전 관할 출입국외국인관서에서 허가를 받아야 하며, 제출서류는 목표 체류자격별 매뉴얼로 확인합니다.",
      vi: "Khi dừng hoạt động theo tư cách hiện tại và muốn hoạt động theo tư cách khác, cần xin phép thay đổi tư cách lưu trú. HiKorea nêu nguyên tắc là ra khỏi Hàn Quốc, nhận visa phù hợp rồi nhập cảnh lại; chỉ một số trường hợp đủ điều kiện trong nước mới được xét nghiêm ngặt. Phải xin phép trước khi bắt đầu hoạt động mới.",
      mn: "Одоогийн ангиллын үйл ажиллагааг зогсоож өөр ангиллын үйл ажиллагаа хийх бол ангилал өөрчлөх зөвшөөрөл хэрэгтэй. HiKorea-ийн үндсэн зарчим нь гадагш гарч тохирох виз авч дахин орох; харин Солонгост шаардлага хангаж чадвал хатуу шалгалтаар хязгаарлагдмал өөрчлөлт зөвшөөрнө. Шинэ үйл ажиллагааг эхлэхээс өмнө зөвшөөрөл авна.",
      en: "If the applicant stops the current status activity and begins an activity under another status, change-of-status permission is required. HiKorea states the default principle is to depart, obtain the appropriate visa, and re-enter; domestic change is limited and strictly reviewed when requirements can be met in Korea. Permission must be obtained before starting the new activity.",
    },
    source: "HiKorea · 체류자격변경 안내",
  },
  {
    id: "hikorea-activity-permit",
    category: "process",
    title: {
      ko: "체류자격외활동 및 유학생 시간제취업",
      vi: "Hoạt động ngoài tư cách lưu trú và làm thêm của du học sinh",
      mn: "Оршин суух ангиллаас гадуурх үйл ажиллагаа ба оюутны цагийн ажил",
      en: "Activities outside status and student part-time work",
    },
    keywords: ["체류자격외활동", "시간제취업", "part-time", "s-3", "d-2", "d-4-1", "아르바이트", "làm thêm", "ажил"],
    content: {
      ko: "현재 체류자격을 유지하면서 다른 체류자격에 해당하는 활동을 병행하려면 사전에 체류자격외활동허가를 받아야 합니다. 하이코리아 전자민원에는 유학생(D-2) 및 어학연수생(D-4-1) 시간제취업 허가/신고 메뉴가 별도로 제공됩니다. 병행 활동이 전일 근무 등 주된 활동이 되는 경우 체류자격외활동이 아니라 출국 후 새 사증 또는 체류자격변경 검토 대상입니다. KAXI는 취업 매칭을 하지 않고 허가 필요 여부만 안내합니다.",
      vi: "Nếu vừa giữ tư cách hiện tại vừa làm hoạt động thuộc tư cách khác, cần xin phép hoạt động ngoài tư cách trước. HiKorea có mục riêng cho giấy phép/thông báo làm thêm của du học sinh D-2 và học tiếng D-4-1. Nếu hoạt động đó trở thành công việc chính toàn thời gian, cần xem xét visa mới hoặc thay đổi tư cách, không chỉ xin hoạt động phụ.",
      mn: "Одоогийн ангиллаа хадгалж өөр ангиллын үйл ажиллагааг зэрэг хийх бол урьдчилан зөвшөөрөл авна. HiKorea цахим өргөдөлд D-2 оюутан болон D-4-1 хэлний суралцагчийн цагийн ажлын зөвшөөрөл/мэдэгдлийн цэс тусдаа байдаг. Бүтэн цагийн үндсэн ажил бол нэмэлт үйл ажиллагаа биш, шинэ виз эсвэл ангилал өөрчлөх асуудал болно.",
      en: "A foreign national who keeps the current stay status but also performs an activity under another status needs prior permission for activities outside status. HiKorea provides separate e-application items for part-time work permission/reporting for D-2 students and D-4-1 language trainees. If the activity becomes full-time or primary, review a new visa or status change instead. KAXI does not match jobs; it only flags permit requirements.",
    },
    source: "HiKorea · 체류자격외활동 안내",
  },
  {
    id: "hikorea-forms-document-checklist",
    category: "documents",
    title: {
      ko: "하이코리아 민원서식 및 제출서류 체크리스트",
      vi: "Biểu mẫu HiKorea và danh sách hồ sơ",
      mn: "HiKorea маягт ба бүрдүүлэх материалын жагсаалт",
      en: "HiKorea forms and document checklist",
    },
    keywords: ["민원서식", "통합신청서", "제출서류", "checklist", "forms", "application form", "신원보증서", "시간제취업 확인서", "유학생현황"],
    content: {
      ko: "하이코리아 민원서식 목록에는 통합신청서(신고서), 신원보증서, 유학생현황, 어학연수생현황, 외국인유학(어학연수)생 시간제취업 확인서 등 체류 민원에 쓰이는 양식이 제공됩니다. KAXI의 서류 체크리스트는 이 서식 목록과 체류자격별 매뉴얼을 함께 근거로 삼아야 하며, 사용자에게는 원본/사본, 번역, 공증, 아포스티유 또는 영사확인 필요 여부를 별도 확인하도록 안내합니다.",
      vi: "Danh mục biểu mẫu HiKorea cung cấp các mẫu dùng cho lưu trú như đơn tổng hợp, giấy bảo lãnh, danh sách du học sinh/học tiếng và xác nhận làm thêm của du học sinh. Checklist của KAXI phải kết hợp danh mục biểu mẫu này với sổ tay theo từng tư cách lưu trú, đồng thời yêu cầu kiểm tra bản gốc/bản sao, dịch thuật, công chứng, apostille hoặc xác nhận lãnh sự.",
      mn: "HiKorea-ийн маягтын жагсаалтад нэгдсэн өргөдөл/мэдэгдэл, батлан даалтын бичиг, оюутан/хэлний суралцагчийн жагсаалт, оюутны цагийн ажлын баталгааны маягт зэрэг орно. KAXI-ийн материалын жагсаалт энэ маягт болон ангиллын гарын авлагыг хамтад нь ашиглаж, эх хувь/хуулбар, орчуулга, нотариат, апостиль эсвэл консулын баталгааг тусад нь шалгуулна.",
      en: "HiKorea's forms list provides stay-petition forms such as the integrated application/report form, letter of guarantee, international student and language trainee lists, and student part-time work confirmation. KAXI document checklists should combine this forms list with the status-specific manual and ask users to separately verify original/copy, translation, notarization, apostille, or consular confirmation needs.",
    },
    source: "HiKorea · 민원서식",
  },
  {
    id: "hikorea-online-visit-application",
    category: "process",
    title: {
      ko: "전자민원·방문예약 절차",
      vi: "Thủ tục e-application và đặt lịch thăm",
      mn: "Цахим өргөдөл ба айлчлалын цаг захиалга",
      en: "E-application and visit reservation process",
    },
    keywords: ["전자민원", "방문예약", "예약", "online application", "visit reservation", "민원신청", "체류기간연장", "체류자격 변경", "출입국"],
    content: {
      ko: "하이코리아 전자민원은 평일 운영 시간 내 온라인 민원 선택, 인증, 민원작성, 신청결과 확인 흐름으로 제공됩니다. 전자민원 항목에는 등록외국인의 체류기간연장허가, 등록외국인의 체류자격 변경허가, 유학생(D-2) 및 어학연수생(D-4-1) 시간제취업 허가/신고 등이 포함됩니다. 심사를 위해 출석 요구나 실태조사가 있을 수 있고, 심사 완료 전 담당자 연락 없이 출국하면 심사가 종결될 수 있으므로 방문예약/전자민원 가능 여부와 국내 체류 여부를 먼저 확인합니다.",
      vi: "E-application trên HiKorea đi theo luồng chọn loại đơn, xác thực, điền đơn và kiểm tra kết quả trong giờ vận hành. Các mục gồm gia hạn lưu trú cho người đã đăng ký, thay đổi tư cách lưu trú, giấy phép/thông báo làm thêm cho D-2/D-4-1. Có thể bị yêu cầu có mặt hoặc kiểm tra thực tế; nếu rời Hàn Quốc trước khi xét xong mà không liên hệ, hồ sơ có thể kết thúc.",
      mn: "HiKorea цахим өргөдөл нь ажлын цагт өргөдөл сонгох, баталгаажуулах, бөглөх, үр дүн шалгах урсгалтай. Үүнд бүртгэлтэй гадаадын иргэний хугацаа сунгах, ангилал өөрчлөх, D-2/D-4-1 цагийн ажлын зөвшөөрөл/мэдэгдэл багтана. Шалгалтын явцад ирэх шаардлага эсвэл бодит шалгалт байж болох ба дуусахаас өмнө мэдэгдэлгүй гарвал хэрэг хаагдаж болно.",
      en: "HiKorea e-application follows a flow of selecting a petition, authentication, form completion, and result check during operating hours. Items include extension of stay for registered foreigners, change of stay status, and part-time work permission/reporting for D-2 and D-4-1 students. Immigration may request appearance or field checks, and leaving Korea before review completion without contacting the officer can close the review.",
    },
    source: "HiKorea · 전자민원",
  },
  {
    id: "hikorea-fees-processing-authentication",
    category: "cost",
    title: {
      ko: "수수료·처리기간·원본/번역/아포스티유 확인",
      vi: "Phí, thời gian xử lý, bản gốc/dịch thuật/apostille",
      mn: "Хураамж, шийдвэрлэх хугацаа, эх хувь/орчуулга/апостиль",
      en: "Fees, processing time, originals, translation, and apostille",
    },
    keywords: ["수수료", "처리기간", "원본", "번역", "공증", "아포스티유", "영사확인", "fee", "processing time", "apostille", "translation"],
    content: {
      ko: "하이코리아의 연장·변경·자격외활동 안내는 신청서, 여권, 외국인등록증, 체류자격별 첨부서류, 수수료를 기본 확인 축으로 제시합니다. 실제 수수료와 처리기간은 민원 종류, 관할관서, 전자민원 가능 여부, 추가 심사·실태조사 여부에 따라 달라질 수 있습니다. 해외 발급 서류는 원본 제출, 번역, 공증, 아포스티유 또는 영사확인이 필요한지 국가·문서별로 다르므로 접수 전 관할관서 또는 1345 확인을 권장합니다.",
      vi: "Hướng dẫn HiKorea về gia hạn, thay đổi tư cách và hoạt động ngoài tư cách thường kiểm tra đơn, hộ chiếu, thẻ đăng ký người nước ngoài, tài liệu theo tư cách và phí. Phí và thời gian xử lý thực tế thay đổi theo loại hồ sơ, văn phòng có thẩm quyền, khả năng nộp online và việc kiểm tra bổ sung. Tài liệu cấp ở nước ngoài có thể cần bản gốc, dịch, công chứng, apostille hoặc xác nhận lãnh sự tùy quốc gia/tài liệu.",
      mn: "HiKorea-ийн сунгалт, ангилал өөрчлөх, нэмэлт үйл ажиллагааны заавар нь өргөдөл, паспорт, гадаад иргэний бүртгэлийн карт, ангиллын хавсралт, хураамжийг үндсэн шалгалт болгодог. Бодит хураамж ба шийдвэрлэх хугацаа нь өргөдлийн төрөл, харьяа байгууллага, цахимаар болох эсэх, нэмэлт шалгалтаас хамаарна. Гадаадад олгосон баримт эх хувь, орчуулга, нотариат, апостиль эсвэл консулын баталгаа шаардаж болно.",
      en: "HiKorea guidance for extension, status change, and outside-status activity uses the application form, passport, alien registration card, status-specific attachments, and fee as the core filing checks. Actual fee and processing time vary by petition type, competent office, e-application availability, and additional review or field checks. Foreign-issued documents may need originals, translation, notarization, apostille, or consular confirmation depending on country and document.",
    },
    source: "HiKorea · 출입국/체류안내",
  },
  {
    id: "hikorea-policy-notice-monitor",
    category: "warning",
    title: {
      ko: "정책 변경성 공지 모니터링",
      vi: "Theo dõi thông báo thay đổi chính sách",
      mn: "Бодлогын өөрчлөлтийн мэдэгдэл хянах",
      en: "Policy-change notice monitoring",
    },
    keywords: ["공지사항", "정책 변경", "manual", "변경 알림", "hwp", "육성형 전문기술인력", "e-7", "d-10", "notice", "policy"],
    content: {
      ko: "하이코리아 공지사항에는 체류·사증 관리 매뉴얼, 전자팩스 신고대상 변경, 특정 제도 시행 등 정책 변경성 문서가 게시됩니다. KAXI 자동 크롤링은 공지 제목·첨부파일·게시일의 diff 감지만 수행하고, production RAG 반영은 관리자 승인 후에만 해야 합니다. 예를 들어 육성형 전문기술인력 제도처럼 D-10·E-7 계열에 영향을 줄 수 있는 문서는 관련 compliance rule과 기존 사용자 질의 로그의 영향 목록을 산출해야 합니다.",
      vi: "Thông báo HiKorea có thể chứa tài liệu thay đổi chính sách như sổ tay quản lý visa/lưu trú, thay đổi kênh fax điện tử hoặc chế độ mới. Crawler của KAXI chỉ nên phát hiện diff về tiêu đề, tệp đính kèm và ngày đăng; chỉ đưa vào production RAG sau khi admin phê duyệt. Tài liệu có thể ảnh hưởng D-10/E-7 phải sinh danh sách rule và người dùng bị ảnh hưởng.",
      mn: "HiKorea мэдэгдэлд виз/оршин суух удирдлагын гарын авлага, цахим факсын өөрчлөлт, шинэ тогтолцооны хэрэгжилт зэрэг бодлогын өөрчлөлт нийтлэгдэж болно. KAXI автомат crawler нь зөвхөн гарчиг, хавсралт, нийтэлсэн огнооны ялгааг илрүүлж, production RAG-д зөвхөн админ баталсны дараа оруулна. D-10/E-7-д нөлөөлөх баримт нь rule болон хэрэглэгчийн нөлөөллийн жагсаалт гаргана.",
      en: "HiKorea notices can publish policy-changing documents such as visa/stay management manuals, e-fax filing changes, and new program rollouts. KAXI automation should only detect diffs in notice title, attachment, and posted date; production RAG updates require admin approval. Documents that may affect D-10 or E-7, such as skill-development professional workforce manuals, should produce impacted compliance-rule and user-query lists.",
    },
    source: "HiKorea · 공지사항",
  },
  {
    id: "broker-redflags",
    category: "warning",
    title: {
      ko: "브로커 위험 신호 체크리스트",
      vi: "Dấu hiệu môi giới rủi ro",
      mn: "Зуучлагчийн эрсдэлийн дохио",
      en: "Broker red flag checklist",
    },
    keywords: ["브로커", "broker", "môi giới", "зуучлагч", "위험", "red flag", "신호", "warning", "체크리스트", "checklist"],
    content: {
      ko: "브로커 위험 신호: 1) 비용을 항목별로 설명하지 않고 총액만 말함. 2) 비자 100% 보장 약속. 3) 허위 잔고증명·허위 서류 제공 제안. 4) 불법취업 알선. 5) 계약서 없이 현금만 요구. 6) 학교 직원인 척 하며 특정 학교 강요. 7) 비용이 공식 예상보다 30% 이상 높음. 8) SNS·지인 통한 사적 연락만. 이런 신호가 있으면 KAXI 비용 계산기로 항목별 비교 후 행정사 상담을 권장합니다.",
      vi: "Dấu hiệu môi giới rủi ro: 1) Chỉ báo tổng, không rõ từng mục. 2) Bảo đảm 100% visa. 3) Đề nghị sổ giả. 4) Giới thiệu việc bất hợp pháp. 5) Tiền mặt, không hợp đồng. 6) Ép chọn trường. 7) Cao hơn 30% thực tế. 8) Liên lạc qua SNS. Nếu thấy → so sánh phí + gặp luật sư.",
      mn: "Зуучлагчийн эрсдэлийн дохио: 1) Зөвхөн нийт дүн, задлахгүй. 2) Виз 100% баталгаа. 3) Хуурамч баримт санал. 4) Хууль бус ажил. 5) Бэлэн мөнгө, гэрээгүй. 6) Сургуулийн ажилтан дүр эсвэл албадах. 7) Бодит зардал 30%+ өндөр. 8) Зөвхөн SNS-ээр холбоо. → Харьцуулж, зөвлөгөө авна.",
      en: "Broker red flags: 1) Total only, no itemization. 2) 100% visa guarantee. 3) Offers fake docs. 4) Illegal job matching. 5) Cash only, no contract. 6) Forces specific school, pretends school staff. 7) 30%+ over official estimate. 8) Private SNS contact only. → Compare items, consult lawyer.",
    },
    source: "KAXI 안전 가이드라인",
  },
];

// 간단한 키워드 매칭 기반 retrieval (레거시 — vector-store.ts의 hybridSearch 사용 권장)
// (운영시 Vector DB로 교체, 현재는 키워드 점수로 충분)
// @deprecated Use hybridSearch from ../embeddings/vector-store instead
export function retrieveDocs(query: string, topK = 3): KnowledgeDoc[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const searchableDocs = getKnowledgeDocsWithMetadata();
  const scored = searchableDocs.map((doc) => {
    let score = 0;
    const words = q.split(/\s+/);
    for (const keyword of doc.keywords) {
      if (q.includes(keyword.toLowerCase())) {
        score += 3;
      }
      for (const w of words) {
        if (w.length > 2 && keyword.toLowerCase().includes(w)) {
          score += 1;
        }
      }
    }
    // 제목 매칭 가중치
    for (const lang of ["ko", "vi", "mn", "en"] as Lang[]) {
      const title = doc.title[lang].toLowerCase();
      for (const w of words) {
        if (w.length > 2 && title.includes(w)) {
          score += 2;
        }
      }
    }
    return { doc, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.doc);
}

export function pickLangText(
  obj: { ko: string; vi: string; mn: string; en: string },
  lang: Lang
): string {
  return obj[lang] ?? obj.en;
}
