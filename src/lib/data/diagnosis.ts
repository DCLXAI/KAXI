// 경로 진단 추천 로직
import type { Lang } from "../i18n/translations";
import type { VisaRuleEvaluation } from "../rules/visa-rules";

export type DiagnosisVisaType = "D-2" | "D-4" | "D-10";

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
  visaType: DiagnosisVisaType;
  prepTime: { ko: string; vi: string; mn: string; en: string };
  estimatedCost: number; // KRW, 6 months
  requiredDocs: string[]; // translation keys
  warnings: { ko: string; vi: string; mn: string; en: string }[];
  nextActions: { ko: string; vi: string; mn: string; en: string }[];
  riskLevel: "low" | "medium" | "high";
  confidence: "low" | "medium" | "high";
  appliedRules: string[];
  sourceRefs: string[];
  complianceCoverage: {
    status: "rule_engine" | "not_evaluated" | "rag_only";
    visaType: DiagnosisVisaType;
    policy: string;
    sourceRefs: string[];
    unsupportedReason?: string;
  };
  compliance?: {
    visaType: "D-2" | "D-4" | null;
    requiredInputs: string[];
    missingInputs: string[];
    appliedRuleIds: string[];
    reviewStatus: string;
    fallbackPolicy: string;
    sourceRefs: string[];
    documents: Array<{
      id: string;
      label: string;
      required: boolean;
      note: string;
      sourceRefs: string[];
    }>;
    warnings: string[];
    partnerEscalationReasons: string[];
    blockedReasons: string[];
  };
}

type LocalizedText = { ko: string; vi: string; mn: string; en: string };

interface PathProfile {
  pathKey: string;
  visaType: DiagnosisVisaType;
  basePrepMonths: number;
  baseCost: number;
  docs: string[];
  sourceRefs: string[];
}

interface DiagnosisRule {
  id: string;
  applies: (input: DiagnosisInput, profile: PathProfile) => boolean;
  warning?: (input: DiagnosisInput, profile: PathProfile, estimatedCost: number) => LocalizedText | null;
  prepMonthDelta?: (input: DiagnosisInput, profile: PathProfile) => number;
  riskDelta?: number;
}

const PATH_PROFILES: Record<string, PathProfile> = {
  goal_language: {
    pathKey: "goal_language",
    visaType: "D-4",
    basePrepMonths: 3,
    baseCost: 8_000_000,
    docs: ["docs_doc_passport", "docs_doc_photo", "docs_doc_diploma", "docs_doc_transcript", "docs_doc_finance", "docs_doc_business"],
    sourceRefs: ["internal:diagnosis-profile-language", "knowledge:d4-overview", "knowledge:visa-documents", "knowledge:hikorea-d2-d4-d10-e7-f2-f5-requirements"],
  },
  goal_degree: {
    pathKey: "goal_degree",
    visaType: "D-2",
    basePrepMonths: 6,
    baseCost: 12_000_000,
    docs: ["docs_doc_passport", "docs_doc_photo", "docs_doc_diploma", "docs_doc_transcript", "docs_doc_finance", "docs_doc_plan", "docs_doc_family"],
    sourceRefs: ["internal:diagnosis-profile-degree", "knowledge:d2-overview", "knowledge:visa-documents", "knowledge:hikorea-d2-d4-d10-e7-f2-f5-requirements"],
  },
  goal_transfer: {
    pathKey: "goal_transfer",
    visaType: "D-2",
    basePrepMonths: 6,
    baseCost: 13_000_000,
    docs: ["docs_doc_passport", "docs_doc_photo", "docs_doc_diploma", "docs_doc_transcript", "docs_doc_finance", "docs_doc_plan", "docs_doc_family"],
    sourceRefs: ["internal:diagnosis-profile-transfer", "knowledge:d-4-to-d-2-transfer", "knowledge:visa-documents", "knowledge:hikorea-status-change"],
  },
  goal_career: {
    pathKey: "goal_career",
    visaType: "D-10",
    basePrepMonths: 6,
    baseCost: 9_000_000,
    docs: ["docs_doc_passport", "docs_doc_photo", "docs_doc_diploma", "docs_doc_transcript", "docs_doc_finance", "docs_doc_plan"],
    sourceRefs: ["internal:diagnosis-profile-career", "knowledge:visa-documents", "knowledge:hikorea-d2-d4-d10-e7-f2-f5-requirements", "knowledge:visa-portal-visa-types"],
  },
};

