import type { Lang } from "@/lib/i18n/translations";

export type PlannedToolName =
  | "search_schools"
  | "calculate_cost"
  | "get_documents"
  | "search_knowledge"
  | "diagnose_path"
  | "request_partner";

export interface PlannedToolCall {
  tool: PlannedToolName;
  args: Record<string, unknown>;
  reason: string;
}

export type AgentIntentConfidence = "low" | "medium" | "high";

export type AgentMissingSlot =
  | "region"
  | "program"
  | "budget"
  | "visa_type"
  | "nationality"
  | "education"
  | "korean_level"
  | "goal";

export interface AgentIntentAnalysis {
  text: string;
  smallTalk: boolean;
  safety: boolean;
  school: boolean;
  cost: boolean;
  documents: boolean;
  knowledge: boolean;
  diagnosis: boolean;
  partner: boolean;
  budget?: number;
  schoolName?: string;
  region: string;
  program: string;
  accreditation: string;
  visaType: "D-2" | "D-4";
  nationality: string;
  partnerType: string;
  education: "highschool" | "college" | "university" | "master";
  koreanLevel: "none" | "topik1" | "topik2" | "topik3";
  goal: "language" | "degree" | "transfer" | "career" | "unsure";
  usingBroker: boolean;
  hasHistory: boolean;
  confidence: AgentIntentConfidence;
  missingSlots: AgentMissingSlot[];
  plan: PlannedToolCall[];
}

function includesAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
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
    if (!/인증대학|희망\s*대학|어떤\s*대학/.test(value)) return value;
  }

  return undefined;
}

export function detectRegion(text: string): string {
  if (includesAny(text, ["서울", "seoul", "sơ-un", "seul", "сеул"])) return "seoul";
  if (includesAny(text, ["경기", "gyeonggi", "수원", "성남", "안양", "용인", "gyeonggi-do"])) return "gyeonggi";
  if (includesAny(text, ["부산", "busan", "пусан"])) return "busan";
  if (includesAny(text, ["대구", "daegu"])) return "daegu";
  if (includesAny(text, ["광주", "gwangju"])) return "gwangju";
  return "all";
}

export function detectProgram(text: string): string {
  if (includesAny(text, ["어학", "어학당", "한국어", "language", "tiếng hàn", "tieng han", "ngôn ngữ", "ngon ngu", "d-4", "d4", "хэлний", "солонгос хэл"])) {
    return "language";
  }
  if (includesAny(text, ["전문대", "college", "cao đẳng", "cao dang"])) return "college";
  if (includesAny(text, ["대학원", "석사", "박사", "graduate", "master", "phd", "thạc sĩ", "thac si", "магистр"])) {
    return "graduate";
  }
  if (includesAny(text, ["학위", "대학교", "대학", "university", "degree", "d-2", "d2", "đại học", "dai hoc", "их сургууль"])) {
    return "university";
  }
  if (includesAny(text, ["직업", "요양", "vocational", "career", "nghề", "nghe", "мэргэжил"])) return "vocational";
  return "all";
}

export function detectAccreditation(text: string): string {
  if (includesAny(text, ["인증", "accredited", "인증대학", "chứng nhận", "chung nhan", "итгэмжлэгдсэн"])) return "accredited";
  if (includesAny(text, ["비자심사", "강화", "주의", "caution", "strict", "rủi ro", "rui ro", "анхаарал"])) return "caution";
  return "all";
}

export function detectVisaType(text: string): "D-2" | "D-4" {
  return /d-2|d2|학위|대학교|대학원|degree|university|graduate|đại học|dai hoc|их сургууль|магистр/i.test(text)
    ? "D-2"
    : "D-4";
}

export function detectNationality(text: string): string {
  if (includesAny(text, ["베트남", "vietnam", "vietnamese", "việt", "việt nam", "viet nam"])) return "vn";
  if (includesAny(text, ["몽골", "mongolia", "mongolian", "монгол"])) return "mn";
  if (includesAny(text, ["중국", "china", "chinese", "trung quốc", "trung quoc"])) return "cn";
  if (includesAny(text, ["우즈벡", "uzbek", "uzbekistan"])) return "uz";
  return "other";
}

