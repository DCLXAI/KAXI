import { createHash } from "crypto";
import { Prisma, RiskLevel } from "@prisma/client";
import { db } from "../db";
import {
  evaluateComplianceCondition,
  parseComplianceConditionAst,
  parseComplianceOutputAst,
  type ComplianceOutputAst,
  type ComplianceRiskLevel,
  type VisaComplianceOutputOperation,
} from "./compliance-dsl";
import { VISA_COMPLIANCE_RULE_ORDER } from "./visa-rule-seed";
import {
  CORE_DOCUMENTS,
  D2_DOCUMENTS,
  IMMIGRATION_ACT_PERMISSION_SOURCE,
  IMMIGRATION_SOURCE,
  IMMIGRATION_RULE_ATTACHMENTS_SOURCE,
  IMMIGRATION_DECREE_STATUS_SOURCE,
  STUDY_SOURCE,
  TB_REQUIRED_NATIONALITIES,
  addVisaRuleDocument,
  evaluateVisaRules,
  inferVisaTypeFromProgram,
  normalizeRuleNationality,
  normalizeVisaType,
  type VisaRuleDocument,
  type VisaRuleEvaluation,
  type VisaRuleInput,
  type VisaRuleInputName,
  type VisaRuleReviewStatus,
  type VisaType,
} from "./visa-rules";

type RuleVersionWithRule = Prisma.ComplianceRuleVersionGetPayload<{ include: { rule: true } }>;

interface AppliedRuleVersion {
  code: string;
  id: string;
  fallbackPolicy: string;
  sourceRefs: string[];
  requiredInputs: VisaRuleInputName[];
  effectiveFrom: Date;
  riskLevel: ComplianceRiskLevel;
  outputAst: ComplianceOutputAst;
}

interface VisaRuleEngineState {
  visaType: VisaType | null;
  requiredInputs: Set<VisaRuleInputName>;
  missingInputs: Set<string>;
  appliedRuleIds: string[];
  sourceRefs: Set<string>;
  documents: Map<string, VisaRuleDocument>;
  warnings: string[];
  partnerEscalationReasons: string[];
  blockedReasons: string[];
}

function isDegreeProgram(program: string | null | undefined): boolean {
  return /(degree|college|university|graduate|bachelor|master|phd|학위|대학|대학원|전문대)/i.test(
    String(program || "")
  );
}

function isVocationalProgram(program: string | null | undefined): boolean {
  return /(vocational|career|caregiver|요양|직업|직업훈련)/i.test(String(program || ""));
}

export interface EvaluateVisaRulesFromDbOptions {
  referenceDate?: Date;
  studentProfileId?: string;
  persistEvaluation?: boolean;
}

export class ComplianceRuleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ComplianceRuleValidationError";
  }
}

export class ComplianceRuleUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ComplianceRuleUnavailableError";
  }
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function asRequiredInputs(value: unknown): VisaRuleInputName[] {
  return asStringArray(value) as VisaRuleInputName[];
}

function ruleOrder(code: string): number {
  const index = VISA_COMPLIANCE_RULE_ORDER.indexOf(code);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function assertRuleVersionExecutable(version: RuleVersionWithRule) {
  const sourceRefs = asStringArray(version.sourceRefs);
  const requiredInputs = asRequiredInputs(version.requiredInputs);
  if (version.reviewStatus !== "APPROVED") {
    throw new ComplianceRuleValidationError(`${version.rule.code}@v${version.version} is not approved.`);
  }
  if (sourceRefs.length === 0) {
    throw new ComplianceRuleValidationError(`${version.rule.code}@v${version.version} missing sourceRefs.`);
  }
  if (requiredInputs.length === 0) {
    throw new ComplianceRuleValidationError(`${version.rule.code}@v${version.version} missing requiredInputs.`);
  }
  if (!version.fallbackPolicy.trim()) {
    throw new ComplianceRuleValidationError(`${version.rule.code}@v${version.version} missing fallbackPolicy.`);
  }
}

function toFacts(input: VisaRuleInput): Record<string, unknown> {
  return {
    ...input,
    visa_type_normalized: normalizeVisaType(input.visa_type),
    nationality_normalized: normalizeRuleNationality(input.nationality),
  };
}

function toPrismaRiskLevel(value: ComplianceRiskLevel): RiskLevel {
  switch (value) {
    case "LOW":
      return RiskLevel.LOW;
    case "MEDIUM":
      return RiskLevel.MEDIUM;
    case "HIGH":
      return RiskLevel.HIGH;
    case "UNKNOWN":
      return RiskLevel.UNKNOWN;
  }
}

function hashJson(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function loadApprovedActiveVisaRuleVersions(referenceDate: Date): Promise<RuleVersionWithRule[]> {
  const versions = await db.complianceRuleVersion.findMany({
    where: {
      reviewStatus: "APPROVED",
      effectiveFrom: { lte: referenceDate },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: referenceDate } }],
      rule: {
        domain: "student_visa",
        status: "ACTIVE",
        visaType: { in: ["D-2", "D-4", "D-2/D-4"] },
      },
    },
    include: { rule: true },
  });

  return versions.sort((a, b) => {
    const byOrder = ruleOrder(a.rule.code) - ruleOrder(b.rule.code);
    if (byOrder !== 0) return byOrder;
    return a.rule.code.localeCompare(b.rule.code) || a.version - b.version;
  });
}

