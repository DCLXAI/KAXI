// 경로 진단 추천 로직
import type { Lang } from "../i18n/translations";

export interface DiagnosisInput {
  nationality: string;
  age: string;
  education: "highschool" | "college" | "university" | "master";
  korean: "none" | "topik1" | "topik2" | "topik3";
  goal: "language" | "degree" | "transfer" | "career" | "unsure";
  budget: number;
  region: string;
  usingBroker: boolean;
  brokerCost: number;
  hasHistory: boolean;
}

export interface PathRecommendation {
  pathKey: string; // goal_language | goal_degree | goal_transfer | goal_career
  prepTime: { ko: string; vi: string; mn: string; en: string };
  estimatedCost: number; // KRW, 6 months
  requiredDocs: string[]; // translation keys
  warnings: { ko: string; vi: string; mn: string; en: string }[];
  nextActions: { ko: string; vi: string; mn: string; en: string }[];
}

export function recommendPath(input: DiagnosisInput): PathRecommendation {
  // 매우 단순한 휴리스틱 (데모용)
  let pathKey = "goal_language";
  let prepMonths = 3;
  let baseCost = 8000000; // 어학당 1학기 + 기숙사 + 서류

  if (input.goal === "degree") {
    pathKey = "goal_degree";
    prepMonths = input.korean === "none" || input.korean === "topik1" ? 12 : 6;
    baseCost = 12000000;
  } else if (input.goal === "transfer") {
    pathKey = "goal_transfer";
    prepMonths = 6;
    baseCost = 13000000;
  } else if (input.goal === "career") {
    pathKey = "goal_career";
    prepMonths = 6;
    baseCost = 9000000;
  } else if (input.goal === "unsure") {
    // 한국어 수준이 낮으면 어학당부터
    pathKey = input.korean === "none" || input.korean === "topik1" ? "goal_language" : "goal_degree";
    prepMonths = 4;
    baseCost = 9000000;
  }

  // 브로커 비용 경고
  const warnings: PathRecommendation["warnings"] = [];
  if (input.usingBroker && input.brokerCost > 0) {
    warnings.push({
      ko: `브로커가 요구한 ${input.brokerCost.toLocaleString()}원은 공식 비용(${baseCost.toLocaleString()}원)과 비교해 과도할 수 있습니다. 항목별 비교를 권장합니다.`,
      vi: `Yêu cầu ${input.brokerCost.toLocaleString()} KRW của môi giới có thể quá cao so với chi phí chính thức (${baseCost.toLocaleString()} KRW).`,
      mn: `Зуучлагчийн ${input.brokerCost.toLocaleString()} KRW нь албан ёсны зардал (${baseCost.toLocaleString()} KRW)-аас өндөр байж магадгүй.`,
      en: `Broker's ${input.brokerCost.toLocaleString()} KRW may be excessive vs official cost (${baseCost.toLocaleString()} KRW).`,
    });
  }
  if (input.hasHistory) {
    warnings.push({
      ko: "과거 비자 거절/체류 이력이 있으므로 행정사 상담을 반드시 거치세요.",
      vi: "Có lịch sử visa → nên gặp luật sư hành chính.",
      mn: "Визийн түүх байгаа → зөвлөгөө авна уу.",
      en: "Visa history present → consult admin lawyer.",
    });
  }
  if (pathKey === "goal_degree" && (input.korean === "none" || input.korean === "topik1")) {
    warnings.push({
      ko: "학위과정 직행은 TOPIK 4급 이상 필요. 어학당(D-4) 선행을 권장합니다.",
      vi: "ĐH cần TOPIK 4+. Nên học tiếng trước.",
      mn: "Их сургуульд TOPIK 4+ хэрэгтэй. Эхлээд хэл сур.",
      en: "Degree requires TOPIK 4+. Consider language program first.",
    });
  }

  // 다음 액션
  const nextActions: PathRecommendation["nextActions"] = [
    {
      ko: "1. 학교 비교 화면에서 3~5곳 후보 선택",
      vi: "1. So sánh 3-5 trường",
      mn: "1. 3-5 сургууль харьцуул",
      en: "1. Shortlist 3-5 schools",
    },
    {
      ko: "2. 비용 계산기로 총비용 확인",
      vi: "2. Tính tổng chi phí",
      mn: "2. Нийт зардал тооцоол",
      en: "2. Calculate total cost",
    },
    {
      ko: "3. 서류 워크스페이스에서 개인별 체크리스트 생성",
      vi: "3. Tạo checklist hồ sơ",
      mn: "3. Баримтын жагсаалт үүсгэх",
      en: "3. Generate document checklist",
    },
    {
      ko: "4. 필요시 행정사·번역공증 파트너 연결",
      vi: "4. Kết nối đối tác nếu cần",
      mn: "4. Хэрэгтэй бол түнш холбох",
      en: "4. Connect partners if needed",
    },
  ];

  // 필수 서류 (번역 키)
  const requiredDocs = ["docs_doc_passport", "docs_doc_photo", "docs_doc_diploma", "docs_doc_transcript", "docs_doc_finance"];
  if (pathKey === "goal_degree" || pathKey === "goal_transfer") {
    requiredDocs.push("docs_doc_plan", "docs_doc_family");
  }
  if (pathKey === "goal_language") {
    requiredDocs.push("docs_doc_business");
  }
  // 결핵진단서 — 베트남·몽골 등 일부 국가
  if (input.nationality === "vn" || input.nationality === "mn") {
    requiredDocs.push("docs_doc_tuberculosis");
  }

  return {
    pathKey,
    prepTime: {
      ko: `${prepMonths}개월 (서류 준비 ~ 비자 발급)`,
      vi: `${prepMonths} tháng`,
      mn: `${prepMonths} сар`,
      en: `${prepMonths} months`,
    },
    estimatedCost: baseCost,
    requiredDocs,
    warnings,
    nextActions,
  };
}

// 다국어 추출 헬퍼
export function pickLang(obj: { ko: string; vi: string; mn: string; en: string }, lang: Lang): string {
  return obj[lang] ?? obj.en;
}
