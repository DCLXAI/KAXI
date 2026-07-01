import type { ComplianceConditionAst, ComplianceOutputAst } from "./compliance-dsl";
import { VISA_RULES, type VisaRuleInputName } from "./visa-rules";

export interface VisaComplianceRuleSeed {
  code: string;
  domain: "student_visa";
  visaType: "D-2/D-4";
  ruleType: string;
  status: "ACTIVE";
  version: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  conditionAst: ComplianceConditionAst;
  outputAst: ComplianceOutputAst;
  requiredInputs: VisaRuleInputName[];
  sourceRefs: string[];
  fallbackPolicy: string;
  reviewStatus: "APPROVED";
  reviewedBy: string;
  reviewedAt: string;
}

const REVIEWED_BY = "partner_agent_001";
const REVIEWED_AT = "2026-07-01T00:00:00.000Z";

function ruleById(id: string) {
  const rule = VISA_RULES.find((candidate) => candidate.id === id);
  if (!rule) throw new Error(`Missing static visa rule seed source: ${id}`);
  return rule;
}

function seed(
  id: string,
  ruleType: string,
  outputAst: ComplianceOutputAst
): VisaComplianceRuleSeed {
  const rule = ruleById(id);
  return {
    code: rule.id,
    domain: "student_visa",
    visaType: "D-2/D-4",
    ruleType,
    status: "ACTIVE",
    version: 1,
    effectiveFrom: `${rule.effective_from}T00:00:00.000Z`,
    effectiveTo: null,
    conditionAst: { op: "always" },
    outputAst,
    requiredInputs: [...rule.required_inputs],
    sourceRefs: [...rule.source_refs],
    fallbackPolicy: rule.fallback_policy,
    reviewStatus: "APPROVED",
    reviewedBy: REVIEWED_BY,
    reviewedAt: REVIEWED_AT,
  };
}

export const VISA_COMPLIANCE_RULE_SEEDS: VisaComplianceRuleSeed[] = [
  seed("visa-type-from-program", "visa_type_inference", {
    riskLevel: "LOW",
    resultType: "visa_rule",
    messageKey: "visa_type_from_program",
    requiresHumanReview: false,
    operations: [{ op: "infer_visa_type_from_program" }],
  }),
  seed("core-document-checklist", "document_checklist", {
    riskLevel: "LOW",
    resultType: "document_required",
    messageKey: "core_document_checklist",
    requiresHumanReview: false,
    operations: [{ op: "add_core_documents" }],
  }),
  seed("financial-proof-threshold", "financial_proof", {
    riskLevel: "MEDIUM",
    resultType: "document_required",
    messageKey: "financial_proof_threshold",
    requiresHumanReview: false,
    operations: [{ op: "add_financial_proof" }],
  }),
  seed("tuberculosis-certificate-by-nationality", "nationality_document", {
    riskLevel: "MEDIUM",
    resultType: "document_required",
    messageKey: "tuberculosis_certificate_by_nationality",
    requiresHumanReview: false,
    operations: [{ op: "add_tuberculosis_document" }],
  }),
  seed("safety-and-admin-scrivener-escalation", "safety_escalation", {
    riskLevel: "HIGH",
    resultType: "human_review_required",
    messageKey: "safety_and_admin_scrivener_escalation",
    requiresHumanReview: true,
    operations: [{ op: "apply_safety_escalation" }],
  }),
];

export const VISA_COMPLIANCE_RULE_ORDER = VISA_COMPLIANCE_RULE_SEEDS.map((rule) => rule.code);