function applyOperation(
  operation: VisaComplianceOutputOperation,
  input: VisaRuleInput,
  state: VisaRuleEngineState
): ComplianceRiskLevel | null {
  switch (operation.op) {
    case "infer_visa_type_from_program": {
      const explicitVisaType = normalizeVisaType(input.visa_type);
      state.visaType = explicitVisaType || inferVisaTypeFromProgram(input.program);
      if (!state.visaType) state.missingInputs.add("visa_type_or_program");
      return "LOW";
    }
    case "add_core_documents": {
      if (!state.visaType) {
        state.warnings.push("비자 종류(D-2/D-4)를 확인해야 최종 서류 체크리스트를 확정할 수 있습니다.");
        return "UNKNOWN";
      }
      for (const doc of CORE_DOCUMENTS) addVisaRuleDocument(state.documents, doc);
      if (state.visaType === "D-2") {
        for (const doc of D2_DOCUMENTS) addVisaRuleDocument(state.documents, doc);
      }
      return "LOW";
    }
    case "add_financial_proof": {
      if (!state.visaType) return "UNKNOWN";
      const threshold = state.visaType === "D-2" ? "20,000달러 이상" : "13,000달러 이상";
      addVisaRuleDocument(state.documents, {
        id: "financial_proof",
        label: "재정능력 증빙",
        required: true,
        note: `${threshold} 기준으로 준비하되, 학교·국적·공관별 추가 기준 확인 필요`,
        source_refs: [IMMIGRATION_RULE_ATTACHMENTS_SOURCE, STUDY_SOURCE],
      });
      return "MEDIUM";
    }
    case "add_ongoing_financial_proof": {
      if (!state.visaType) return "UNKNOWN";
      const threshold = state.visaType === "D-2" ? "20,000달러 이상" : "13,000달러 이상";
      addVisaRuleDocument(state.documents, {
        id: "financial_proof",
        label: "재정능력 증빙 (지속 유지)",
        required: true,
        note: `${threshold} 기준 유지 필요. 연장 시 재확인될 수 있음`,
        source_refs: [IMMIGRATION_RULE_ATTACHMENTS_SOURCE, STUDY_SOURCE],
      });
      return "MEDIUM";
    }
    case "add_tuberculosis_document": {
      const nationality = normalizeRuleNationality(input.nationality);
      if (!nationality) {
        state.missingInputs.add("nationality");
        state.warnings.push("국적에 따라 결핵진단서 등 추가 서류가 달라질 수 있습니다.");
        return "UNKNOWN";
      }
      if (TB_REQUIRED_NATIONALITIES.has(nationality)) {
        addVisaRuleDocument(state.documents, {
          id: "tuberculosis_certificate",
          label: "결핵진단서",
          required: true,
          note: "법무부 지정 병원 발급 및 유효기간 확인 필요",
          source_refs: [IMMIGRATION_RULE_ATTACHMENTS_SOURCE, STUDY_SOURCE, IMMIGRATION_SOURCE],
        });
        return "MEDIUM";
      }
      return "LOW";
    }
    case "apply_safety_escalation": {
      const previousEscalationCount = state.partnerEscalationReasons.length;
      const previousBlockedCount = state.blockedReasons.length;
      if (input.asks_for_fake_documents) {
        state.blockedReasons.push("허위·위조 서류 요청은 처리할 수 없습니다.");
      }
      if (input.asks_for_illegal_work) {
        state.blockedReasons.push("불법취업 또는 무허가 취업 알선 요청은 처리할 수 없습니다.");
      }
      if (input.asks_for_visa_guarantee) {
        state.blockedReasons.push("비자 발급 보장 요청은 처리할 수 없습니다.");
      }
      if (input.has_refusal_history) {
        state.partnerEscalationReasons.push("과거 비자 거절/체류 이력은 행정사 검토가 필요한 고위험 사안입니다.");
      }
      if (input.requests_filing_representation) {
        state.partnerEscalationReasons.push("행정기관 제출서류 작성·제출 대행은 행정사 등 자격 있는 전문가 영역입니다.");
      }
      if (state.blockedReasons.length > previousBlockedCount) {
        state.warnings.push("불법·허위·보장성 요청은 KAXI에서 지원하지 않습니다.");
      }
      if (
        state.blockedReasons.length > previousBlockedCount ||
        state.partnerEscalationReasons.length > previousEscalationCount
      ) {
        return "HIGH";
      }
      return "LOW";
    }
    case "add_language_proof": {
      if (!state.visaType) return "UNKNOWN";
      if (state.visaType === "D-2") {
        addVisaRuleDocument(state.documents, {
          id: "language_proficiency",
          label: "한국어능력증빙 (TOPIK 또는 학교 인정 증명)",
          required: true,
          note: "D-2 학위 과정은 학교별 TOPIK/영어 요건 확인 필수. 일반적으로 TOPIK 3급 이상 권장",
          source_refs: [IMMIGRATION_DECREE_STATUS_SOURCE, STUDY_SOURCE],
        });
        return "MEDIUM";
      }
      return "LOW";
    }
    case "add_insurance_proof": {
      addVisaRuleDocument(state.documents, {
        id: "health_insurance",
        label: "건강보험 가입 증빙",
        required: true,
        note: "국민건강보험 또는 동등한 민간보험 가입 증명. 등록 후 즉시 가입 권장",
        source_refs: [IMMIGRATION_RULE_ATTACHMENTS_SOURCE, STUDY_SOURCE],
      });
      return "LOW";
    }
    case "add_vn_mn_d2_scrutiny": {
      const nationality = normalizeRuleNationality(input.nationality);
      if (state.visaType !== "D-2" || (nationality !== "vn" && nationality !== "mn")) return "LOW";
      addVisaRuleDocument(state.documents, {
        id: "vn_mn_additional_scrutiny",
        label: "베트남/몽골 D-2 추가 심사 서류",
        required: true,
        note: "VN/MN 국적 D-2 신청자는 대사관별 추가 재정/학력 증빙 필요",
        source_refs: [IMMIGRATION_DECREE_STATUS_SOURCE, STUDY_SOURCE, IMMIGRATION_SOURCE],
      });
      state.warnings.push("VN/MN 국적 D-2는 추가 심사 기준이 적용될 수 있습니다.");
      return "MEDIUM";
    }
    case "add_vocational_d2_proof": {
      if (state.visaType !== "D-2" || !isVocationalProgram(input.program)) return "LOW";
      addVisaRuleDocument(state.documents, {
        id: "vocational_career_proof",
        label: "직업계열 관련성 증빙",
        required: true,
        note: "직업훈련 D-2는 경력/학력과 프로그램 연계 증명 필요",
        source_refs: [IMMIGRATION_DECREE_STATUS_SOURCE, STUDY_SOURCE],
      });
      return "MEDIUM";
    }
    case "add_d4_to_d2_transfer_docs": {
      const explicitVisaType = normalizeVisaType(input.visa_type);
      if (explicitVisaType !== "D-4" || !isDegreeProgram(input.program)) return "LOW";
      addVisaRuleDocument(state.documents, {
        id: "d4_d2_transfer_docs",
        label: "D-4 → D-2 전환 관련 서류",
        required: true,
        note: "D-4에서 D-2로 변경 시 학업 진척도, 공백 없음, 재정 증빙 필수",
        source_refs: [IMMIGRATION_ACT_PERMISSION_SOURCE, IMMIGRATION_DECREE_STATUS_SOURCE, STUDY_SOURCE],
      });
      state.warnings.push("D-4 to D-2 전환은 타이밍과 서류가 중요합니다. 행정사 검토 권장.");
      state.partnerEscalationReasons.push("D-4에서 D-2 체류자격 변경은 현재 체류상태·출석률·공백 여부 검토가 필요합니다.");
      return "HIGH";
    }
  }
}

