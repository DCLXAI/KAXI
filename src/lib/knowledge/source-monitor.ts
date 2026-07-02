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

const LAW_ACT_URL = "https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=245973";
const LAW_DECREE_URL = "https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=271319";
const LAW_RULE_URL = "https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=283059";
const LAW_RECENT_PROMULGATION_URL =
  "https://www.law.go.kr/LSW/nwRvsLsPop.do?chrIdx=10&cptOfi=&lsKndCd=&lsNm=%EC%B6%9C%EC%9E%85%EA%B5%AD%EA%B4%80%EB%A6%AC%EB%B2%95&p_epubdt=&p_epubno=&p_spubdt=&p_spubno=&searchType=lsNm&sortIdx=0";
const HIKOREA_HOME_URL = "https://www.hikorea.go.kr/index.html";
const HIKOREA_STATUS_MANUAL_URL =
  "https://www.hikorea.go.kr/board/BoardNtcDetailR.pt?BBS_GB_CD=BS10&BBS_SEQ=1&NTCCTT_SEQ=1062&page=1";
const HIKOREA_NOTICE_URL = "https://www.hikorea.go.kr/board/BoardNtcListR.pt";
const MOJ_MAJOR_NEWS_URL = "https://www.immigration.go.kr/immigration/3341/subview.do";
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
    sourceUrl: "https://www.law.go.kr/LSW/lsLawLinkInfo.do?lsJoLnkSeq=1000870036",
    sourceType: "official_law",
    topic: "legal",
    legalPriority: 2,
    monitorCadence: "daily",
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
        if (existingCandidate?.reviewStatus !== "APPROVED") {
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
