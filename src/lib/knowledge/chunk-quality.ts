import { createHash } from "crypto";

export type KnowledgeQualityGrade = "approve_ready" | "needs_cleaning" | "reject";

export interface KnowledgeQualityChunkInput {
  chunkIndex: number;
  content: string;
}

export interface KnowledgeQualityInput {
  docId: string;
  title: string;
  sourceUrl: string;
  sourceType: string;
  topic: string;
  reviewStatus?: string;
  chunks: KnowledgeQualityChunkInput[];
}

export interface KnowledgeQualityResult {
  docId: string;
  baseDocId: string;
  title: string;
  sourceUrl: string;
  sourceType: string;
  topic: string;
  grade: KnowledgeQualityGrade;
  score: number;
  rawLength: number;
  cleanLength: number;
  chunkCount: number;
  noiseRatio: number;
  officialKeywordHits: string[];
  legalKeywordHits: string[];
  issues: string[];
  recommendedAction: string;
  cleanedContent: string;
  cleanedChunks: string[];
}

export const LEGAL_RAG_PROMOTION_DOC_IDS = [
  "immigration-act-visa-passport-requirement",
  "immigration-act-visa-issuance-certificate",
  "immigration-act-employment-restriction",
  "immigration-act-employer-reporting-duty",
  "immigration-act-outside-status-activity",
  "immigration-act-workplace-change-addition",
  "immigration-act-activity-scope-restriction",
  "immigration-act-false-application-documents",
  "immigration-act-entry-ban",
  "immigration-act-entry-inspection",
  "immigration-act-status-grant",
  "immigration-act-status-change",
  "immigration-act-stay-extension",
  "immigration-act-reentry-permit",
  "immigration-act-alien-registration",
  "immigration-act-registration-change-report",
  "immigration-act-address-change-report",
  "immigration-act-arc-return-duty",
  "immigration-act-biometric-information-duty",
] as const;

const CANDIDATE_SUFFIX_RE = /__candidate__.*$/;
const CANDIDATE_TITLE_RE = /^\s*\[검토 후보\]\s*/;

const OFFICIAL_KEYWORDS = [
  "국가법령정보센터",
  "법제처",
  "법무부",
  "출입국관리법",
  "출입국·외국인",
  "하이코리아",
  "대한민국 공식 전자정부",
  "Study in Korea",
  "Korea Visa Portal",
  "immigration.go.kr",
  "hikorea.go.kr",
  "law.go.kr",
  "studyinkorea.go.kr",
  "visa.go.kr",
] as const;

const LEGAL_KEYWORDS = [
  "제\\d+조",
  "별표",
  "서식",
  "시행\\s*\\d{4}",
  "법률\\s*제\\d+호",
  "대통령령\\s*제\\d+호",
  "법무부령\\s*제\\d+호",
  "일부개정",
  "전문개정",
  "체류자격",
  "법무부장관",
] as const;

const UI_NOISE_EXACT = new Set([
  "위로",
  "아래로",
  "|",
  "||",
  "---",
  "검색조문선택",
  "화면내검색",
  "검색어 입력",
  "모드",
  "법령",
  "전체저장",
  "목록저장",
  "목록 저장",
  "내용저장",
  "본문저장",
  "닫기",
  "파일형식",
  "파일형식 선택",
  "저장",
  "HTML",
  "HWP",
  "HWPX",
  "PDF",
  "DOC",
  "DOC파일",
  "EXCEL",
  "XLS(엑셀)",
  "TXT(텍스트)",
  "한글(HWP)",
  "한글(본문)",
  "HWP(한글)",
  "오피스(DOC)",
  "HTML파일",
  "HWP파일",
  "EXCEL파일",
  "PDF파일",
  "DOC파일",
  "카카오톡",
  "페이스북",
  "트위터",
  "라인",
  "주소복사",
  "돋보기",
  "생활법령정보",
  "법령용어명",
  "용지/폰트설정",
  "범위설정",
  "일부범위입력",
  "법령본문",
  "전체",
  "목록저장",
  "본문목록열림 본문",
  "부칙목록열림 부칙",
  "별표목록열림 별표",
  "서식목록열림 서식",
  "본문",
  "제정·개정이유",
  "별표·서식",
  "연혁",
  "3단비교",
  "신구법비교",
  "법령체계도",
  "법령비교",
  "조례위임조문",
  "위임조례",
  "한눈보기",
  "원문다운로드",
  "음성지원",
  "점자뷰어",
  "새창 선택",
]);