function applyOutputAst(
  outputAst: ComplianceOutputAst,
  input: VisaRuleInput,
  state: VisaRuleEngineState
): ComplianceRiskLevel {
  let riskLevel = outputAst.riskLevel;
  for (const operation of outputAst.operations) {
    const operationRisk = applyOperation(operation, input, state);
    if (operationRisk === "HIGH") return "HIGH";
    if (operationRisk === "MEDIUM" && riskLevel !== "HIGH") riskLevel = "MEDIUM";
    if (operationRisk === "UNKNOWN" && riskLevel === "LOW") riskLevel = "UNKNOWN";
    if (operationRisk === "LOW" && outputAst.riskLevel === "HIGH") riskLevel = "LOW";
  }
  return riskLevel;
}

function buildEvaluation(state: VisaRuleEngineState, appliedVersions: AppliedRuleVersion[]): VisaRuleEvaluation {
  const effectiveFrom =
    appliedVersions
      .map((version) => version.effectiveFrom.toISOString().slice(0, 10))
      .sort()[0] || "unknown";

  const reviewStatus: VisaRuleReviewStatus = "approved";

  return {
    visa_type: state.visaType,
    required_inputs: Array.from(state.requiredInputs),
    missing_inputs: Array.from(state.missingInputs),
    applied_rule_ids: Array.from(new Set(state.appliedRuleIds)),
    effective_from: effectiveFrom,
    review_status: reviewStatus,
    fallback_policy: appliedVersions.map((version) => `${version.code}: ${version.fallbackPolicy}`).join(" | "),
    source_refs: Array.from(state.sourceRefs),
    documents: Array.from(state.documents.values()),
    warnings: state.warnings,
    partner_escalation_reasons: state.partnerEscalationReasons,
    blocked_reasons: state.blockedReasons,
  };
}