function detectEducation(text: string): AgentIntentAnalysis["education"] {
  if (includesAny(text, ["석사", "master", "thạc sĩ", "thac si", "магистр"])) return "master";
  if (includesAny(text, ["대졸", "대학교 졸업", "bachelor", "đại học", "dai hoc", "их сургууль төгс"])) return "university";
  if (includesAny(text, ["전문대", "college", "cao đẳng", "cao dang"])) return "college";
  return "highschool";
}

function detectKoreanLevel(text: string): AgentIntentAnalysis["koreanLevel"] {
  if (/topik\s*3|토픽\s*3|3급|topik3/i.test(text)) return "topik3";
  if (/topik\s*2|토픽\s*2|2급|topik2/i.test(text)) return "topik2";
  if (/topik\s*1|토픽\s*1|1급|topik1/i.test(text)) return "topik1";
  if (includesAny(text, ["한국어 못", "한국어 없음", "no korean", "chưa biết tiếng hàn", "chua biet tieng han", "солонгос хэлгүй"])) {
    return "none";
  }
  return "none";
}

function detectGoal(text: string): AgentIntentAnalysis["goal"] {
  if (includesAny(text, ["어학", "한국어", "language", "tiếng hàn", "tieng han", "хэлний"])) return "language";
  if (includesAny(text, ["편입", "transfer", "chuyển tiếp", "chuyen tiep"])) return "transfer";
  if (includesAny(text, ["취업", "career", "nghề", "nghe", "ажил"])) return "career";
  if (includesAny(text, ["학위", "대학", "degree", "đại học", "dai hoc", "их сургууль"])) return "degree";
  return "unsure";
}

function hasExplicitVisaType(text: string): boolean {
  return /d-2|d2|d-4|d4|어학|어학당|한국어|language|tiếng hàn|tieng han|хэлний|학위|대학교|대학원|degree|university|graduate|đại học|dai hoc|их сургууль|магистр/i.test(text);
}

function hasBudgetSignal(text: string): boolean {
  return /예산|budget|ngân sách|ngan sach|төсөв|төсөвтэй|비용|견적|cost|chi phí|chi phi|зардал/i.test(text);
}

function hasEducationSignal(text: string): boolean {
  return includesAny(text, [
    "고졸",
    "고등학교",
    "대졸",
    "대학교 졸업",
    "전문대",
    "석사",
    "master",
    "bachelor",
    "college",
    "cao đẳng",
    "cao dang",
    "thạc sĩ",
    "thac si",
    "магистр",
    "их сургууль төгс",
  ]);
}

function hasKoreanLevelSignal(text: string): boolean {
  return /topik|토픽|[123]급|한국어|korean|tiếng hàn|tieng han|солонгос хэл/i.test(text);
}

function hasGoalSignal(text: string): boolean {
  return includesAny(text, [
    "어학",
    "한국어",
    "language",
    "tiếng hàn",
    "tieng han",
    "хэлний",
    "편입",
    "transfer",
    "chuyển tiếp",
    "chuyen tiep",
    "취업",
    "career",
    "nghề",
    "nghe",
    "ажил",
    "학위",
    "degree",
    "đại học",
    "dai hoc",
    "их сургууль",
  ]);
}

function detectPartnerType(text: string): string {
  if (includesAny(text, ["번역", "공증", "translation", "notary", "dịch", "dich", "công chứng", "cong chung", "орчуулга"])) {
    return "translation";
  }
  if (includesAny(text, ["입학처", "admission", "tuyển sinh", "tuyen sinh"])) return "admission";
  if (includesAny(text, ["어학원", "academy", "language center"])) return "academy";
  if (includesAny(text, ["정착", "settlement", "nhà ở", "nha o", "байр"])) return "settlement";
  return "admin";
}

function isSmallTalk(text: string): boolean {
  const normalized = text.replace(/\s+/g, "").toLowerCase();
  return ["안녕", "hi", "hello", "테스트", "상태", "status", "xin chào", "sainuu"].some((word) => normalized.includes(word)) && normalized.length < 40;
}

function hasSafetySignal(text: string): boolean {
  return /허위|fake|불법|illegal|비자\s*보장|visa\s*guarantee|취업\s*알선|job\s*placement|giấy\s*tờ\s*giả|giay\s*to\s*gia|bất\s*hợp\s*pháp|bat\s*hop\s*phap/.test(text);
}