function selectPathProfile(input: DiagnosisInput): PathProfile {
  if (input.goal === "degree") return PATH_PROFILES.goal_degree;
  if (input.goal === "transfer") return PATH_PROFILES.goal_transfer;
  if (input.goal === "career") return PATH_PROFILES.goal_career;
  if (input.goal === "unsure") {
    return input.korean === "none" || input.korean === "topik1"
      ? PATH_PROFILES.goal_language
      : PATH_PROFILES.goal_degree;
  }
  return PATH_PROFILES.goal_language;
}

export function inferDiagnosisVisaType(input: DiagnosisInput): DiagnosisVisaType {
  return selectPathProfile(input).visaType;
}

function regionCostMultiplier(region: string): number {
  if (region === "seoul") return 1.1;
  if (region === "gyeonggi") return 1.05;
  if (["busan", "daegu", "gwangju"].includes(region)) return 0.97;
  return 1;
}

function roundTo(value: number, unit: number): number {
  return Math.round(value / unit) * unit;
}

function hasLowKorean(input: DiagnosisInput): boolean {
  return input.korean === "none" || input.korean === "topik1";
}

function hasDegreeKoreanRisk(input: DiagnosisInput, profile: PathProfile): boolean {
  return profile.visaType === "D-2" && (input.korean === "none" || input.korean === "topik1" || input.korean === "topik2");
}

function ageNumber(input: DiagnosisInput): number {
  const parsed = Number(input.age);
  return Number.isFinite(parsed) ? parsed : 0;
}

