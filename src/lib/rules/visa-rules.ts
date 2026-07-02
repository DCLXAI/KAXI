export type VisaType = "D-2" | "D-4";
export type VisaRuleReviewStatus = "approved" | "needs_review" | "deprecated";

export type VisaRuleInputName =
  | "visa_type"
  | "program"
  | "nationality"
  | "has_refusal_history"
  | "requests_filing_representation"
  | "asks_for_fake_documents"
  | "asks_for_illegal_work"
  | "asks_for_visa_guarantee";

export interface VisaRuleDefinition {
  id: string;
  title: string;
  required_inputs: VisaRuleInputName[];
  effective_from: string;
  source_refs: string[];
  review_status: VisaRuleReviewStatus;
  fallback_policy: string;
}

export interface VisaRuleInput {
  visa_type?: VisaType | string | null;
  program?: string | null;
  nationality?: string | null;
  has_refusal_history?: boolean;
  requests_filing_representation?: boolean;
  asks_for_fake_documents?: boolean;
  asks_for_illegal_work?: boolean;
  asks_for_visa_guarantee?: boolean;
}

export interface VisaRuleDocument {
  id: string;
  label: string;
  required: boolean;
  note: string;
  source_refs: string[];
}

export interface VisaRuleEvaluation {
  visa_type: VisaType | null;
  required_inputs: VisaRuleInputName[];
  missing_inputs: string[];
  applied_rule_ids: string[];
  effective_from: string;
  review_status: VisaRuleReviewStatus;
  fallback_policy: string;
  source_refs: string[];
  documents: VisaRuleDocument[];
  warnings: string[];
  partner_escalation_reasons: string[];
  blocked_reasons: string[];
}

export const VISA_RULE_SOURCE_REFS = {
  immigrationActStayStatusScope: {
    id: "immigration-act-stay-status-scope",
    title: "출입국관리법 제10조·제17조",
    url: "https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=245973",
    checked_at: "2026-07-02",
  },
  immigrationActPermissionMatrix: {
    id: "immigration-act-permission-matrix",
    title: "출입국관리법 제18조·제20조·제21조·제24조·제25조·제31조",
    url: "https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=245973",
    checked_at: "2026-07-02",
  },
  immigrationDecreeLongTermStatusTable: {
    id: "immigration-decree-long-term-status-table",
    title: "출입국관리법 시행령 제12조·별표 1의2",
    url: "https://www.law.go.kr/flDownload.do?flNm=%5B%EB%B3%84%ED%91%9C+1%EC%9D%982%5D+%EC%9E%A5%EA%B8%B0%EC%B2%B4%EB%A5%98%EC%9E%90%EA%B2%A9%28%EC%A0%9C12%EC%A1%B0+%EA%B4%80%EB%A0%A8%29%0A&flSeq=53439589",
    checked_at: "2026-07-02",
  },
  immigrationRuleAttachments: {
    id: "immigration-rule-documents-attachments",
    title: "출입국관리법 시행규칙 제76조·별표 5·별표 5의2",
    url: "https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=283059",
    checked_at: "2026-07-02",
  },
  immigrationRuleFees: {
    id: "immigration-rule-fees",
    title: "출입국관리법 시행규칙 제71조·제72조",
    url: "https://www.law.go.kr/LSW//lumLsLinkPop.do?chrClsCd=010202&lspttninfSeq=82731",
    checked_at: "2026-07-02",
  },
  studyInKoreaVisaDocuments: {
    id: "studyinkorea-visa-documents",
    title: "Study in Korea visa document guidance",
    url: "https://www.studyinkorea.go.kr",
    checked_at: "2026-07-01",
  },
  immigrationVisaNavigator: {
    id: "moj-immigration-visa-navigator",
    title: "법무부 비자 내비게이터: 유학·연수(D-2, D-4)",
    url: "https://www.immigration.go.kr/bbs/immigration_eng/230/454086/download.do",
    checked_at: "2026-07-01",
  },
  administrativeScrivenerAct: {
    id: "admin-scrivener-act",
    title: "행정사법",
    url: "https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=170997",
    checked_at: "2026-07-01",
  },
} as const;

