export type AgentEducation = "highschool" | "college" | "university" | "master";
export type AgentKoreanLevel = "none" | "topik1" | "topik2" | "topik3";
export type AgentGoal = "language" | "degree" | "transfer" | "career" | "unsure";
export type AgentVisaType = "D-2" | "D-4";

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
  visaType: AgentVisaType;
  nationality: string;
  partnerType: string;
  education: AgentEducation;
  koreanLevel: AgentKoreanLevel;
  goal: AgentGoal;
  usingBroker: boolean;
  hasHistory: boolean;
  signals: AgentIntentSignals;
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

export function detectVisaType(text: string): AgentVisaType {
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

export function detectEducation(text: string): AgentEducation {
  if (includesAny(text, ["석사", "master", "thạc sĩ", "thac si", "магистр"])) return "master";
  if (includesAny(text, ["대졸", "대학교 졸업", "bachelor", "đại học", "dai hoc", "их сургууль төгс"])) return "university";
  if (includesAny(text, ["전문대", "college", "cao đẳng", "cao dang"])) return "college";
  return "highschool";
}

export function detectKoreanLevel(text: string): AgentKoreanLevel {
  if (/topik\s*3|토픽\s*3|3급|topik3/i.test(text)) return "topik3";
  if (/topik\s*2|토픽\s*2|2급|topik2/i.test(text)) return "topik2";
  if (/topik\s*1|토픽\s*1|1급|topik1/i.test(text)) return "topik1";
  if (includesAny(text, ["한국어 못", "한국어 없음", "no korean", "chưa biết tiếng hàn", "chua biet tieng han", "солонгос хэлгүй"])) {
    return "none";
  }
  return "none";
}

export function detectGoal(text: string): AgentGoal {
  if (includesAny(text, ["어학", "한국어", "language", "tiếng hàn", "tieng han", "хэлний"])) return "language";
  if (includesAny(text, ["편입", "transfer", "chuyển tiếp", "chuyen tiep"])) return "transfer";
  if (includesAny(text, ["취업", "career", "nghề", "nghe", "ажил"])) return "career";
  if (includesAny(text, ["학위", "대학", "degree", "đại học", "dai hoc", "их сургууль"])) return "degree";
  return "unsure";
}

export function hasExplicitVisaType(text: string): boolean {
  return /d-2|d2|d-4|d4|어학|어학당|한국어|language|tiếng hàn|tieng han|хэлний|학위|대학교|대학원|degree|university|graduate|đại học|dai hoc|их сургууль|магистр/i.test(text);
}

export function hasBudgetSignal(text: string): boolean {
  return /예산|budget|ngân sách|ngan sach|төсөв|төсөвтэй|비용|견적|cost|chi phí|chi phi|зардал/i.test(text);
}

export function hasEducationSignal(text: string): boolean {
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

export function hasKoreanLevelSignal(text: string): boolean {
  return /topik|토픽|[123]급|한국어|korean|tiếng hàn|tieng han|солонгос хэл/i.test(text);
}

export function hasGoalSignal(text: string): boolean {
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

export function detectPartnerType(text: string): string {
  if (includesAny(text, ["번역", "공증", "translation", "notary", "dịch", "dich", "công chứng", "cong chung", "орчуулга"])) {
    return "translation";
  }
  if (includesAny(text, ["입학처", "admission", "tuyển sinh", "tuyen sinh"])) return "admission";
  if (includesAny(text, ["어학원", "academy", "language center"])) return "academy";
  if (includesAny(text, ["정착", "settlement", "nhà ở", "nha o", "байр"])) return "settlement";
  return "admin";
}

export function isSmallTalk(text: string): boolean {
  const normalized = text.replace(/\s+/g, "").toLowerCase();
  return ["안녕", "hi", "hello", "테스트", "상태", "status", "xin chào", "sainuu"].some((word) => normalized.includes(word)) && normalized.length < 40;
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
  const documents = includesAny(text, ["서류", "문서", "documents", "hồ sơ", "ho so", "비자", "visa", "d-2", "d-4", "d2", "d4", "баримт", "виз"]);

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
    usingBroker: includesAny(text, ["브로커", "broker", "môi giới", "moi gioi"]),
    hasHistory: includesAny(text, ["거절", "refusal", "rejected", "từ chối", "tu choi", "татгалз"]),
    signals: {
      smallTalk: isSmallTalk(text),
      safety,
      school: Boolean(schoolName) || includesAny(text, ["학교", "어학당", "대학", "school", "university", "language", "trường", "truong", "du học", "du hoc", "сургууль"]),
      cost: includesAny(text, ["비용", "견적", "예산", "등록금", "학비", "cost", "budget", "tuition", "chi phí", "chi phi", "học phí", "hoc phi", "зардал", "төлбөр"]) || Boolean(budget),
      documents,
      knowledge:
        documents ||
        safety ||
        includesAny(text, ["법", "절차", "거절", "체류", "출입국", "process", "refusal", "illegal", "quy trình", "tu choi", "từ chối", "журам", "татгалз"]),
      diagnosis: includesAny(text, ["진단", "추천 경로", "로드맵", "맞춤", "profile", "diagnose", "lộ trình", "lo trinh", "đánh giá", "danh gia", "онош", "маршрут"]),
      partner: includesAny(text, ["상담", "연결", "행정사", "partner", "consult", "lawyer", "tư vấn", "tu van", "luật sư", "luat su", "kết nối", "ket noi", "зөвлөгөө", "холб"]),
      explicitVisaType: hasExplicitVisaType(text),
      budgetSignal: hasBudgetSignal(text),
      educationSignal: hasEducationSignal(text),
      koreanLevelSignal: hasKoreanLevelSignal(text),
      goalSignal: hasGoalSignal(text),
    },
  };
}