const UI_NOISE_PATTERNS = [
  /^\|+$/,
  /^-{3,}$/,
  /-->$/,
  /^ancYnChk\s+/,
  /^복사\s*\|/,
  /^법령\s*-\s*/,
  /^법령\s*>\s*본문\s*>/,
  /^국가법령정보센터\s*\|/,
  /^조문 선택 조문선택$/,
  /^조문의 목록을 제공하고 바로가기 기능을/,
  /^제공합니다\.$/,
  /^\(신구법 비교는 공포단위 서비스입니다\)$/,
  /^비교는 시스템으로 자동 생성한 것으로/,
  /^개정내용의 확인은/,
  /^또는 관보를 확인해 주세요\.$/,
  /^국가법령정보센터에서 제공하는 신구법/,
  /^참고용으로만 이용하시기 바라며/,
  /^정확한\s*개정내용의\s*확인은/,
  /^조례위임조문$/,
  /^법령에서 자치법규로 위임한 사항/,
  /^현재 보고있는 법에서 위임한 사항/,
  /^한눈에 이해되는 법령정보/,
  /^법령 속 어려운 내용을 그림이나 표/,
  /^시행령 연계 데이터를 보려면/,
  /^위임행정규칙$/,
  /^법률·대통령령·총리령·부령 등/,
  /^훈령·예규·고시·공고 등의 형식/,
  /^로그인$/,
  /^회원가입$/,
  /^이용안내$/,
  /^고객센터$/,
  /^통합검색$/,
  /^검색$/,
  /^통합검색 닫기$/,
  /^TOP$/,
  /^화면내검색/,
  /^파일형식/,
  /^법령용어명/,
  /^(?:HTML|HWPX?|PDF|DOC|TXT|XLS|EXCEL|오피스|한글|엑셀|텍스트|파일|본문|저장|닫기|선택|[()\/\s])+$/i,
  /^개인정보처리방침$/,
  /^웹접근성정책$/,
  /^원격접속$/,
  /^관련사이트$/,
  /^Copyright/i,
] as const;

const LEGAL_ARTICLE_REQUIRED_DOC_IDS = new Set<string>(LEGAL_RAG_PROMOTION_DOC_IDS);

function normalizeLine(line: string): string {
  return line
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function isNoiseLine(line: string): boolean {
  const normalized = normalizeLine(line);
  if (!normalized) return true;
  if (UI_NOISE_EXACT.has(normalized)) return true;
  return UI_NOISE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function baseKnowledgeDocId(docId: string): string {
  return docId.replace(CANDIDATE_SUFFIX_RE, "");
}

export function canonicalKnowledgeTitle(title: string): string {
  return title.replace(CANDIDATE_TITLE_RE, "").trim() || title.trim();
}

export function contentHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function cleanKnowledgeChunkContent(content: string): string {
  const kept: string[] = [];
  for (const line of content.split(/\r?\n/).map(normalizeLine)) {
    if (isNoiseLine(line)) continue;
    if (kept[kept.length - 1] === line) continue;
    kept.push(line);
  }

  return kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

export function splitCleanedKnowledgeContent(content: string, maxChunkChars = 1800): string[] {
  const paragraphs = content.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const next = current ? `${current}\n\n${paragraph}` : paragraph;
    if (next.length <= maxChunkChars) {
      current = next;
      continue;
    }
    if (current) chunks.push(current);
    if (paragraph.length <= maxChunkChars) {
      current = paragraph;
      continue;
    }
    for (let start = 0; start < paragraph.length; start += maxChunkChars) {
      chunks.push(paragraph.slice(start, start + maxChunkChars).trim());
    }
    current = "";
  }

  if (current) chunks.push(current);
  return chunks;
}

function keywordHits(text: string, keywords: readonly string[], regex = false): string[] {
  const hits = new Set<string>();
  for (const keyword of keywords) {
    const pattern = regex ? new RegExp(keyword) : null;
    if (pattern ? pattern.test(text) : text.includes(keyword)) hits.add(keyword);
  }
  return Array.from(hits);
}

function isOfficialLaw(input: KnowledgeQualityInput): boolean {
  return input.sourceType === "official_law" || input.sourceUrl.includes("law.go.kr");
}

function isOfficialGovernment(input: KnowledgeQualityInput): boolean {
  return (
    input.sourceType === "official_government" ||
    /hikorea\.go\.kr|immigration\.go\.kr|studyinkorea\.go\.kr|visa\.go\.kr|moe\.go\.kr/.test(input.sourceUrl)
  );
}

function sourceUrlKeyword(sourceUrl: string): string {
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    return sourceUrl;
  }
}

function bodyOnlyText(cleanedContent: string): string {
  return cleanedContent
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (trimmed.startsWith("# ")) return false;
      if (/^(source_url|source_type|topic|legal_priority|monitor_cadence|change_signals):/.test(trimmed)) return false;
      return true;
    })
    .join("\n");
}