export const IMMIGRATION_ACT_STATUS_SOURCE = VISA_RULE_SOURCE_REFS.immigrationActStayStatusScope.id;
export const IMMIGRATION_ACT_PERMISSION_SOURCE = VISA_RULE_SOURCE_REFS.immigrationActPermissionMatrix.id;
export const IMMIGRATION_DECREE_STATUS_SOURCE = VISA_RULE_SOURCE_REFS.immigrationDecreeLongTermStatusTable.id;
export const IMMIGRATION_RULE_ATTACHMENTS_SOURCE = VISA_RULE_SOURCE_REFS.immigrationRuleAttachments.id;
export const IMMIGRATION_RULE_FEES_SOURCE = VISA_RULE_SOURCE_REFS.immigrationRuleFees.id;
export const STUDY_SOURCE = VISA_RULE_SOURCE_REFS.studyInKoreaVisaDocuments.id;
export const IMMIGRATION_SOURCE = VISA_RULE_SOURCE_REFS.immigrationVisaNavigator.id;
export const ADMIN_SOURCE = VISA_RULE_SOURCE_REFS.administrativeScrivenerAct.id;

export const VISA_RULES: VisaRuleDefinition[] = [
  {
    id: "visa-type-from-program",
    title: "Infer D-2/D-4 from study program",
    required_inputs: ["visa_type", "program"],
    effective_from: "2026-01-01",
    source_refs: [IMMIGRATION_ACT_STATUS_SOURCE, IMMIGRATION_DECREE_STATUS_SOURCE, IMMIGRATION_SOURCE],
    review_status: "approved",
    fallback_policy: "If neither visa_type nor program is known, ask a clarifying question before final checklist generation.",
  },
  {
    id: "core-document-checklist",
    title: "Core D-2/D-4 document checklist",
    required_inputs: ["visa_type"],
    effective_from: "2026-01-01",
    source_refs: [
      IMMIGRATION_ACT_STATUS_SOURCE,
      IMMIGRATION_DECREE_STATUS_SOURCE,
      IMMIGRATION_RULE_ATTACHMENTS_SOURCE,
      STUDY_SOURCE,
      IMMIGRATION_SOURCE,
    ],
    review_status: "approved",
    fallback_policy: "If visa_type is missing, provide only a high-level checklist and ask whether the user is preparing D-2 or D-4.",
  },
  {
    id: "financial-proof-threshold",
    title: "Financial proof note by visa type",
    required_inputs: ["visa_type"],
    effective_from: "2026-01-01",
    source_refs: [IMMIGRATION_RULE_ATTACHMENTS_SOURCE, STUDY_SOURCE],
    review_status: "approved",
    fallback_policy: "If visa_type is missing, state that financial proof differs by program and require embassy/school confirmation.",
  },
  {
    id: "tuberculosis-certificate-by-nationality",
    title: "TB certificate for designated nationalities",
    required_inputs: ["nationality"],
    effective_from: "2026-01-01",
    source_refs: [IMMIGRATION_RULE_ATTACHMENTS_SOURCE, STUDY_SOURCE, IMMIGRATION_SOURCE],
    review_status: "approved",
    fallback_policy: "If nationality is missing, ask for nationality and warn that some countries require a TB certificate.",
  },
  {
    id: "safety-and-admin-scrivener-escalation",
    title: "Illegal request refusal and administrative-scrivener escalation",
    required_inputs: [
      "has_refusal_history",
      "requests_filing_representation",
      "asks_for_fake_documents",
      "asks_for_illegal_work",
      "asks_for_visa_guarantee",
    ],
    effective_from: "2026-01-01",
    source_refs: [ADMIN_SOURCE, IMMIGRATION_ACT_STATUS_SOURCE, IMMIGRATION_ACT_PERMISSION_SOURCE, IMMIGRATION_SOURCE],
    review_status: "approved",
    fallback_policy: "Refuse fake-document, illegal-work, or guarantee requests; route lawful case-specific filing/refusal issues to a licensed administrative scrivener.",
  },
];

export const CORE_DOCUMENTS: VisaRuleDocument[] = [
  {
    id: "passport",
    label: "여권",
    required: true,
    note: "유효기간 6개월 이상 권장",
    source_refs: [IMMIGRATION_RULE_ATTACHMENTS_SOURCE, STUDY_SOURCE],
  },
  {
    id: "id_photo",
    label: "증명사진",
    required: true,
    note: "최근 6개월 이내 사진. 세부 규격은 관할 공관 확인",
    source_refs: [IMMIGRATION_RULE_ATTACHMENTS_SOURCE, STUDY_SOURCE],
  },
  {
    id: "standard_admission",
    label: "표준입학허가서",
    required: true,
    note: "학교 합격 후 학교가 발급",
    source_refs: [IMMIGRATION_RULE_ATTACHMENTS_SOURCE, STUDY_SOURCE],
  },
  {
    id: "institution_registration",
    label: "교육기관 사업자등록증",
    required: true,
    note: "학교가 제공하는 제출 서류",
    source_refs: [IMMIGRATION_RULE_ATTACHMENTS_SOURCE, STUDY_SOURCE],
  },
  {
    id: "graduation_certificate",
    label: "졸업증명서",
    required: true,
    note: "학력 증빙. 번역·공증 또는 아포스티유 필요 여부는 국가별 확인",
    source_refs: [IMMIGRATION_RULE_ATTACHMENTS_SOURCE, STUDY_SOURCE],
  },
  {
    id: "transcript",
    label: "성적증명서",
    required: true,
    note: "학업 이력 증빙. 번역·공증 또는 아포스티유 필요 여부는 국가별 확인",
    source_refs: [IMMIGRATION_RULE_ATTACHMENTS_SOURCE, STUDY_SOURCE],
  },
  {
    id: "financial_proof",
    label: "재정능력 증빙",
    required: true,
    note: "비자 종류별 기준 금액 및 관할 공관 세부 기준 확인 필요",
    source_refs: [IMMIGRATION_RULE_ATTACHMENTS_SOURCE, STUDY_SOURCE],
  },
];

