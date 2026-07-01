export type ComplianceFieldValue = string | number | boolean | null | undefined | string[] | number[] | boolean[];

export type ComplianceConditionAst =
  | { op: "always" }
  | { op: "eq"; field: string; value: unknown }
  | { op: "neq"; field: string; value: unknown }
  | { op: "gte"; field: string; value: number }
  | { op: "lte"; field: string; value: number }
  | { op: "in"; field: string; value: unknown[] }
  | { op: "exists"; field: string }
  | { op: "truthy"; field: string }
  | { op: "falsy"; field: string }
  | { op: "all"; conditions: ComplianceConditionAst[] }
  | { op: "any"; conditions: ComplianceConditionAst[] }
  | { op: "not"; condition: ComplianceConditionAst };

export type ComplianceRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";

export type ComplianceResultType =
  | "visa_rule"
  | "document_required"
  | "permit_required"
  | "deadline"
  | "human_review_required";

export type VisaComplianceOutputOperation =
  | { op: "infer_visa_type_from_program" }
  | { op: "add_core_documents" }
  | { op: "add_financial_proof" }
  | { op: "add_tuberculosis_document" }
  | { op: "apply_safety_escalation" };

export interface ComplianceOutputAst {
  riskLevel: ComplianceRiskLevel;
  resultType: ComplianceResultType;
  messageKey: string;
  requiresHumanReview: boolean;
  operations: VisaComplianceOutputOperation[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function getComplianceFact(facts: Record<string, unknown>, field: string): unknown {
  return field.split(".").reduce<unknown>((current, segment) => {
    if (!isRecord(current)) return undefined;
    return current[segment];
  }, facts);
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function evaluateComplianceCondition(
  condition: ComplianceConditionAst,
  facts: Record<string, unknown>
): boolean {
  switch (condition.op) {
    case "always":
      return true;
    case "eq":
      return getComplianceFact(facts, condition.field) === condition.value;
    case "neq":
      return getComplianceFact(facts, condition.field) !== condition.value;
    case "gte": {
      const value = asFiniteNumber(getComplianceFact(facts, condition.field));
      return value !== null && value >= condition.value;
    }
    case "lte": {
      const value = asFiniteNumber(getComplianceFact(facts, condition.field));
      return value !== null && value <= condition.value;
    }
    case "in":
      return condition.value.includes(getComplianceFact(facts, condition.field));
    case "exists": {
      const value = getComplianceFact(facts, condition.field);
      return value !== undefined && value !== null && value !== "";
    }
    case "truthy":
      return Boolean(getComplianceFact(facts, condition.field));
    case "falsy":
      return !getComplianceFact(facts, condition.field);
    case "all":
      return condition.conditions.every((child) => evaluateComplianceCondition(child, facts));
    case "any":
      return condition.conditions.some((child) => evaluateComplianceCondition(child, facts));
    case "not":
      return !evaluateComplianceCondition(condition.condition, facts);
  }
}

export function parseComplianceConditionAst(value: unknown): ComplianceConditionAst {
  if (!isRecord(value) || typeof value.op !== "string") {
    throw new Error("conditionAst must be an object with an op field.");
  }
  return value as ComplianceConditionAst;
}

export function parseComplianceOutputAst(value: unknown): ComplianceOutputAst {
  if (!isRecord(value) || !Array.isArray(value.operations)) {
    throw new Error("outputAst must include an operations array.");
  }
  return value as unknown as ComplianceOutputAst;
}