async function persistEvaluations(
  studentProfileId: string,
  input: VisaRuleInput,
  evaluation: VisaRuleEvaluation,
  appliedVersions: AppliedRuleVersion[]
) {
  const inputHash = hashJson(input);
  const outputHash = hashJson(evaluation);

  for (const version of appliedVersions) {
    await db.complianceEvaluation.create({
      data: {
        studentProfileId,
        ruleVersionId: version.id,
        inputSnapshot: toInputJson(input),
        outputSnapshot: toInputJson({
          ...evaluation,
          persisted_rule_code: version.code,
          output_ast: version.outputAst,
        }),
        riskLevel: toPrismaRiskLevel(version.riskLevel),
        inputHash,
        outputHash,
      },
    });
  }
}

export async function evaluateVisaRulesFromDb(
  input: VisaRuleInput,
  options: EvaluateVisaRulesFromDbOptions = {}
): Promise<VisaRuleEvaluation> {
  const referenceDate = options.referenceDate || new Date();
  const versions = await loadApprovedActiveVisaRuleVersions(referenceDate);
  if (versions.length === 0) {
    throw new ComplianceRuleUnavailableError("No approved active D-2/D-4 compliance rule versions are available.");
  }

  const state: VisaRuleEngineState = {
    visaType: null,
    requiredInputs: new Set<VisaRuleInputName>(),
    missingInputs: new Set<string>(),
    appliedRuleIds: [],
    sourceRefs: new Set<string>(),
    documents: new Map<string, VisaRuleDocument>(),
    warnings: [],
    partnerEscalationReasons: [],
    blockedReasons: [],
  };
  const appliedVersions: AppliedRuleVersion[] = [];
  const facts = toFacts(input);

  for (const version of versions) {
    assertRuleVersionExecutable(version);
    const sourceRefs = asStringArray(version.sourceRefs);
    const requiredInputs = asRequiredInputs(version.requiredInputs);
    for (const requiredInput of requiredInputs) state.requiredInputs.add(requiredInput);

    const conditionAst = parseComplianceConditionAst(version.conditionAst);
    if (!evaluateComplianceCondition(conditionAst, facts)) continue;

    const outputAst = parseComplianceOutputAst(version.outputAst);
    for (const sourceRef of sourceRefs) state.sourceRefs.add(sourceRef);
    state.appliedRuleIds.push(version.rule.code);
    const riskLevel = applyOutputAst(outputAst, input, state);
    appliedVersions.push({
      code: version.rule.code,
      id: version.id,
      fallbackPolicy: version.fallbackPolicy,
      sourceRefs,
      requiredInputs,
      effectiveFrom: version.effectiveFrom,
      riskLevel,
      outputAst,
    });
  }

  const evaluation = buildEvaluation(state, appliedVersions);
  if (options.persistEvaluation && options.studentProfileId) {
    await persistEvaluations(options.studentProfileId, input, evaluation, appliedVersions);
  }
  return evaluation;
}

export async function evaluateVisaRulesWithDbFallback(
  input: VisaRuleInput,
  options: EvaluateVisaRulesFromDbOptions = {}
): Promise<VisaRuleEvaluation> {
  try {
    return await evaluateVisaRulesFromDb(input, options);
  } catch (err) {
    if (err instanceof ComplianceRuleValidationError) throw err;
    return evaluateVisaRules(input);
  }
}