export const D2_DOCUMENTS: VisaRuleDocument[] = [
  {
    id: "topik_certificate",
    label: "TOPIK 또는 한국어/영어 능력 증빙",
    required: true,
    note: "학위과정은 학교·전공별 언어 요건 확인 필요",
    source_refs: [IMMIGRATION_DECREE_STATUS_SOURCE, IMMIGRATION_RULE_ATTACHMENTS_SOURCE, STUDY_SOURCE, IMMIGRATION_SOURCE],
  },
  {
    id: "study_plan",
    label: "유학계획서",
    required: true,
    note: "학교·공관 요구 양식에 맞춰 작성",
    source_refs: [IMMIGRATION_RULE_ATTACHMENTS_SOURCE, STUDY_SOURCE],
  },
];

export const TB_REQUIRED_NATIONALITIES = new Set(["vn", "mn", "cn", "ph", "mm", "uz", "th", "id", "np"]);

const NATIONALITY_ALIASES: Record<string, string> = {
  vietnam: "vn",
  "viet nam": "vn",
  "việt nam": "vn",
  베트남: "vn",
  mongolia: "mn",
  монгол: "mn",
  몽골: "mn",
  china: "cn",
  중국: "cn",
  philippines: "ph",
  필리핀: "ph",
  myanmar: "mm",
  미얀마: "mm",
  uzbekistan: "uz",
  우즈베키스탄: "uz",
  thailand: "th",
  태국: "th",
  indonesia: "id",
  인도네시아: "id",
  nepal: "np",
  네팔: "np",
  other: "other",
};

export function normalizeVisaType(value: VisaRuleInput["visa_type"]): VisaType | null {
  if (value === "D-2" || value === "D-4") return value;
  const text = String(value || "").toUpperCase();
  if (text.includes("D-2") || text.includes("D2")) return "D-2";
  if (text.includes("D-4") || text.includes("D4")) return "D-4";
  return null;
}

export function inferVisaTypeFromProgram(program: string | null | undefined): VisaType | null {
  const text = String(program || "").trim().toLowerCase();
  if (!text || text === "unknown" || text === "unsure") return null;
  if (/(degree|college|university|graduate|bachelor|master|phd|학위|대학|대학원|전문대)/i.test(text)) return "D-2";
  if (/(language|korean|non.?degree|training|연수|어학|한국어|비학위)/i.test(text)) return "D-4";
  return null;
}

export function normalizeRuleNationality(value: string | null | undefined): string | null {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return null;
  if (/^[a-z]{2}$/.test(text)) return text;
  return NATIONALITY_ALIASES[text] || text;
}

export function addVisaRuleDocument(map: Map<string, VisaRuleDocument>, doc: VisaRuleDocument) {
  const existing = map.get(doc.id);
  if (!existing) {
    map.set(doc.id, { ...doc, source_refs: [...doc.source_refs] });
    return;
  }
  map.set(doc.id, {
    ...existing,
    required: existing.required || doc.required,
    note: doc.note || existing.note,
    source_refs: Array.from(new Set([...existing.source_refs, ...doc.source_refs])),
  });
}

function collectRuleMeta(rule: VisaRuleDefinition, appliedRuleIds: string[], sourceRefs: Set<string>) {
  appliedRuleIds.push(rule.id);
  for (const source of rule.source_refs) sourceRefs.add(source);
}

function evaluationReviewStatus(ruleIds: string[]): VisaRuleReviewStatus {
  const applied = VISA_RULES.filter((rule) => ruleIds.includes(rule.id));
  if (applied.some((rule) => rule.review_status === "deprecated")) return "deprecated";
  if (applied.some((rule) => rule.review_status === "needs_review")) return "needs_review";
  return "approved";
}

