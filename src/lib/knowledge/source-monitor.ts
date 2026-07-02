import { createHash } from "crypto";
import { db } from "../db";
import {
  analyzeKnowledgeDocumentDiff,
  upsertPendingKnowledgeCandidate,
  type KnowledgeDiffSummary,
} from "./repository";
import type { KnowledgeDoc, SourceType } from "../data/knowledge";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface OfficialKnowledgeSource {
  docId: string;
  title: string;
  sourceUrl: string;
  sourceType: SourceType;
  topic: KnowledgeDoc["category"];
  language?: string;
  jurisdiction?: "KR" | "KAXI";
  legalPriority?: 1 | 2 | 3 | 4;
  monitorCadence?: "daily" | "weekly" | "monthly";
  changeSignals?: string[];
}

export interface OfficialKnowledgeMonitorResult {
  docId: string;
  title: string;
  sourceUrl: string;
  status: "changed" | "unchanged" | "failed";
  contentHash?: string;
  candidateDocId?: string;
  candidatePersisted?: boolean;
  diff?: KnowledgeDiffSummary;
  error?: string;
}

export interface OfficialKnowledgeMonitorSummary {
  checkedAt: string;
  persistCandidates: boolean;
  total: number;
  changed: number;
  unchanged: number;
  failed: number;
  candidatesCreated: number;
  results: OfficialKnowledgeMonitorResult[];
}

const LAW_ACT_URL = "https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=272921";
const LAW_DECREE_URL = "https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=271319";
const LAW_RULE_URL = "https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=283059";
const LAW_RECENT_PROMULGATION_URL =
  "https://www.law.go.kr/LSW/nwRvsLsPop.do?chrIdx=10&cptOfi=&lsKndCd=&lsNm=%EC%B6%9C%EC%9E%85%EA%B5%AD%EA%B4%80%EB%A6%AC%EB%B2%95&p_epubdt=&p_epubno=&p_spubdt=&p_spubno=&searchType=lsNm&sortIdx=0";
const LAW_ACT_EMPLOYMENT_RESTRICTION_URL =
  "https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0018&lsiSeq=272921&urlMode=lsScJoRltInfoR";
const LAW_ACT_OUTSIDE_STATUS_ACTIVITY_URL =
  "https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0020&lsiSeq=272921&urlMode=lsScJoRltInfoR";
const LAW_ACT_WORKPLACE_CHANGE_ADDITION_URL =
  "https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0021&lsiSeq=272921&urlMode=lsScJoRltInfoR";
const LAW_ACT_ACTIVITY_SCOPE_RESTRICTION_URL =
  "https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0022&lsiSeq=272921&urlMode=lsScJoRltInfoR";
const LAW_ACT_STATUS_GRANT_URL =
  "https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0023&lsiSeq=272921&urlMode=lsScJoRltInfoR";
const LAW_ACT_STATUS_CHANGE_URL =
  "https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0024&lsiSeq=272921&urlMode=lsScJoRltInfoR";
const LAW_ACT_STAY_EXTENSION_URL =
  "https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0025&lsiSeq=272921&urlMode=lsScJoRltInfoR";
const LAW_ACT_REENTRY_PERMIT_URL =
  "https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0030&lsiSeq=272921&urlMode=lsScJoRltInfoR";
const LAW_ACT_ALIEN_REGISTRATION_URL =
  "https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0031&lsiSeq=272921&urlMode=lsScJoRltInfoR";
const LAW_ACT_REGISTRATION_CHANGE_REPORT_URL =
  "https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0035&lsiSeq=272921&urlMode=lsScJoRltInfoR";
const LAW_ACT_ADDRESS_CHANGE_REPORT_URL =
  "https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0036&lsiSeq=272921&urlMode=lsScJoRltInfoR";
const LAW_ACT_FALSE_APPLICATION_DOCUMENTS_URL =
  "https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0026&lsiSeq=272921&urlMode=lsScJoRltInfoR";
const LAW_ACT_GENERAL_STAY_STATUS_URL =
  "https://www.law.go.kr/LSW/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=1000817596";
const LAW_ACT_PERMANENT_RESIDENCE_STATUS_URL =
  "https://www.law.go.kr/LSW/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=1000817607";
const LAW_ACT_MARRIAGE_IMMIGRANT_EXTENSION_SPECIAL_URL =
  "https://www.law.go.kr/LSW/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=1000822759";
const LAW_ACT_EMERGENCY_EXTENSION_SPECIAL_URL =
  "https://www.law.go.kr/LSW/lsRvsDocListP.do?chrClsCd=010202&lsId=001707&lsRvsGubun=all";
const LAW_DECREE_SHORT_TERM_STATUS_TABLE_URL =
  "https://www.law.go.kr/LSW/lsBylInfoPLinkR.do?lsiSeq=271319&lsNm=%EC%B6%9C%EC%9E%85%EA%B5%AD%EA%B4%80%EB%A6%AC%EB%B2%95+%EC%8B%9C%ED%96%89%EB%A0%B9&bylNo=0001&bylBrNo=00&bylCls=BE&bylEfYd=20250601&bylEfYdYn=Y";
