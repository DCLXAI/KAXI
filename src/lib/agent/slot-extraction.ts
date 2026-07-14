import {
  ACCREDITATION_KEYWORDS,
  BROKER_KEYWORDS,
  COST_SIGNAL_KEYWORDS,
  D2_VISA_KEYWORDS,
  D4_VISA_KEYWORDS,
  DIAGNOSIS_KEYWORDS,
  DOCUMENT_KEYWORDS,
  EDUCATION_KEYWORDS,
  EDUCATION_SIGNAL_KEYWORDS,
  GOAL_KEYWORDS,
  KNOWLEDGE_KEYWORDS,
  NATIONALITY_KEYWORDS,
  NO_KOREAN_KEYWORDS,
  PARTNER_SIGNAL_KEYWORDS,
  PARTNER_TYPE_KEYWORDS,
  PROGRAM_KEYWORDS,
  REFUSAL_HISTORY_KEYWORDS,
  REGION_KEYWORDS,
  SCHOOL_SIGNAL_KEYWORDS,
  SMALL_TALK_KEYWORDS,
  includesAnyKeyword,
  matchKeywordRule,
} from "@/lib/agent/intent-keywords";

export type AgentEducation = "highschool" | "college" | "university" | "master";
export type AgentKoreanLevel = "none" | "topik1" | "topik2" | "topik3";
export type AgentGoal = "language" | "degree" | "transfer" | "career" | "unsure";
type AgentVisaLetter = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";
export type AgentVisaType = `${AgentVisaLetter}-${number}`;
export type DocumentMatrixVisaType = "D-2" | "D-4";

export interface AgentIntentSignals {
  smallTalk: boolean;
  safety: boolean;
  school: boolean;
  cost: boolean;
  documents: boolean;
  knowledge: boolean;
  diagnosis: boolean;
  partner: boolean;
  explicitVisaType: boolean;
  budgetSignal: boolean;
  educationSignal: boolean;
  koreanLevelSignal: boolean;
  goalSignal: boolean;
}

export interface AgentSlotExtraction {
  text: string;
  budget?: number;
  schoolName?: string;
  region: string;
  program: string;
  accreditation: string;
  visaType?: AgentVisaType;
  nationality: string;
  partnerType: string;
  education: AgentEducation;
  koreanLevel: AgentKoreanLevel;
  goal: AgentGoal;
  usingBroker: boolean;
  hasHistory: boolean;
  signals: AgentIntentSignals;
}

function parseNumber(raw: string): number {
  const value = raw.trim();
  if (/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(value)) {
    return Number(value.replace(/,/g, ""));
  }
  if (/^\d+,\d{1,2}$/.test(value)) {
    return Number(value.replace(",", "."));
  }
  return Number(value.replace(/,/g, ""));
}

export function parseKrwBudget(text: string): number | undefined {
  const normalized = text.toLowerCase();
  const manwon = normalized.match(/(\d+(?:[.,]\d+)?)\s*만\s*원/);
  if (manwon) return Math.round(parseNumber(manwon[1]) * 10_000);

  const eokWon = normalized.match(/(\d+(?:[.,]\d+)?)\s*억\s*원/);
  if (eokWon) return Math.round(parseNumber(eokWon[1]) * 100_000_000);

  const millionWon = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:m|million|mil|triệu|trieu|сая)\s*(?:krw|won|원|вон)?/i);
  if (millionWon) return Math.round(parseNumber(millionWon[1]) * 1_000_000);

  const rawWon = normalized.match(/(\d{1,3}(?:,\d{3})+|\d{6,})\s*(?:krw|won|원|вон)?/i);
  if (rawWon) return Number(rawWon[1].replace(/,/g, ""));

  return undefined;
}