export function evaluateVisaRules(input: VisaRuleInput): VisaRuleEvaluation {
  const appliedRuleIds: string[] = [];
  const requiredInputs = new Set<VisaRuleInputName>();
  const missingInputs = new Set<string>();
  const sourceRefs = new Set<string>();
  const documents = new Map<string, VisaRuleDocument>();
  const warnings: string[] = [];
  const partnerEscalationReasons: string[] = [];
  const blockedReasons: string[] = [];

  for (const rule of VISA_RULES) {
    for (const required of rule.required_inputs) requiredInputs.add(required);
  }

  const typeRule = VISA_RULES[0];
  collectRuleMeta(typeRule, appliedRuleIds, sourceRefs);
  const explicitVisaType = normalizeVisaType(input.visa_type);
  const inferredVisaType = explicitVisaType || inferVisaTypeFromProgram(input.program);
  const visaType = inferredVisaType;
  if (!visaType) {
    missingInputs.add("visa_type_or_program");
  }

  const coreDocRule = VISA_RULES[1];
  collectRuleMeta(coreDocRule, appliedRuleIds, sourceRefs);
  if (visaType) {
    for (const doc of CORE_DOCUMENTS) addVisaRuleDocument(documents, doc);
    if (visaType === "D-2") {
      for (const doc of D2_DOCUMENTS) addVisaRuleDocument(documents, doc);
    }
  } else {
    warnings.push("비자 종류(D-2/D-4)를 확인해야 최종 서류 체크리스트를 확정할 수 있습니다.");
  }

  const financialRule = VISA_RULES[2];
  collectRuleMeta(financialRule, appliedRuleIds, sourceRefs);
  if (visaType) {
    const threshold = visaType === "D-2" ? "20,000달러 이상" : "13,000달러 이상";
    addVisaRuleDocument(documents, {
      id: "financial_proof",
      label: "재정능력 증빙",
      required: true,
      note: `${threshold} 기준으로 준비하되, 학교·국적·공관별 추가 기준 확인 필요`,
      source_refs: [IMMIGRATION_RULE_ATTACHMENTS_SOURCE, STUDY_SOURCE],
    });
  }

  const tbRule = VISA_RULES[3];
  collectRuleMeta(tbRule, appliedRuleIds, sourceRefs);
  const nationality = normalizeRuleNationality(input.nationality);
  if (!nationality) {
    missingInputs.add("nationality");
    warnings.push("국적에 따라 결핵진단서 등 추가 서류가 달라질 수 있습니다.");
  } else if (TB_REQUIRED_NATIONALITIES.has(nationality)) {
    addVisaRuleDocument(documents, {
      id: "tuberculosis_certificate",
      label: "결핵진단서",
      required: true,
      note: "법무부 지정 병원 발급 및 유효기간 확인 필요",
      source_refs: [IMMIGRATION_RULE_ATTACHMENTS_SOURCE, STUDY_SOURCE, IMMIGRATION_SOURCE],
    });
  }

  const safetyRule = VISA_RULES[4];
  collectRuleMeta(safetyRule, appliedRuleIds, sourceRefs);
  if (input.asks_for_fake_documents) {
    blockedReasons.push("허위·위조 서류 요청은 처리할 수 없습니다.");
  }
  if (input.asks_for_illegal_work) {
    blockedReasons.push("불법취업 또는 무허가 취업 알선 요청은 처리할 수 없습니다.");
  }
  if (input.asks_for_visa_guarantee) {
    blockedReasons.push("비자 발급 보장 요청은 처리할 수 없습니다.");
  }
  if (input.has_refusal_history) {
    partnerEscalationReasons.push("과거 비자 거절/체류 이력은 행정사 검토가 필요한 고위험 사안입니다.");
  }
  if (input.requests_filing_representation) {
    partnerEscalationReasons.push("행정기관 제출서류 작성·제출 대행은 행정사 등 자격 있는 전문가 영역입니다.");
  }
  if (blockedReasons.length > 0) {
    warnings.push("불법·허위·보장성 요청은 KAXI에서 지원하지 않습니다.");
  }

  return {
    visa_type: visaType,
    required_inputs: Array.from(requiredInputs),
    missing_inputs: Array.from(missingInputs),
    applied_rule_ids: Array.from(new Set(appliedRuleIds)),
    effective_from: "2026-01-01",
    review_status: evaluationReviewStatus(appliedRuleIds),
    fallback_policy: VISA_RULES.map((rule) => `${rule.id}: ${rule.fallback_policy}`).join(" | "),
    source_refs: Array.from(sourceRefs),
    documents: Array.from(documents.values()),
    warnings,
    partner_escalation_reasons: partnerEscalationReasons,
    blocked_reasons: blockedReasons,
  };
}