const LAW_DECREE_LONG_TERM_STATUS_TABLE_URL =
  "https://www.law.go.kr/LSW/lsLawLinkInfo.do?lsJoLnkSeq=1000870036";
const LAW_DECREE_PERMANENT_RESIDENCE_TABLE_URL =
  "https://www.law.go.kr/LSW/lsBylInfoPLinkR.do?lsiSeq=271319&lsNm=%EC%B6%9C%EC%9E%85%EA%B5%AD%EA%B4%80%EB%A6%AC%EB%B2%95+%EC%8B%9C%ED%96%89%EB%A0%B9&bylNo=0001&bylBrNo=03&bylCls=BE&bylEfYd=20250601&bylEfYdYn=Y";
const HIKOREA_HOME_URL = "https://www.hikorea.go.kr/index.html";
const HIKOREA_STATUS_MANUAL_URL =
  "https://www.hikorea.go.kr/board/BoardNtcDetailR.pt?BBS_GB_CD=BS10&BBS_SEQ=1&NTCCTT_SEQ=1062&page=1";
const HIKOREA_NOTICE_URL = "https://www.hikorea.go.kr/board/BoardNtcListR.pt";
const MOJ_MAJOR_NEWS_URL = "https://www.immigration.go.kr/immigration/3341/subview.do";
const MOJ_NOTICE_BOARD_URL = "https://www.immigration.go.kr/moj/223/subview.do";
const MOJ_E7_WAGE_REQUIREMENT_2026_URL =
  "https://www.immigration.go.kr/bbs/moj/184/601893/artclView.do?layout=unknown";
const MOJ_F6_MARRIAGE_VISA_CRITERIA_URL =
  "https://www.immigration.go.kr/bbs/moj/184/601864/artclView.do?layout=unknown";
const MOJ_F4_EMPLOYMENT_RESTRICTION_PREANNOUNCEMENT_URL =
  "https://www.immigration.go.kr/bbs/moj/184/602340/artclView.do?layout=unknown";
const MOJ_SKILLED_WORKER_POINTS_VISA_URL = "https://www.immigration.go.kr/moj/187/subview.do";
const MOJ_SEASONAL_WORKER_PROGRAM_URL = "https://www.immigration.go.kr/moj/194/subview.do";
const MOJ_ONLINE_STAY_VISA_CENTER_URL = "https://www.immigration.go.kr/moj/198/subview.do";
const MOJ_STAY_MANAGEMENT_POLICY_URL = "https://www.immigration.go.kr/immigration/1515/subview.do";
const MOJ_TAX_HEALTH_ARREARS_EXTENSION_URL = "https://www.immigration.go.kr/immigration/1522/subview.do";
const MOJ_SOCIAL_INTEGRATION_PROGRAM_URL = "https://www.immigration.go.kr/moj/369/subview.do";
const MOJ_K_ETA_URL = "https://www.immigration.go.kr/immigration/3339/subview.do";
const MOJ_K_ETA_SCAM_WARNING_URL = "https://www.immigration.go.kr/bbs/immigration/220/597906/artclView.do";
const MOJ_E_ARRIVAL_CARD_URL = "https://www.immigration.go.kr/immigration/3509/subview.do";
const MOJ_E_ARRIVAL_NOTICE_URL =
  "https://www.immigration.go.kr/bbs/immigration/224/592036/artclView.do?layout=unknown";
const MOJ_OFFICE_JURISDICTION_SEOUL_INCHEON_GYEONGGI_URL =
  "https://www.immigration.go.kr/immigration/2057/subview.do";
const MOJ_OFFICE_JURISDICTION_BUSAN_GYEONGNAM_URL =
  "https://www.immigration.go.kr/immigration/2058/subview.do";
const MOJ_OFFICE_JURISDICTION_GWANGJU_JEOLLA_JEJU_URL =
  "https://www.immigration.go.kr/immigration/2059/subview.do";
const MOJ_OFFICE_JURISDICTION_DAEGU_GYEONGBUK_GANGWON_URL =
  "https://www.immigration.go.kr/immigration/2060/subview.do";
const MOJ_OFFICE_JURISDICTION_DAEJEON_CHUNGCHEONG_URL =
  "https://www.immigration.go.kr/immigration/2061/subview.do";
const MOJ_MOBILE_IMMIGRATION_OFFICE_URL =
  "https://www.immigration.go.kr/immigration/2344/subview.do";
const STUDY_IN_KOREA_CERTIFIED_UNIVERSITY_URL =
  "https://studyinkorea.go.kr/ko/plan/certifiedUniversity.do";
const VISA_PORTAL_VISA_TYPES_URL = "https://www.visa.go.kr/openPage.do?LANG_TYPE=EN&MENU_ID=10102";