const DIAGNOSIS_RULES: DiagnosisRule[] = [
  {
    id: "rule:korean-language-bridge",
    applies: (input, profile) => profile.visaType === "D-2" && hasLowKorean(input),
    prepMonthDelta: () => 6,
    riskDelta: 1,
    warning: () => ({
      ko: "한국어 수준이 낮은 상태에서 학위과정(D-2)으로 바로 진입하면 입학·체류 준비 리스크가 큽니다. 어학당(D-4) 선행 또는 TOPIK 보완 계획을 먼저 세우세요.",
      vi: "Nếu tiếng Hàn còn thấp, đi thẳng D-2 có rủi ro chuẩn bị nhập học/lưu trú. Nên học tiếng D-4 hoặc lập kế hoạch bổ sung TOPIK.",
      mn: "Солонгос хэлний түвшин бага үед D-2 зэрэгт шууд орох нь эрсдэлтэй. Эхлээд D-4 хэлний курс эсвэл TOPIK төлөвлөгөө гаргана уу.",
      en: "Going directly to D-2 with low Korean creates admission/stay-prep risk. Consider D-4 language study first or a TOPIK improvement plan.",
    }),
  },
  {
    id: "rule:degree-topik-gap",
    applies: hasDegreeKoreanRisk,
    prepMonthDelta: (input) => (input.korean === "topik2" ? 3 : 0),
    riskDelta: 1,
    warning: () => ({
      ko: "학위과정은 학교별 한국어/TOPIK 요건 확인이 필요합니다. 현재 수준으로는 조건부 입학, 어학 선행, 추가 서류가 요구될 수 있습니다.",
      vi: "Chương trình D-2 cần kiểm tra điều kiện tiếng Hàn/TOPIK từng trường. Có thể cần nhập học có điều kiện, học tiếng trước hoặc hồ sơ bổ sung.",
      mn: "D-2 хөтөлбөрт сургуулийн TOPIK/солонгос хэлний шаардлагыг шалгах хэрэгтэй. Нөхцөлтэй элсэлт эсвэл нэмэлт баримт шаардагдаж болно.",
      en: "For D-2, school-level Korean/TOPIK requirements must be checked. Conditional admission, prior language study, or extra documents may be required.",
    }),
  },
  {
    id: "rule:budget-gap",
    applies: (input, _profile) => input.budget > 0,
    riskDelta: 1,
    warning: (input, _profile, estimatedCost) => {
      if (input.budget >= estimatedCost) return null;
      const gap = estimatedCost - input.budget;
      return {
        ko: `현재 예산이 예상 6개월 준비비보다 ${gap.toLocaleString()}원 부족합니다. 학비·기숙사·초기정착비를 다시 조정하세요.`,
        vi: `Ngân sách hiện thấp hơn chi phí 6 tháng dự kiến ${gap.toLocaleString()} KRW. Cần điều chỉnh học phí, ký túc xá và phí ban đầu.`,
        mn: `Одоогийн төсөв 6 сарын тооцоолсон зардлаас ${gap.toLocaleString()} KRW-оор дутуу байна. Сургалтын төлбөр, байр, эхний зардлаа дахин тооцоолно уу.`,
        en: `Your current budget is ${gap.toLocaleString()} KRW below the estimated 6-month cost. Recheck tuition, housing, and settlement costs.`,
      };
    },
  },
  {
    id: "rule:visa-history-escalation",
    applies: (input) => input.hasHistory,
    prepMonthDelta: () => 2,
    riskDelta: 2,
    warning: () => ({
      ko: "과거 비자 거절/체류 이력이 있으므로 원인 분석과 소명자료 검토를 위해 행정사 상담을 반드시 거치세요.",
      vi: "Có lịch sử từ chối visa/lưu trú, nên nhờ chuyên gia hành chính rà soát lý do và tài liệu giải trình.",
      mn: "Виз татгалзсан/оршин суух түүхтэй тул шалтгаан, тайлбар баримтыг мэргэжлийн хүнээр шалгуулах хэрэгтэй.",
      en: "Visa refusal or stay history requires administrative-scrivener review of reasons and supporting explanation materials.",
    }),
  },
  {
    id: "rule:broker-cost-review",
    applies: (input) => input.usingBroker && input.brokerCost > 0,
    riskDelta: 1,
    warning: (input, _profile, estimatedCost) => {
      const excessive = input.brokerCost > estimatedCost * 0.3;
      return {
        ko: `브로커가 요구한 ${input.brokerCost.toLocaleString()}원은 항목별 견적서와 공식 비용 비교가 필요합니다.${excessive ? " 예상 준비비의 30%를 넘어 과도할 수 있습니다." : ""}`,
        vi: `Phí môi giới ${input.brokerCost.toLocaleString()} KRW cần so sánh theo từng hạng mục với chi phí chính thức.${excessive ? " Mức này vượt 30% chi phí dự kiến nên có thể quá cao." : ""}`,
        mn: `Зуучлагчийн ${input.brokerCost.toLocaleString()} KRW төлбөрийг албан зардалтай мөр мөрөөр нь харьцуулна уу.${excessive ? " Энэ нь тооцоолсон зардлын 30%-иас их тул өндөр байж магадгүй." : ""}`,
        en: `The broker fee of ${input.brokerCost.toLocaleString()} KRW should be compared line-by-line against official costs.${excessive ? " It exceeds 30% of estimated prep cost and may be excessive." : ""}`,
      };
    },
  },
  {
    id: "rule:minor-age-guardian-check",
    applies: (input) => {
      const age = ageNumber(input);
      return age > 0 && age < 18;
    },
    prepMonthDelta: () => 1,
    riskDelta: 1,
    warning: () => ({
      ko: "만 18세 미만은 보호자 동의, 숙소, 학교별 미성년자 수용 정책 확인이 필요합니다.",
      vi: "Dưới 18 tuổi cần kiểm tra đồng ý của người giám hộ, chỗ ở và chính sách nhận học sinh vị thành niên của trường.",
      mn: "18 нас хүрээгүй бол асран хамгаалагчийн зөвшөөрөл, байр, сургуулийн насанд хүрээгүй сурагч авах бодлогыг шалгана.",
      en: "Applicants under 18 need guardian consent, housing checks, and each school's minor-student policy review.",
    }),
  },
  {
    id: "policy:d10-rag-only-compliance",
    applies: (_input, profile) => profile.visaType === "D-10",
    riskDelta: 1,
    warning: () => ({
      ko: "D-10 구직/창업 준비 경로는 현재 KAXI compliance rule engine의 실행 대상이 아닙니다. 법령·하이코리아 RAG 근거로 일반 원칙만 확인하고, 현재 체류자격·만료일·구직/창업 요건은 행정사 검토가 필요합니다.",
      vi: "Lộ trình D-10 hiện chưa được chạy bằng compliance rule engine của KAXI. Chỉ dùng căn cứ luật/HiKorea RAG cho nguyên tắc chung; tình trạng hiện tại, ngày hết hạn và điều kiện tìm việc/khởi nghiệp cần chuyên gia hành chính rà soát.",
      mn: "D-10 ажил хайх/стартап бэлтгэлийн зам одоогоор KAXI compliance rule engine-д хамрагдаагүй. Хууль болон HiKorea RAG эх сурвалжаар ерөнхий зарчмыг шалгаж, одоогийн ангилал, хугацаа, ажил хайх/стартап нөхцөлийг мэргэжлийн хүнээр шалгуулна.",
      en: "The D-10 job-seeking/startup path is not yet executable in the KAXI compliance rule engine. Use law/HiKorea RAG only for general principles, and route current status, expiry, job-seeking, or startup eligibility facts to administrative-scrivener review.",
    }),
  },
];

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function riskLevel(score: number): PathRecommendation["riskLevel"] {
  if (score >= 3) return "high";
  if (score >= 1) return "medium";
  return "low";
}

