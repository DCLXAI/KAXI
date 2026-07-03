export interface KeywordRule<T extends string> {
  value: T;
  keywords: readonly string[];
}

export function includesAnyKeyword(text: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

export function matchKeywordRule<const T extends string>(
  text: string,
  rules: readonly KeywordRule<T>[],
  fallback: T
): T {
  return rules.find((rule) => includesAnyKeyword(text, rule.keywords))?.value || fallback;
}

export const REGION_KEYWORDS = [
  { value: "seoul", keywords: ["서울", "seoul", "sơ-un", "seul", "сеул"] },
  { value: "gyeonggi", keywords: ["경기", "gyeonggi", "수원", "성남", "안양", "용인", "gyeonggi-do"] },
  { value: "busan", keywords: ["부산", "busan", "пусан"] },
  { value: "daegu", keywords: ["대구", "daegu"] },
  { value: "gwangju", keywords: ["광주", "gwangju"] },
] as const satisfies readonly KeywordRule<string>[];

export const PROGRAM_KEYWORDS = [
  {
    value: "language",
    keywords: ["어학", "어학당", "한국어", "language", "tiếng hàn", "tieng han", "ngôn ngữ", "ngon ngu", "d-4", "d4", "хэлний", "солонгос хэл"],
  },
  { value: "college", keywords: ["전문대", "college", "cao đẳng", "cao dang"] },
  { value: "graduate", keywords: ["대학원", "석사", "박사", "graduate", "master", "phd", "thạc sĩ", "thac si", "магистр"] },
  { value: "university", keywords: ["학위", "대학교", "대학", "university", "degree", "d-2", "d2", "đại học", "dai hoc", "их сургууль"] },
  { value: "vocational", keywords: ["직업", "요양", "vocational", "career", "nghề", "nghe", "мэргэжил"] },
] as const satisfies readonly KeywordRule<string>[];

export const ACCREDITATION_KEYWORDS = [
  { value: "accredited", keywords: ["인증", "accredited", "인증대학", "chứng nhận", "chung nhan", "итгэмжлэгдсэн"] },
  { value: "caution", keywords: ["비자심사", "강화", "주의", "caution", "strict", "rủi ro", "rui ro", "анхаарал"] },
] as const satisfies readonly KeywordRule<string>[];

export const D2_VISA_KEYWORDS = [
  "d-2",
  "d2",
  "학위",
  "대학교",
  "대학원",
  "degree",
  "university",
  "graduate",
  "đại học",
  "dai hoc",
  "их сургууль",
  "магистр",
] as const;

export const D4_VISA_KEYWORDS = ["d-4", "d4", "어학", "어학당", "한국어", "language", "tiếng hàn", "tieng han", "хэлний"] as const;

export const NATIONALITY_KEYWORDS = [
  { value: "vn", keywords: ["베트남", "vietnam", "vietnamese", "việt", "việt nam", "viet nam"] },
  { value: "mn", keywords: ["몽골", "mongolia", "mongolian", "монгол"] },
  { value: "cn", keywords: ["중국", "china", "chinese", "trung quốc", "trung quoc"] },
  { value: "uz", keywords: ["우즈벡", "uzbek", "uzbekistan"] },
] as const satisfies readonly KeywordRule<string>[];

export const EDUCATION_KEYWORDS = [
  { value: "master", keywords: ["석사", "master", "thạc sĩ", "thac si", "магистр"] },
  { value: "university", keywords: ["대졸", "대학교 졸업", "bachelor", "đại học", "dai hoc", "их сургууль төгс"] },
  { value: "college", keywords: ["전문대", "college", "cao đẳng", "cao dang"] },
] as const satisfies readonly KeywordRule<string>[];

export const NO_KOREAN_KEYWORDS = ["한국어 못", "한국어 없음", "no korean", "chưa biết tiếng hàn", "chua biet tieng han", "солонгос хэлгүй"] as const;

export const GOAL_KEYWORDS = [
  { value: "language", keywords: ["어학", "한국어", "language", "tiếng hàn", "tieng han", "хэлний"] },
  { value: "transfer", keywords: ["편입", "transfer", "chuyển tiếp", "chuyen tiep"] },
  { value: "career", keywords: ["취업", "career", "nghề", "nghe", "ажил"] },
  { value: "degree", keywords: ["학위", "대학", "degree", "đại học", "dai hoc", "их сургууль"] },
] as const satisfies readonly KeywordRule<string>[];

export const PARTNER_TYPE_KEYWORDS = [
  { value: "translation", keywords: ["번역", "공증", "translation", "notary", "dịch", "dich", "công chứng", "cong chung", "орчуулга"] },
  { value: "admission", keywords: ["입학처", "admission", "tuyển sinh", "tuyen sinh"] },
  { value: "academy", keywords: ["어학원", "academy", "language center"] },
  { value: "settlement", keywords: ["정착", "settlement", "nhà ở", "nha o", "байр"] },
] as const satisfies readonly KeywordRule<string>[];

export const EDUCATION_SIGNAL_KEYWORDS = [
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
] as const;

export const SCHOOL_SIGNAL_KEYWORDS = ["학교", "어학당", "대학", "school", "university", "language", "trường", "truong", "du học", "du hoc", "сургууль"] as const;

export const COST_SIGNAL_KEYWORDS = ["비용", "견적", "예산", "등록금", "학비", "cost", "budget", "tuition", "chi phí", "chi phi", "học phí", "hoc phi", "зардал", "төлбөр"] as const;

export const DOCUMENT_KEYWORDS = ["서류", "문서", "documents", "hồ sơ", "ho so", "비자", "visa", "d-2", "d-4", "d2", "d4", "баримт", "виз"] as const;

export const KNOWLEDGE_KEYWORDS = ["법", "절차", "거절", "체류", "출입국", "process", "refusal", "illegal", "quy trình", "tu choi", "từ chối", "журам", "татгалз"] as const;

export const DIAGNOSIS_KEYWORDS = ["진단", "추천 경로", "로드맵", "맞춤", "profile", "diagnose", "lộ trình", "lo trinh", "đánh giá", "danh gia", "онош", "маршрут"] as const;

export const PARTNER_SIGNAL_KEYWORDS = ["상담", "연결", "행정사", "partner", "consult", "lawyer", "tư vấn", "tu van", "luật sư", "luat su", "kết nối", "ket noi", "зөвлөгөө", "холб"] as const;

export const BROKER_KEYWORDS = ["브로커", "broker", "môi giới", "moi gioi"] as const;

export const REFUSAL_HISTORY_KEYWORDS = ["거절", "refusal", "rejected", "từ chối", "tu choi", "татгалз"] as const;

export const SMALL_TALK_KEYWORDS = ["안녕", "hi", "hello", "테스트", "상태", "status", "xin chào", "xinchào", "sainuu"] as const;