export function analyzeAgentIntent(question: string, lang?: Lang): AgentIntentAnalysis {
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

  const smallTalk = isSmallTalk(text);
  const safety = hasSafetySignal(text);
  const school = Boolean(schoolName) || includesAny(text, ["학교", "어학당", "대학", "school", "university", "language", "trường", "truong", "du học", "du hoc", "сургууль"]);
  const cost = includesAny(text, ["비용", "견적", "예산", "등록금", "학비", "cost", "budget", "tuition", "chi phí", "chi phi", "học phí", "hoc phi", "зардал", "төлбөр"]) || Boolean(budget);
  const documents = includesAny(text, ["서류", "문서", "documents", "hồ sơ", "ho so", "비자", "visa", "d-2", "d-4", "d2", "d4", "баримт", "виз"]);
  const knowledge =
    documents ||
    safety ||
    includesAny(text, ["법", "절차", "거절", "체류", "출입국", "process", "refusal", "illegal", "quy trình", "tu choi", "từ chối", "журам", "татгалз"]);
  const diagnosis = includesAny(text, ["진단", "추천 경로", "로드맵", "맞춤", "profile", "diagnose", "lộ trình", "lo trinh", "đánh giá", "danh gia", "онош", "маршрут"]);
  const partner = includesAny(text, ["상담", "연결", "행정사", "partner", "consult", "lawyer", "tư vấn", "tu van", "luật sư", "luat su", "kết nối", "ket noi", "зөвлөгөө", "холб"]);
  const usingBroker = includesAny(text, ["브로커", "broker", "môi giới", "moi gioi"]);
  const hasHistory = includesAny(text, ["거절", "refusal", "rejected", "từ chối", "tu choi", "татгалз"]);

  const plan: PlannedToolCall[] = [];
  if (!smallTalk) {
    if (school || cost) {
      plan.push({
        tool: "search_schools",
        args: {
          region,
          program,
          accreditation,
          max_tuition: budget,
          school_name: schoolName,
          limit: cost ? 3 : 5,
        },
        reason: "school_or_cost_request",
      });
    }

    if (diagnosis) {
      plan.push({
        tool: "diagnose_path",
        args: {
          nationality,
          education,
          korean_level: koreanLevel,
          goal,
          budget: budget || 10_000_000,
          using_broker: usingBroker,
          broker_cost: usingBroker ? budget || 0 : 0,
          has_history: hasHistory,
        },
        reason: "personalized_path_request",
      });
    }

    if (documents) {
      plan.push({
        tool: "get_documents",
        args: { visa_type: visaType, nationality },
        reason: "visa_document_request",
      });
    }

    if (knowledge || plan.length === 0) {
      plan.push({
        tool: "search_knowledge",
        args: { query: question, top_k: knowledge ? 4 : 3 },
        reason: knowledge ? "official_knowledge_required" : "fallback_knowledge_search",
      });
    }

    if (partner) {
      plan.push({
        tool: "request_partner",
        args: { partner_type: partnerType, question },
        reason: "partner_consultation_request",
      });
    }
  }

  const missingSlots = new Set<AgentMissingSlot>();
  if ((school || cost) && !schoolName && region === "all") missingSlots.add("region");
  if (school && !schoolName && program === "all") missingSlots.add("program");
  if (hasBudgetSignal(text) && !budget) missingSlots.add("budget");
  if (documents && !hasExplicitVisaType(text)) missingSlots.add("visa_type");
  if ((documents || diagnosis) && nationality === "other") missingSlots.add("nationality");
  if (diagnosis && !hasEducationSignal(text)) missingSlots.add("education");
  if (diagnosis && !hasKoreanLevelSignal(text)) missingSlots.add("korean_level");
  if (diagnosis && !hasGoalSignal(text)) missingSlots.add("goal");

  const missingCount = missingSlots.size;
  const confidence: AgentIntentConfidence =
    smallTalk || safety ? "high" : plan.length === 0 || missingCount >= 3 ? "low" : missingCount > 0 ? "medium" : "high";

  return {
    text,
    smallTalk,
    safety,
    school,
    cost,
    documents,
    knowledge,
    diagnosis,
    partner,
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
    usingBroker,
    hasHistory,
    confidence,
    missingSlots: Array.from(missingSlots),
    plan,
  };
}