function confidenceFor(
  input: DiagnosisInput,
  appliedRules: string[],
  visaRuleEvaluation?: VisaRuleEvaluation | null
): PathRecommendation["confidence"] {
  if (visaRuleEvaluation?.missing_inputs.length) return "medium";
  if (input.goal === "unsure") return "medium";
  if (appliedRules.includes("policy:d10-rag-only-compliance")) return "medium";
  if (input.nationality === "other" || !input.budget || appliedRules.includes("rule:budget-gap")) return "medium";
  return "high";
}

function complianceRiskFloor(evaluation?: VisaRuleEvaluation | null): number {
  if (!evaluation) return 0;
  if (evaluation.blocked_reasons.length > 0) return 3;
  if (evaluation.partner_escalation_reasons.length > 0) return 2;
  if (evaluation.warnings.length > 0 || evaluation.missing_inputs.length > 0) return 1;
  return 0;
}

function complianceRecommendation(evaluation?: VisaRuleEvaluation | null): PathRecommendation["compliance"] | undefined {
  if (!evaluation) return undefined;

  return {
    visaType: evaluation.visa_type,
    requiredInputs: evaluation.required_inputs,
    missingInputs: evaluation.missing_inputs,
    appliedRuleIds: evaluation.applied_rule_ids,
    reviewStatus: evaluation.review_status,
    fallbackPolicy: evaluation.fallback_policy,
    sourceRefs: evaluation.source_refs,
    documents: evaluation.documents.map((doc) => ({
      id: doc.id,
      label: doc.label,
      required: doc.required,
      note: doc.note,
      sourceRefs: doc.source_refs,
    })),
    warnings: evaluation.warnings,
    partnerEscalationReasons: evaluation.partner_escalation_reasons,
    blockedReasons: evaluation.blocked_reasons,
  };
}