export const OFFICIAL_KNOWLEDGE_SOURCE_WATCHLIST: OfficialKnowledgeSource[] = [
  {
    docId: "immigration-law-recent-promulgations",
    title: "국가법령정보센터 출입국관리법 최근공포·시행일자",
    sourceUrl: LAW_RECENT_PROMULGATION_URL,
    sourceType: "official_law",
    topic: "legal",
    legalPriority: 1,
    monitorCadence: "daily",
    changeSignals: ["new_promulgation", "effective_date", "law_number", "decree_or_rule_update"],
  },
  {
    docId: "immigration-act-stay-status-scope",
    title: "출입국관리법 체류자격·활동범위",
    sourceUrl: LAW_ACT_URL,
    sourceType: "official_law",
    topic: "legal",
    legalPriority: 1,
    monitorCadence: "daily",
  },
  {
    docId: "immigration-act-permission-matrix",
    title: "출입국관리법 변경·연장·자격외활동 허가 구조",
    sourceUrl: LAW_ACT_URL,
    sourceType: "official_law",
    topic: "legal",
    legalPriority: 1,
    monitorCadence: "daily",
  },
  {
    docId: "immigration-law-violation-risk",
    title: "출입국관리법 위반 제재",
    sourceUrl: LAW_ACT_URL,
    sourceType: "official_law",
    topic: "warning",
    legalPriority: 1,
    monitorCadence: "daily",
  },
  {
    docId: "immigration-act-employment-restriction",
    title: "출입국관리법 제18조 외국인 고용의 제한",
    sourceUrl: LAW_ACT_EMPLOYMENT_RESTRICTION_URL,
    sourceType: "official_law",
    topic: "warning",
    legalPriority: 1,
    monitorCadence: "daily",
    changeSignals: ["employment_restriction", "work_status", "designated_workplace", "employer_ban"],
  },
  {
    docId: "immigration-act-outside-status-activity",
    title: "출입국관리법 제20조 체류자격 외 활동",
    sourceUrl: LAW_ACT_OUTSIDE_STATUS_ACTIVITY_URL,
    sourceType: "official_law",
    topic: "process",
    legalPriority: 1,
    monitorCadence: "daily",
    changeSignals: ["outside_status_activity", "prior_permission", "part_time_work", "d2", "d4"],
  },
  {
    docId: "immigration-act-workplace-change-addition",
    title: "출입국관리법 제21조 근무처 변경·추가",
    sourceUrl: LAW_ACT_WORKPLACE_CHANGE_ADDITION_URL,
    sourceType: "official_law",
    topic: "process",
    legalPriority: 1,
    monitorCadence: "daily",
    changeSignals: ["workplace_change", "workplace_addition", "15_days", "employer_referral_ban"],
  },
  {
    docId: "immigration-act-activity-scope-restriction",
    title: "출입국관리법 제22조 활동범위의 제한",
    sourceUrl: LAW_ACT_ACTIVITY_SCOPE_RESTRICTION_URL,
    sourceType: "official_law",
    topic: "legal",
    legalPriority: 1,
    monitorCadence: "daily",
    changeSignals: ["activity_scope", "residence_restriction", "compliance_conditions", "public_order"],
  },
  {
    docId: "immigration-act-false-application-documents",
    title: "출입국관리법 제26조 허위서류 제출 등의 금지",
    sourceUrl: LAW_ACT_FALSE_APPLICATION_DOCUMENTS_URL,
    sourceType: "official_law",
    topic: "warning",
    legalPriority: 1,
    monitorCadence: "daily",
    changeSignals: ["false_documents", "forged_documents", "application_broker", "permit_application"],
  },
  {
    docId: "immigration-act-general-stay-status",
    title: "출입국관리법 제10조의2 일반체류자격",
    sourceUrl: LAW_ACT_GENERAL_STAY_STATUS_URL,
    sourceType: "official_law",
    topic: "legal",
    legalPriority: 1,
    monitorCadence: "daily",
    changeSignals: ["short_term_status", "long_term_status", "90_days", "activity_scope", "decree_delegation"],
  },
  {
    docId: "immigration-act-permanent-residence-status",
    title: "출입국관리법 제10조의3 영주자격",
    sourceUrl: LAW_ACT_PERMANENT_RESIDENCE_STATUS_URL,
    sourceType: "official_law",
    topic: "legal",
    legalPriority: 1,
    monitorCadence: "daily",
    changeSignals: ["permanent_residence", "f5", "conduct", "livelihood", "basic_knowledge", "relaxation"],
  },
  {
    docId: "immigration-act-status-grant",
    title: "출입국관리법 제23조 체류자격 부여",
    sourceUrl: LAW_ACT_STATUS_GRANT_URL,
    sourceType: "official_law",
    topic: "legal",
    legalPriority: 1,
    monitorCadence: "daily",
    changeSignals: ["status_grant", "birth_in_korea", "nationality_loss", "90_days", "60_days"],
  },
  {
    docId: "immigration-act-status-change",
    title: "출입국관리법 제24조 체류자격 변경허가",
    sourceUrl: LAW_ACT_STATUS_CHANGE_URL,
    sourceType: "official_law",
    topic: "process",
    legalPriority: 1,
    monitorCadence: "daily",
    changeSignals: ["status_change", "prior_permission", "30_days", "review_criteria"],
  },
  {
    docId: "immigration-act-stay-extension",
    title: "출입국관리법 제25조 체류기간 연장허가",
    sourceUrl: LAW_ACT_STAY_EXTENSION_URL,
    sourceType: "official_law",
    topic: "process",
    legalPriority: 1,
    monitorCadence: "daily",
    changeSignals: ["stay_extension", "before_expiry", "review_criteria", "overstay"],
  },
  {
    docId: "immigration-act-marriage-immigrant-extension-special",
    title: "출입국관리법 제25조의2 결혼이민자 등에 대한 특칙",
    sourceUrl: LAW_ACT_MARRIAGE_IMMIGRANT_EXTENSION_SPECIAL_URL,
    sourceType: "official_law",
    topic: "process",
    legalPriority: 1,
    monitorCadence: "daily",
    changeSignals: ["marriage_immigrant", "domestic_violence", "sexual_violence", "child_abuse", "human_trafficking"],
  },
  {
    docId: "immigration-act-emergency-extension-special",
    title: "출입국관리법 제25조의5 국가비상사태 등 체류기간 연장 특칙",
    sourceUrl: LAW_ACT_EMERGENCY_EXTENSION_SPECIAL_URL,
    sourceType: "official_law",
    topic: "process",
    legalPriority: 1,
    monitorCadence: "daily",
    changeSignals: ["national_emergency", "border_closure", "flight_suspension", "extension_by_office", "no_fault_departure_limit"],
  },
  {
    docId: "immigration-act-reentry-permit",
    title: "출입국관리법 제30조 재입국허가",
    sourceUrl: LAW_ACT_REENTRY_PERMIT_URL,
    sourceType: "official_law",
    topic: "process",
    legalPriority: 1,
    monitorCadence: "daily",
    changeSignals: ["reentry_permit", "single_multiple_permit", "exemption", "extension", "f5"],
  },
  {
    docId: "immigration-act-alien-registration",
    title: "출입국관리법 제31조 외국인등록",
    sourceUrl: LAW_ACT_ALIEN_REGISTRATION_URL,
    sourceType: "official_law",
    topic: "process",
    legalPriority: 1,
    monitorCadence: "daily",
    changeSignals: ["alien_registration", "90_days", "registration_number", "local_office", "status_change"],
  },
  {
    docId: "immigration-act-registration-change-report",
    title: "출입국관리법 제35조 외국인등록사항 변경신고",
    sourceUrl: LAW_ACT_REGISTRATION_CHANGE_REPORT_URL,
    sourceType: "official_law",
    topic: "process",
    legalPriority: 1,
    monitorCadence: "daily",
    changeSignals: ["registration_change", "passport_change", "name_gender_birth_nationality", "15_days"],
  },
  {
    docId: "immigration-act-address-change-report",
    title: "출입국관리법 제36조 체류지 변경신고",
    sourceUrl: LAW_ACT_ADDRESS_CHANGE_REPORT_URL,
    sourceType: "official_law",
    topic: "process",
    legalPriority: 1,
    monitorCadence: "daily",
    changeSignals: ["address_change", "place_of_stay", "moving", "15_days", "online_report", "mobile_arc"],
  },
  {
    docId: "immigration-decree-current-text",
    title: "출입국관리법 시행령 최신 본문",
    sourceUrl: LAW_DECREE_URL,
    sourceType: "official_law",
    topic: "legal",
    legalPriority: 2,
    monitorCadence: "daily",
  },
  {
    docId: "immigration-decree-long-term-status-table",
    title: "출입국관리법 시행령 별표 1의2 장기체류자격",
    sourceUrl: LAW_DECREE_LONG_TERM_STATUS_TABLE_URL,
    sourceType: "official_law",
    topic: "legal",
    legalPriority: 2,
    monitorCadence: "daily",
  },
  {
    docId: "immigration-decree-short-term-status-table",
    title: "출입국관리법 시행령 별표 1 단기체류자격",
    sourceUrl: LAW_DECREE_SHORT_TERM_STATUS_TABLE_URL,
    sourceType: "official_law",
    topic: "legal",
    legalPriority: 2,
    monitorCadence: "daily",
    changeSignals: ["short_term_status", "b1", "b2", "c1", "c3", "c4", "activity_scope"],
  },
  {
    docId: "immigration-decree-permanent-residence-table",
    title: "출입국관리법 시행령 별표 1의3 영주자격",
    sourceUrl: LAW_DECREE_PERMANENT_RESIDENCE_TABLE_URL,
    sourceType: "official_law",
    topic: "legal",
    legalPriority: 2,
    monitorCadence: "daily",
    changeSignals: ["permanent_residence", "f5", "eligibility_scope", "article_12_2", "deportation_exclusion"],
  },
  {
    docId: "immigration-rule-stay-permission-review-criteria",
    title: "출입국관리법 시행규칙 제31조의2 체류자격 부여 등 심사기준",
    sourceUrl: LAW_RULE_URL,
    sourceType: "official_law",
    topic: "legal",
    legalPriority: 3,
    monitorCadence: "daily",
    changeSignals: ["review_criteria", "article_9_2", "article_31_2", "status_grant", "status_change", "extension"],
  },
  {
    docId: "immigration-rule-documents-attachments",
    title: "출입국관리법 시행규칙 제76조·별표 5·별표 5의2",
    sourceUrl: LAW_RULE_URL,
    sourceType: "official_law",
    topic: "documents",
    legalPriority: 3,
    monitorCadence: "daily",
  },
  {
    docId: "immigration-rule-fees",
    title: "출입국관리법 시행규칙 제71조·제72조 수수료",
    sourceUrl: "https://www.law.go.kr/LSW//lumLsLinkPop.do?chrClsCd=010202&lspttninfSeq=82731",
    sourceType: "official_law",
    topic: "cost",
    legalPriority: 3,
    monitorCadence: "daily",
  },
  {
    docId: "hikorea-homepage-urgent-notices",
    title: "하이코리아 첫 화면 긴급 공지·사칭사이트·전자민원 변경",
    sourceUrl: HIKOREA_HOME_URL,
    sourceType: "official_government",
    topic: "warning",
    legalPriority: 4,
    monitorCadence: "daily",
    changeSignals: ["homepage_notice", "scam_warning", "e-application_change", "fax_policy_change"],
  },
  {
    docId: "hikorea-integrated-status-manual",
    title: "하이코리아 체류자격별 통합 안내 매뉴얼",
    sourceUrl: HIKOREA_STATUS_MANUAL_URL,
    sourceType: "official_government",
    topic: "process",
    legalPriority: 4,
    monitorCadence: "daily",
  },
  {
    docId: "hikorea-d2-d4-d10-e7-f2-f5-requirements",
    title: "하이코리아 D-2/D-4/D-10/E-7/F-2/F-5 요건",
    sourceUrl: HIKOREA_STATUS_MANUAL_URL,
    sourceType: "official_government",
    topic: "visa",
    legalPriority: 4,
    monitorCadence: "daily",
  },
  {
    docId: "hikorea-stay-extension",
    title: "하이코리아 체류기간연장 안내",
    sourceUrl: "https://www.hikorea.go.kr/info/InfoDatail.pt?CAT_SEQ=181&PARENT_ID=140",
    sourceType: "official_government",
    topic: "process",
    legalPriority: 4,
    monitorCadence: "daily",
  },
  {
    docId: "hikorea-status-change",
    title: "하이코리아 체류자격변경 안내",
    sourceUrl: "https://www.hikorea.go.kr/info/InfoDatail.pt?CAT_SEQ=184&PARENT_ID=141",
    sourceType: "official_government",
    topic: "process",
    legalPriority: 4,
    monitorCadence: "daily",
  },
  {
    docId: "hikorea-activity-permit",
    title: "하이코리아 체류자격외활동 안내",
    sourceUrl: "https://www.hikorea.go.kr/info/InfoDatail.pt?CAT_SEQ=187&PARENT_ID=142",
    sourceType: "official_government",
    topic: "process",
    legalPriority: 4,
    monitorCadence: "daily",
  },
  {
    docId: "hikorea-forms-document-checklist",
    title: "하이코리아 민원서식 및 제출서류",
    sourceUrl: "https://www.hikorea.go.kr/board/BoardApplicationListR.pt",
    sourceType: "official_government",
    topic: "documents",
    legalPriority: 4,
    monitorCadence: "daily",
  },
  {
    docId: "hikorea-online-visit-application",
    title: "하이코리아 전자민원·방문예약",
    sourceUrl: "https://www.hikorea.go.kr/cvlappl/CvlapplStep1.pt",
    sourceType: "official_government",
    topic: "process",
    legalPriority: 4,
    monitorCadence: "daily",
  },
  {
    docId: "hikorea-policy-notice-monitor",
    title: "하이코리아 공지사항 정책 변경 감시",
    sourceUrl: HIKOREA_NOTICE_URL,
    sourceType: "official_government",
    topic: "warning",
    legalPriority: 4,
    monitorCadence: "daily",
    changeSignals: ["notice_title", "attachment", "posted_date", "manual_update"],
  },
  {
    docId: "moj-immigration-policy-news",
    title: "법무부 출입국·외국인정책본부 주요소식",
    sourceUrl: MOJ_MAJOR_NEWS_URL,
    sourceType: "official_government",
    topic: "process",
    legalPriority: 4,
    monitorCadence: "daily",
    changeSignals: ["policy_news", "visa_program", "status_program", "effective_period"],
  },
  {
    docId: "moj-notice-board-visa-policy",
    title: "법무부 공지사항 체류·사증 정책 변경",
    sourceUrl: MOJ_NOTICE_BOARD_URL,
    sourceType: "official_government",
    topic: "warning",
    legalPriority: 4,
    monitorCadence: "daily",
    changeSignals: ["notice_title", "posted_date", "attachment", "visa_policy", "stay_policy", "e7", "f6", "f4"],
  },
  {
    docId: "moj-e7-wage-requirement-2026",
    title: "2026년 특정활동(E-7) 체류자격 임금요건 기준",
    sourceUrl: MOJ_E7_WAGE_REQUIREMENT_2026_URL,
    sourceType: "official_government",
    topic: "visa",
    legalPriority: 4,
    monitorCadence: "daily",
    changeSignals: ["e7", "wage_requirement", "public_notice", "attachment", "effective_year"],
  },
  {
    docId: "moj-f6-marriage-visa-criteria",
    title: "결혼동거 목적 사증 발급 요건·심사면제 기준 고시",
    sourceUrl: MOJ_F6_MARRIAGE_VISA_CRITERIA_URL,
    sourceType: "official_government",
    topic: "visa",
    legalPriority: 4,
    monitorCadence: "daily",
    changeSignals: ["f6", "marriage_visa", "ministry_notice", "exemption_standard", "attachment"],
  },
  {
    docId: "moj-f4-employment-restriction-preannouncement",
    title: "재외동포(F-4) 취업활동 제한범위 고시 행정예고",
    sourceUrl: MOJ_F4_EMPLOYMENT_RESTRICTION_PREANNOUNCEMENT_URL,
    sourceType: "official_government",
    topic: "warning",
    legalPriority: 4,
    monitorCadence: "daily",
    changeSignals: ["f4", "employment_restriction", "administrative_preannouncement", "attachment", "comment_period"],
  },
  {
    docId: "moj-skilled-worker-points-visa",
    title: "법무부 외국인 숙련기능인력 점수제 비자",
    sourceUrl: MOJ_SKILLED_WORKER_POINTS_VISA_URL,
    sourceType: "official_government",
    topic: "visa",
    legalPriority: 4,
    monitorCadence: "daily",
    changeSignals: ["e7-4", "skilled_worker", "quota", "eligibility", "employment_limit"],
  },
  {
    docId: "moj-seasonal-worker-program",
    title: "법무부 외국인 계절근로자 프로그램",
    sourceUrl: MOJ_SEASONAL_WORKER_PROGRAM_URL,
    sourceType: "official_government",
    topic: "visa",
    legalPriority: 4,
    monitorCadence: "daily",
    changeSignals: ["seasonal_worker", "mou", "quota", "local_government", "procedure"],
  },
  {
    docId: "moj-online-stay-visa-center",
    title: "법무부 온라인체류·사증민원센터",
    sourceUrl: MOJ_ONLINE_STAY_VISA_CENTER_URL,
    sourceType: "official_government",
    topic: "process",
    legalPriority: 4,
    monitorCadence: "daily",
    changeSignals: ["e_visa", "e_application", "online_petition", "stay_extension", "fee_discount"],
  },
  {
    docId: "moj-stay-management-policy",
    title: "법무부 외국인 체류관리 정책",
    sourceUrl: MOJ_STAY_MANAGEMENT_POLICY_URL,
    sourceType: "official_government",
    topic: "process",
    legalPriority: 4,
    monitorCadence: "daily",
    changeSignals: ["student_policy", "e7_occupation", "seasonal_worker", "e7-4", "stay_management"],
  },
  {
    docId: "moj-tax-health-arrears-extension-restriction",
    title: "외국인 비자연장 전 세금·건강보험료 체납 확인제도",
    sourceUrl: MOJ_TAX_HEALTH_ARREARS_EXTENSION_URL,
    sourceType: "official_government",
    topic: "warning",
    legalPriority: 4,
    monitorCadence: "daily",
    changeSignals: ["tax_arrears", "health_insurance_arrears", "extension_restriction", "six_month_limit", "office_scope"],
  },
  {
    docId: "moj-social-integration-program-kiip",
    title: "법무부 사회통합프로그램",
    sourceUrl: MOJ_SOCIAL_INTEGRATION_PROGRAM_URL,
    sourceType: "official_government",
    topic: "visa",
    legalPriority: 4,
    monitorCadence: "daily",
    changeSignals: ["kiip", "permanent_residence", "naturalization", "points", "course_hours", "pre_test_fee"],
  },
  {
    docId: "moj-k-eta-entry-authorization",
    title: "법무부 전자여행허가제(K-ETA)",
    sourceUrl: MOJ_K_ETA_URL,
    sourceType: "official_government",
    topic: "process",
    legalPriority: 4,
    monitorCadence: "daily",
    changeSignals: ["k_eta", "visa_free_entry", "fee", "validity", "exemption", "boarding_requirement", "official_site"],
  },
  {
    docId: "moj-k-eta-scam-warning",
    title: "K-ETA 유사 웹사이트 주의",
    sourceUrl: MOJ_K_ETA_SCAM_WARNING_URL,
    sourceType: "official_government",
    topic: "warning",
    legalPriority: 4,
    monitorCadence: "daily",
    changeSignals: ["unofficial_site", "agency_warning", "official_website", "mobile_app", "scam_warning"],
  },
  {
    docId: "moj-e-arrival-card",
    title: "법무부 전자입국신고서(e-Arrival card)",
    sourceUrl: MOJ_E_ARRIVAL_CARD_URL,
    sourceType: "official_government",
    topic: "process",
    legalPriority: 4,
    monitorCadence: "daily",
    changeSignals: ["e_arrival_card", "arrival_card", "submission_window", "exemption", "paper_card_transition", "fee"],
  },
  {
    docId: "moj-e-arrival-card-notice",
    title: "전자입국신고서 제도 시행 알림",
    sourceUrl: MOJ_E_ARRIVAL_NOTICE_URL,
    sourceType: "official_government",
    topic: "process",
    legalPriority: 4,
    monitorCadence: "daily",
    changeSignals: ["effective_date", "submission_window", "exemptions", "group_submission", "paper_card_transition"],
  },
  {
    docId: "moj-office-jurisdiction-seoul-incheon-gyeonggi",
    title: "법무부 소속기관 관할구역 서울·인천·경기",
    sourceUrl: MOJ_OFFICE_JURISDICTION_SEOUL_INCHEON_GYEONGGI_URL,
    sourceType: "official_government",
    topic: "process",
    legalPriority: 4,
    monitorCadence: "daily",
    changeSignals: ["office_jurisdiction", "visit_reservation", "address", "phone", "service_scope", "regional_office"],
  },
  {
    docId: "moj-office-jurisdiction-busan-gyeongnam",
    title: "법무부 소속기관 관할구역 부산·경남",
    sourceUrl: MOJ_OFFICE_JURISDICTION_BUSAN_GYEONGNAM_URL,
    sourceType: "official_government",
    topic: "process",
    legalPriority: 4,
    monitorCadence: "daily",
    changeSignals: ["office_jurisdiction", "service_scope", "airport_office", "address", "phone", "regional_office"],
  },
  {
    docId: "moj-office-jurisdiction-gwangju-jeolla-jeju",
    title: "법무부 소속기관 관할구역 광주·전라·제주",
    sourceUrl: MOJ_OFFICE_JURISDICTION_GWANGJU_JEOLLA_JEJU_URL,
    sourceType: "official_government",
    topic: "process",
    legalPriority: 4,
    monitorCadence: "daily",
    changeSignals: ["office_jurisdiction", "service_scope", "branch_office", "address", "phone", "regional_office"],
  },
  {
    docId: "moj-office-jurisdiction-daegu-gyeongbuk-gangwon",
    title: "법무부 소속기관 관할구역 대구·경북·강원",
    sourceUrl: MOJ_OFFICE_JURISDICTION_DAEGU_GYEONGBUK_GANGWON_URL,
    sourceType: "official_government",
    topic: "process",
    legalPriority: 4,
    monitorCadence: "daily",
    changeSignals: ["office_jurisdiction", "service_scope", "branch_office", "address", "phone", "regional_office"],
  },
  {
    docId: "moj-office-jurisdiction-daejeon-chungcheong",
    title: "법무부 소속기관 관할구역 대전·충청",
    sourceUrl: MOJ_OFFICE_JURISDICTION_DAEJEON_CHUNGCHEONG_URL,
    sourceType: "official_government",
    topic: "process",
    legalPriority: 4,
    monitorCadence: "daily",
    changeSignals: ["office_jurisdiction", "service_scope", "branch_office", "address", "phone", "regional_office"],
  },
  {
    docId: "moj-mobile-immigration-office",
    title: "법무부 이동출입국사무소 운영 안내",
    sourceUrl: MOJ_MOBILE_IMMIGRATION_OFFICE_URL,
    sourceType: "official_government",
    topic: "process",
    legalPriority: 4,
    monitorCadence: "daily",
    changeSignals: ["mobile_office", "operation_notice", "download", "competent_office", "schedule", "service_location"],
  },
  {
    docId: "accredited-university",
    title: "Study in Korea 교육국제화역량 인증대학",
    sourceUrl: STUDY_IN_KOREA_CERTIFIED_UNIVERSITY_URL,
    sourceType: "official_government",
    topic: "school",
    legalPriority: 4,
    monitorCadence: "daily",
    changeSignals: ["last_modified", "certified_university_count", "degree_program_list", "language_program_list", "excellent_accredited_list"],
  },
  {
    docId: "visa-portal-visa-types",
    title: "Korea Visa Portal 비자 유형 목록",
    sourceUrl: VISA_PORTAL_VISA_TYPES_URL,
    sourceType: "official_government",
    topic: "visa",
    legalPriority: 4,
    monitorCadence: "daily",
    changeSignals: ["visa_type_list", "d2_subtypes", "d4_subtypes", "d10_subtypes", "e7_subtypes", "f5_subtypes"],
  },
];

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function normalizeHtml(value: string): string {
  return decodeHtmlEntities(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|tr|h[1-6]|section|article|table)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeText(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchWithTimeout(
  fetchImpl: FetchLike,
  url: string,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "KAXI-Knowledge-Monitor/1.0 (+https://kaxi.vercel.app)",
        accept: "text/html,application/xhtml+xml,application/pdf,text/plain,*/*;q=0.8",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchOfficialKnowledgeSource(
  source: OfficialKnowledgeSource,
  options: { fetchImpl?: FetchLike; timeoutMs?: number; maxChars?: number } = {}
): Promise<{ content: string; contentHash: string; byteLength: number }> {
  const fetchImpl = options.fetchImpl || fetch;
  const timeoutMs = options.timeoutMs || 15_000;
  const maxChars = options.maxChars || 80_000;
  const response = await fetchWithTimeout(fetchImpl, source.sourceUrl, timeoutMs);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
  }

  const contentType = response.headers.get("content-type") || "";
  const buffer = Buffer.from(await response.arrayBuffer());
  const byteHash = sha256(buffer);
  const looksBinary = /pdf|excel|spreadsheet|hwp|octet-stream|zip/i.test(contentType);
  const rawText = buffer.toString("utf8");
  const normalized = looksBinary
    ? `Binary official source detected.\ncontent_type: ${contentType}\nbyte_sha256: ${byteHash}\nbyte_length: ${buffer.length}`
    : contentType.includes("html") || /<html|<!doctype/i.test(rawText)
      ? normalizeHtml(rawText)
      : normalizeText(rawText);
  const clipped = normalized.slice(0, maxChars);
  const content = [
    `# ${source.title}`,
    `source_url: ${source.sourceUrl}`,
    `source_type: ${source.sourceType}`,
    `topic: ${source.topic}`,
    `legal_priority: ${source.legalPriority || "unclassified"}`,
    `monitor_cadence: ${source.monitorCadence || "daily"}`,
    `change_signals: ${(source.changeSignals || []).join(", ") || "content_hash"}`,
    "",
    clipped,
  ].join("\n");

  return {
    content,
    contentHash: sha256(content),
    byteLength: buffer.length,
  };
}

function candidateDocIdFor(docId: string, contentHash: string): string {
  return `${docId}__candidate__${contentHash.slice(0, 12)}`;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getOfficialKnowledgeSourceWatchlist(): OfficialKnowledgeSource[] {
  const configured = (process.env.KNOWLEDGE_MONITOR_SOURCE_IDS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const sources = configured.length > 0
    ? OFFICIAL_KNOWLEDGE_SOURCE_WATCHLIST.filter((source) => configured.includes(source.docId))
    : OFFICIAL_KNOWLEDGE_SOURCE_WATCHLIST;
  const maxSources = parsePositiveInt(process.env.KNOWLEDGE_MONITOR_MAX_SOURCES, sources.length);
  return sources.slice(0, maxSources);
}

export async function runOfficialKnowledgeSourceMonitor(
  options: {
    actor?: string;
    persistCandidates?: boolean;
    sources?: OfficialKnowledgeSource[];
    fetchImpl?: FetchLike;
    timeoutMs?: number;
    now?: Date;
  } = {}
): Promise<OfficialKnowledgeMonitorSummary> {
  const now = options.now || new Date();
  const persistCandidates = options.persistCandidates ?? true;
  const actor = options.actor || "knowledge-monitor";
  const sources = options.sources || getOfficialKnowledgeSourceWatchlist();
  const results: OfficialKnowledgeMonitorResult[] = [];

  for (const source of sources) {
    try {
      const fetched = await fetchOfficialKnowledgeSource(source, {
        fetchImpl: options.fetchImpl,
        timeoutMs: options.timeoutMs,
      });
      const diff = await analyzeKnowledgeDocumentDiff({
        docId: source.docId,
        actor,
        title: source.title,
        content: fetched.content,
        sourceUrl: source.sourceUrl,
        sourceType: source.sourceType,
        language: source.language || "ko",
        jurisdiction: source.jurisdiction || "KR",
        topic: source.topic,
        now,
      });
      const candidateDocId = candidateDocIdFor(source.docId, fetched.contentHash);
      let candidatePersisted = false;
      if (diff.changed && persistCandidates) {
        const existingCandidate = await db.knowledgeDocument.findUnique({
          where: { docId: candidateDocId },
          select: { reviewStatus: true },
        });
        if (!existingCandidate || existingCandidate.reviewStatus === "PENDING") {
          await upsertPendingKnowledgeCandidate({
            docId: candidateDocId,
            actor,
            title: `[검토 후보] ${source.title}`,
            content: fetched.content,
            sourceUrl: source.sourceUrl,
            sourceType: source.sourceType,
            language: source.language || "ko",
            jurisdiction: source.jurisdiction || "KR",
            topic: source.topic,
            supersedes: [source.docId],
            now,
          });
          candidatePersisted = true;
        }
      }

      results.push({
        docId: source.docId,
        title: source.title,
        sourceUrl: source.sourceUrl,
        status: diff.changed ? "changed" : "unchanged",
        contentHash: fetched.contentHash,
        candidateDocId: diff.changed ? candidateDocId : undefined,
        candidatePersisted,
        diff,
      });
    } catch (err) {
      results.push({
        docId: source.docId,
        title: source.title,
        sourceUrl: source.sourceUrl,
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    checkedAt: now.toISOString(),
    persistCandidates,
    total: results.length,
    changed: results.filter((result) => result.status === "changed").length,
    unchanged: results.filter((result) => result.status === "unchanged").length,
    failed: results.filter((result) => result.status === "failed").length,
    candidatesCreated: results.filter((result) => result.candidatePersisted).length,
    results,
  };
}