export function detectSchoolName(text: string): string | undefined {
  const explicit = text.match(/(?:학교명|관심\s*학교명|school\s*name|school|trường|truong)\s*[:：]\s*([^\n,，;]+)/i);
  if (explicit?.[1]) return explicit[1].trim().replace(/[.。]$/, "");

  const koreanName = text.match(/([가-힣A-Za-z0-9·.'\-\s]{2,40}(?:전문대학교|대학교|대학원|어학당|한국어교육센터|국제어학원))/);
  if (koreanName?.[1]) {
    const value = koreanName[1].trim();
    if (!isGenericSchoolNameCandidate(value)) return value;
  }

  return undefined;
}

function isGenericSchoolNameCandidate(value: string): boolean {
  if (/인증대학|희망\s*대학|어떤\s*대학/.test(value)) return true;

  const hasSpecificInstitutionSuffix = /(?:전문대학교|대학교|대학원|한국어교육센터|국제어학원)$/.test(value);
  if (hasSpecificInstitutionSuffix) return false;

  if (/^(?:서울|경기|부산|대구|광주)\s*(?:어학당|대학)$/.test(value)) return true;
  return /(?:학생|예산|추천|찾아|비자|서류|비용|조건|베트남|몽골|중국|우즈벡|d-2|d-4)/i.test(value);
}

export function detectRegion(text: string): string {
  return matchKeywordRule(text, REGION_KEYWORDS, "all");
}

export function detectProgram(text: string): string {
  return matchKeywordRule(text, PROGRAM_KEYWORDS, "all");
}

export function detectAccreditation(text: string): string {
  return matchKeywordRule(text, ACCREDITATION_KEYWORDS, "all");
}

export function detectExplicitVisaCode(text: string): AgentVisaType | undefined {
  const match = text.match(/\b([a-h])\s*[-‐‑–—]?\s*(\d{1,2})(?:\s*[-‐‑–—]\s*\d+)?\b/i);
  if (!match) return undefined;
  const letter = match[1].toUpperCase() as AgentVisaLetter;
  const number = Number(match[2]);
  if (!Number.isInteger(number) || number <= 0) return undefined;
  return `${letter}-${number}` as AgentVisaType;
}

export function detectVisaType(text: string): AgentVisaType | undefined {
  const explicit = detectExplicitVisaCode(text);
  if (explicit) return explicit;
  if (includesAnyKeyword(text, D2_VISA_KEYWORDS)) return "D-2";
  if (includesAnyKeyword(text, D4_VISA_KEYWORDS)) return "D-4";
  return undefined;
}

export function isDocumentMatrixVisaType(value: AgentVisaType | undefined): value is DocumentMatrixVisaType {
  return value === "D-2" || value === "D-4";
}

export function detectNationality(text: string): string {
  return matchKeywordRule(text, NATIONALITY_KEYWORDS, "other");
}

export function detectEducation(text: string): AgentEducation {
  return matchKeywordRule(text, EDUCATION_KEYWORDS, "highschool");
}

export function detectKoreanLevel(text: string): AgentKoreanLevel {
  if (/topik\s*3|토픽\s*3|3급|topik3/i.test(text)) return "topik3";
  if (/topik\s*2|토픽\s*2|2급|topik2/i.test(text)) return "topik2";
  if (/topik\s*1|토픽\s*1|1급|topik1/i.test(text)) return "topik1";
  if (includesAnyKeyword(text, NO_KOREAN_KEYWORDS)) {
    return "none";
  }
  return "none";
}

export function detectGoal(text: string): AgentGoal {
  return matchKeywordRule(text, GOAL_KEYWORDS, "unsure");
}

export function hasExplicitVisaType(text: string): boolean {
  return Boolean(detectExplicitVisaCode(text))
    || includesAnyKeyword(text, D2_VISA_KEYWORDS)
    || includesAnyKeyword(text, D4_VISA_KEYWORDS);
}

export function hasBudgetSignal(text: string): boolean {
  return /예산|budget|ngân sách|ngan sach|төсөв|төсөвтэй|비용|견적|cost|chi phí|chi phi|зардал/i.test(text);
}

export function hasEducationSignal(text: string): boolean {
  return includesAnyKeyword(text, EDUCATION_SIGNAL_KEYWORDS);
}

export function hasKoreanLevelSignal(text: string): boolean {
  return /topik|토픽|[123]급|한국어|korean|tiếng hàn|tieng han|солонгос хэл/i.test(text);
}

export function hasGoalSignal(text: string): boolean {
  return GOAL_KEYWORDS.some((rule) => includesAnyKeyword(text, rule.keywords));
}

export function detectPartnerType(text: string): string {
  return matchKeywordRule(text, PARTNER_TYPE_KEYWORDS, "admin");
}

export function isSmallTalk(text: string): boolean {
  const normalized = text.replace(/\s+/g, "").toLowerCase();
  return includesAnyKeyword(normalized, SMALL_TALK_KEYWORDS) && normalized.length < 40;
}

export function hasSafetySignal(text: string): boolean {
  return /허위|fake|불법|illegal|비자\s*보장|visa\s*guarantee|취업\s*알선|job\s*placement|giấy\s*tờ\s*giả|giay\s*to\s*gia|bất\s*hợp\s*pháp|bat\s*hop\s*phap/.test(text);
}

export function extractAgentSlots(question: string): AgentSlotExtraction {
  const text = question.toLowerCase();
  const budget = parseKrwBudget(text);
  const schoolName = detectSchoolName(question);
  const region = detectRegion(text);
  const program = detectProgram(text);
  const accreditation = detectAccreditation(text);
  const visaType = detectVisaType(text);
  const nationality = detectNationality(text);
  const partnerType = detectPartnerType(text);
  const education = detectEducation(text);
  const koreanLevel = detectKoreanLevel(text);
  const goal = detectGoal(text);
  const safety = hasSafetySignal(text);
  const documents = includesAnyKeyword(text, DOCUMENT_KEYWORDS);

  return {
    text,
    budget,
    schoolName,
    region,
    program,
    accreditation,
    visaType,
    nationality,
    partnerType,
    education,
    koreanLevel,
    goal,
    usingBroker: includesAnyKeyword(text, BROKER_KEYWORDS),
    hasHistory: includesAnyKeyword(text, REFUSAL_HISTORY_KEYWORDS),
    signals: {
      smallTalk: isSmallTalk(text),
      safety,
      school: Boolean(schoolName) || includesAnyKeyword(text, SCHOOL_SIGNAL_KEYWORDS),
      cost: includesAnyKeyword(text, COST_SIGNAL_KEYWORDS) || Boolean(budget),
      documents,
      knowledge:
        documents ||
        safety ||
        includesAnyKeyword(text, KNOWLEDGE_KEYWORDS),
      diagnosis: includesAnyKeyword(text, DIAGNOSIS_KEYWORDS),
      partner: includesAnyKeyword(text, PARTNER_SIGNAL_KEYWORDS),
      explicitVisaType: hasExplicitVisaType(text),
      budgetSignal: hasBudgetSignal(text),
      educationSignal: hasEducationSignal(text),
      koreanLevelSignal: hasKoreanLevelSignal(text),
      goalSignal: hasGoalSignal(text),
    },
  };
}