function complianceCoverage(
  visaType: DiagnosisVisaType,
  evaluation?: VisaRuleEvaluation | null
): PathRecommendation["complianceCoverage"] {
  if (evaluation) {
    return {
      status: "rule_engine",
      visaType,
      policy: "D-2/D-4 compliance rule engine executed and its documents, warnings, escalation reasons, and source refs were merged into the recommendation.",
      sourceRefs: evaluation.source_refs,
    };
  }

  if (visaType === "D-10") {
    return {
      status: "rag_only",
      visaType,
      policy: "D-10 is currently covered by law-first RAG and source references only; no approved executable compliance rule version is applied yet.",
      sourceRefs: ["hikorea-d2-d4-d10-e7-f2-f5-requirements", "visa-portal-visa-types"],
      unsupportedReason: "d10_compliance_rule_engine_not_implemented",
    };
  }

  return {
    status: "not_evaluated",
    visaType,
    policy: "No compliance rule evaluation was supplied to this recommendation call.",
    sourceRefs: [],
  };
}

export function recommendPath(
  input: DiagnosisInput,
  options: { visaRuleEvaluation?: VisaRuleEvaluation | null } = {}
): PathRecommendation {
  const profile = selectPathProfile(input);
  const estimatedCost = roundTo(profile.baseCost * regionCostMultiplier(input.region), 100_000);
  const appliedRules: string[] = [`profile:${profile.pathKey}`];
  const sourceRefs = [...profile.sourceRefs];
  let prepMonths = profile.basePrepMonths;
  let riskScore = 0;
  const warnings: PathRecommendation["warnings"] = [];

  for (const rule of DIAGNOSIS_RULES) {
    if (!rule.applies(input, profile)) continue;
    const warning = rule.warning?.(input, profile, estimatedCost);
    if (!warning) continue;
    appliedRules.push(rule.id);
    sourceRefs.push(`internal:${rule.id}`);
    warnings.push(warning);
    prepMonths += rule.prepMonthDelta?.(input, profile) || 0;
    riskScore += rule.riskDelta || 0;
  }

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

  const requiredDocs = [...profile.docs];
  if (input.nationality === "vn" || input.nationality === "mn") {
    requiredDocs.push("docs_doc_tuberculosis");
    sourceRefs.push("knowledge:tuberculosis-test");
  }

  const visaRuleEvaluation = options.visaRuleEvaluation;
  if (visaRuleEvaluation) {
    appliedRules.push(...visaRuleEvaluation.applied_rule_ids.map((ruleId) => `compliance:${ruleId}`));
    sourceRefs.push(...visaRuleEvaluation.source_refs.map((sourceRef) => `compliance:${sourceRef}`));
    riskScore = Math.max(riskScore, complianceRiskFloor(visaRuleEvaluation));
  }

  return {
    pathKey: profile.pathKey,
    visaType: profile.visaType,
    prepTime: {
      ko: `${prepMonths}개월 (서류 준비 ~ 비자 발급)`,
      vi: `${prepMonths} tháng`,
      mn: `${prepMonths} сар`,
      en: `${prepMonths} months`,
    },
    estimatedCost,
    requiredDocs: unique(requiredDocs),
    warnings,
    nextActions,
    riskLevel: riskLevel(riskScore),
    confidence: confidenceFor(input, appliedRules, visaRuleEvaluation),
    appliedRules: unique(appliedRules),
    sourceRefs: unique(sourceRefs),
    complianceCoverage: complianceCoverage(profile.visaType, visaRuleEvaluation),
    compliance: complianceRecommendation(visaRuleEvaluation),
  };
}

// 다국어 추출 헬퍼
export function pickLang(obj: { ko: string; vi: string; mn: string; en: string }, lang: Lang): string {
  return obj[lang] ?? obj.en;
}
