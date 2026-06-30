// 동의어 사전 시드 데이터
// 카테고리: cost, visa, documents, school, warning, process, general
// origin: manual (기본값), auto (LLM 추출), chatlog (ChatLog 분석)

export interface SynonymSeed {
  source: string;
  targets: string[];
  category: string;
  origin?: "manual" | "auto" | "chatlog";
  autoMeta?: { frequency: number; confidence: number; chatLogIds?: string[] };
}

export const SEED_SYNONYMS: SynonymSeed[] = [
  // === 비용 관련 ===
  {
    source: "돈",
    targets: ["비용", "cost", "chi phí", "зардал", "expense"],
    category: "cost",
  },
  {
    source: "얼마",
    targets: ["비용", "가격", "cost", "price", "amount"],
    category: "cost",
  },
  {
    source: "비싸",
    targets: ["비용", "cost", "높은", "expensive"],
    category: "cost",
  },
  {
    source: "폭리",
    targets: ["비용", "브로커", "redflag", "overcharge"],
    category: "cost",
  },
  {
    source: "싸게",
    targets: ["비용", "저렴", "cheap", "low cost"],
    category: "cost",
  },
  {
    source: "학비",
    targets: ["등록금", "tuition", "học phí", "төлбөр"],
    category: "cost",
  },
  {
    source: "등록금",
    targets: ["학비", "tuition", "học phí", "төлбөр"],
    category: "cost",
  },
  {
    source: "기숙사비",
    targets: ["기숙사", "dormitory", "KTX", "дотуур байр"],
    category: "cost",
  },
  {
    source: "수수료",
    targets: ["비용", "fee", "phí", "хураамж"],
    category: "cost",
  },

  // === 비자 관련 ===
  {
    source: "거절",
    targets: ["거절", "refusal", "denied", "татгалзсан"],
    category: "visa",
  },
  {
    source: "어떡해",
    targets: ["대응", "해결", "방법", "how to"],
    category: "general",
  },
  {
    source: "보장",
    targets: ["보증", "guarantee", "bảo đảm", "баталгаа"],
    category: "visa",
  },
  {
    source: "비자연장",
    targets: ["연장", "extension", "gia hạn", "сунгах"],
    category: "visa",
  },
  {
    source: "비자발급",
    targets: ["발급", "issuance", "cấp", "олгох"],
    category: "visa",
  },
  {
    source: "체류",
    targets: ["체류자격", "stay", "lưu trú", "байршил"],
    category: "visa",
  },
  {
    source: "입국",
    targets: ["입국", "entry", "nhập cảnh", "орох"],
    category: "visa",
  },
  {
    source: "출국",
    targets: ["출국", "departure", "xuất cảnh", "гарах"],
    category: "visa",
  },
  {
    source: "외국인등록",
    targets: ["ARC", "alien registration", "đăng ký người nước ngoài", "бүртгэл"],
    category: "visa",
  },

  // === 학교 관련 ===
  {
    source: "학교",
    targets: ["대학", "어학당", "school", "university", "trường"],
    category: "school",
  },
  {
    source: "대학교",
    targets: ["대학", "university", "학위", "đại học", "их сургууль"],
    category: "school",
  },
  {
    source: "대학원",
    targets: ["대학원", "graduate", "thạc sĩ", "магистр"],
    category: "school",
  },
  {
    source: "전문대",
    targets: ["전문대", "college", "cao đẳng", "коллеж"],
    category: "school",
  },
  {
    source: "어학당",
    targets: ["언어", "language", "한국어", "lớp tiếng", "хэлний курс"],
    category: "school",
  },
  {
    source: "한국어",
    targets: ["언어", "korean", "language", "topik", "tiếng Hàn"],
    category: "school",
  },
  {
    source: "전공",
    targets: ["major", "chuyên ngành", "мэргэжил"],
    category: "school",
  },
  {
    source: "입학",
    targets: ["admission", "nhập học", "элсэлт"],
    category: "school",
  },
  {
    source: "합격",
    targets: ["admission", "đậu", "элсэн орсон"],
    category: "school",
  },
  {
    source: "불합격",
    targets: ["rejection", "rớt", "тэнцээгүй"],
    category: "school",
  },

  // === 서류 관련 ===
  {
    source: "서류",
    targets: ["documents", "hồ sơ", "баримт", "증명서"],
    category: "documents",
  },
  {
    source: "증명서",
    targets: ["certificate", "chứng chỉ", "гэрчилгээ"],
    category: "documents",
  },
  {
    source: "여권",
    targets: ["passport", "hộ chiếu", "пасспорт"],
    category: "documents",
  },
  {
    source: "사진",
    targets: ["photo", "ảnh", "зураг"],
    category: "documents",
  },
  {
    source: "졸업증명서",
    targets: ["diploma", "bằng tốt nghiệp", "төгсөлтийн гэрчилгээ"],
    category: "documents",
  },
  {
    source: "성적증명서",
    targets: ["transcript", "học bạ", "дүнгийн гэрчилгээ"],
    category: "documents",
  },
  {
    source: "잔고증명",
    targets: ["재정", "financial", "잔고", "balance", "chứng minh tài chính"],
    category: "documents",
  },
  {
    source: "재정증빙",
    targets: ["financial", "balance", "chứng minh tài chính", "санхүү"],
    category: "documents",
  },
  {
    source: "표준입학허가서",
    targets: ["standard admission", "giấy nhập học", "элсэлтийн зөвшөөрөл"],
    category: "documents",
  },
  {
    source: "사업자등록증",
    targets: ["business registration", "ĐKKD", "бизнесийн гэрчилгээ"],
    category: "documents",
  },
  {
    source: "유학계획서",
    targets: ["study plan", "kế hoạch học tập", "суралцах төлөвлөгөө"],
    category: "documents",
  },
  {
    source: "결핵진단서",
    targets: ["tuberculosis", "LAO", "TB test", "сүрьеэ"],
    category: "documents",
  },
  {
    source: "결핵",
    targets: ["tuberculosis", "LAO", "TB", "сүрьеэ"],
    category: "documents",
  },
  {
    source: "번역",
    targets: ["translation", "dịch", "орчуулга"],
    category: "documents",
  },
  {
    source: "공증",
    targets: ["notarization", "công chứng", "гэрчилгээ"],
    category: "documents",
  },

  // === 시험/자격 ===
  {
    source: "TOPIK",
    targets: ["한국어능력시험", "korean exam", "tiếng Hàn"],
    category: "documents",
  },
  {
    source: "토픽",
    targets: ["TOPIK", "한국어능력시험", "korean exam"],
    category: "documents",
  },
  {
    source: "시험",
    targets: ["exam", "thi", "шалгалт"],
    category: "documents",
  },
  {
    source: "등급",
    targets: ["level", "cấp", "түвшин"],
    category: "documents",
  },

  // === 전환/절차 ===
  {
    source: "끝나고",
    targets: ["수료", "전환", "transfer", "sau khi"],
    category: "process",
  },
  {
    source: "가려면",
    targets: ["진학", "전환", "입학", "để vào"],
    category: "process",
  },
  {
    source: "전환",
    targets: ["변경", "transfer", "chuyển", "шилжих"],
    category: "process",
  },
  {
    source: "연장",
    targets: ["extension", "gia hạn", "сунгах"],
    category: "process",
  },

  // === 경고/위험 ===
  {
    source: "허위",
    targets: ["fake", "가짜", "거짓", "위조", "giả", "хуурамч"],
    category: "warning",
  },
  {
    source: "위조",
    targets: ["fake", "허위", "forgery", "giả mạo", "хуурамч"],
    category: "warning",
  },
  {
    source: "불법",
    targets: ["illegal", "bất hợp pháp", "хууль бус"],
    category: "warning",
  },
  {
    source: "취업",
    targets: ["job", "work", "việc làm", "ажил"],
    category: "warning",
  },
  {
    source: "알바",
    targets: ["part-time", "job", "làm thêm", "ажил"],
    category: "warning",
  },
  {
    source: "브로커",
    targets: ["broker", "môi giới", "зуучлагч"],
    category: "warning",
  },
  {
    source: "환전",
    targets: ["exchange", "đổi tiền", "сольонгос",
 "хөрвүүлэх"],
    category: "general",
  },

  // === 일상 표현 (ChatLog 분석 기반) ===
  {
    source: "필요해요",
    targets: ["필요", "required", "요구", "cần"],
    category: "general",
    origin: "chatlog",
  },
  {
    source: "받아요",
    targets: ["검사", "진단", "test", "nhận"],
    category: "general",
    origin: "chatlog",
  },
  {
    source: "어디서",
    targets: ["장소", "병원", "지정", "where", "ở đâu"],
    category: "general",
    origin: "chatlog",
  },
  {
    source: "뭐해요",
    targets: ["방법", "절차", "what to do", "làm gì"],
    category: "general",
    origin: "chatlog",
  },
  {
    source: "어떻게",
    targets: ["방법", "절차", "how", "như thế nào"],
    category: "general",
    origin: "chatlog",
  },
  {
    source: "언제",
    targets: ["시기", "일정", "when", "khi nào"],
    category: "general",
    origin: "chatlog",
  },
  {
    source: "왜",
    targets: ["이유", "원인", "why", "tại sao"],
    category: "general",
    origin: "chatlog",
  },

  // === 정착/생활 ===
  {
    source: "숙소",
    targets: ["housing", "nhà ở", "байр"],
    category: "process",
  },
  {
    source: "기숙사",
    targets: ["dormitory", "KTX", "дотуур байр"],
    category: "process",
  },
  {
    source: "통신",
    targets: ["SIM", "phone", "điện thoại", "утас"],
    category: "process",
  },
  {
    source: "유심",
    targets: ["SIM", "통신", "phone"],
    category: "process",
  },
  {
    source: "보험",
    targets: ["insurance", "bảo hiểm", "даатгал"],
    category: "process",
  },
  {
    source: "은행",
    targets: ["bank", "ngân hàng", "банк"],
    category: "process",
  },
  {
    source: "계좌",
    targets: ["account", "tài khoản", "данс"],
    category: "process",
  },
  {
    source: "픽업",
    targets: ["pickup", "đón", "түшин авах"],
    category: "process",
  },

  // === 법률/전문가 ===
  {
    source: "행정사",
    targets: ["administrative lawyer", "luật sư hành chính", "зөвлөгөө"],
    category: "general",
  },
  {
    source: "변호사",
    targets: ["lawyer", "luật sư", "хуульч"],
    category: "general",
  },
  {
    source: "상담",
    targets: ["consultation", "tư vấn", "зөвлөгөө"],
    category: "general",
  },
  {
    source: "신고",
    targets: ["report", "tố cáo", "мэдээлэх"],
    category: "general",
  },
];