export function evaluateKnowledgeDocumentQuality(input: KnowledgeQualityInput): KnowledgeQualityResult {
  const rawContent = input.chunks
    .slice()
    .sort((a, b) => a.chunkIndex - b.chunkIndex)
    .map((chunk) => chunk.content)
    .join("\n\n");
  const cleanedContent = cleanKnowledgeChunkContent(rawContent);
  const cleanedChunks = splitCleanedKnowledgeContent(cleanedContent);
  const rawLength = rawContent.length;
  const cleanLength = cleanedContent.length;
  const noiseRatio = rawLength > 0 ? Math.max(0, Math.min(1, 1 - cleanLength / rawLength)) : 1;
  const searchableText = `${input.title}\n${input.sourceUrl}\n${cleanedContent}`;
  const legalBodyText = bodyOnlyText(cleanedContent);
  const officialKeywordHits = keywordHits(`${sourceUrlKeyword(input.sourceUrl)}\n${searchableText}`, OFFICIAL_KEYWORDS);
  const legalKeywordHits = keywordHits(legalBodyText, LEGAL_KEYWORDS, true);
  const official = officialKeywordHits.length > 0 || isOfficialGovernment(input) || isOfficialLaw(input);
  const law = isOfficialLaw(input);
  const articleBodyRequired = law && LEGAL_ARTICLE_REQUIRED_DOC_IDS.has(baseKnowledgeDocId(input.docId));
  const hasArticleOrTableMarker = /제\d+조|별표|서식/.test(legalBodyText);
  const issues: string[] = [];
  let score = 100;

  if (input.chunks.length === 0) {
    issues.push("no_chunks");
    score -= 60;
  }
  if (!official) {
    issues.push("missing_official_keyword");
    score -= 35;
  }
  if (cleanLength < 350) {
    issues.push("clean_content_too_short");
    score -= 35;
  } else if (cleanLength < 650) {
    issues.push("clean_content_short");
    score -= 14;
  }
  if (noiseRatio > 0.88) {
    issues.push("ui_noise_extreme");
    score -= 30;
  } else if (noiseRatio > 0.62) {
    issues.push("ui_noise_high");
    score -= 8;
  }
  if (law && legalKeywordHits.length < 2) {
    issues.push("missing_legal_keywords");
    score -= 34;
  }
  if (law && !hasArticleOrTableMarker) {
    issues.push("missing_article_or_table_marker");
    score -= 24;
  }
  if (articleBodyRequired && !hasArticleOrTableMarker) {
    issues.push("missing_required_article_body");
    score -= 45;
  }

  let grade: KnowledgeQualityGrade = "needs_cleaning";
  if (issues.includes("no_chunks") || issues.includes("missing_official_keyword")) {
    grade = "reject";
  } else if (cleanLength < 300) {
    grade = "reject";
  } else if (articleBodyRequired && !hasArticleOrTableMarker) {
    grade = "needs_cleaning";
  } else if (law && legalKeywordHits.length < 2) {
    grade = cleanLength < 700 || noiseRatio > 0.75 ? "reject" : "needs_cleaning";
  } else if (cleanLength >= (law ? 650 : 900) && score >= 58) {
    grade = "approve_ready";
  } else if (score < 45) {
    grade = "reject";
  }

  const recommendedAction =
    grade === "approve_ready"
      ? noiseRatio > 0.25
        ? "clean_and_approve"
        : "approve"
      : grade === "needs_cleaning"
      ? "manual_cleaning_or_refetch"
      : "reject_or_supersede";

  return {
    docId: input.docId,
    baseDocId: baseKnowledgeDocId(input.docId),
    title: canonicalKnowledgeTitle(input.title),
    sourceUrl: input.sourceUrl,
    sourceType: input.sourceType,
    topic: input.topic,
    grade,
    score: Math.max(0, Math.min(100, Math.round(score))),
    rawLength,
    cleanLength,
    chunkCount: input.chunks.length,
    noiseRatio: Number(noiseRatio.toFixed(3)),
    officialKeywordHits,
    legalKeywordHits,
    issues,
    recommendedAction,
    cleanedContent,
    cleanedChunks,
  };
}
