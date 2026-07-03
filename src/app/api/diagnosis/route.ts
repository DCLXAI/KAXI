import { NextRequest, NextResponse } from "next/server";
import { inferDiagnosisVisaType, recommendPath, type DiagnosisInput, type PathRecommendation } from "@/lib/data/diagnosis";
import { evaluateVisaRulesWithDbFallback } from "@/lib/rules/visa-rule-engine";

const EDUCATION_VALUES = ["highschool", "college", "university", "master"] as const;
const KOREAN_VALUES = ["none", "topik1", "topik2", "topik3"] as const;
const GOAL_VALUES = ["language", "degree", "transfer", "career", "unsure"] as const;
const REGION_VALUES = ["any", "seoul", "gyeonggi", "busan", "daegu", "gwangju", "other"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === "string" && values.includes(value as T);
}

function stringField(body: Record<string, unknown>, key: string, fallback = ""): string {
  const value = body[key];
  if (typeof value === "string") return value.trim().slice(0, 80);
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function numberField(body: Record<string, unknown>, key: string, fallback = 0): number {
  const value = body[key];
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/[,\s]/g, ""));
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  return fallback;
}

function booleanField(body: Record<string, unknown>, key: string): boolean {
  const value = body[key];
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["true", "yes", "1", "y"].includes(value.trim().toLowerCase());
  return false;
}

function parseDiagnosisInput(value: unknown): DiagnosisInput | null {
  if (!isRecord(value)) return null;
  if (!isOneOf(value.education, EDUCATION_VALUES)) return null;
  if (!isOneOf(value.korean, KOREAN_VALUES)) return null;
  if (!isOneOf(value.goal, GOAL_VALUES)) return null;

  return {
    nationality: stringField(value, "nationality", "other") || "other",
    age: stringField(value, "age", "20") || "20",
    education: value.education,
    korean: value.korean,
    goal: value.goal,
    budget: numberField(value, "budget", 0),
    region: isOneOf(value.region, REGION_VALUES) ? value.region : "any",
    usingBroker: booleanField(value, "usingBroker"),
    brokerCost: numberField(value, "brokerCost", 0),
    hasHistory: booleanField(value, "hasHistory"),
  };
}

function toPublicRecommendation(rec: PathRecommendation) {
  return {
    pathKey: rec.pathKey,
    visaType: rec.visaType,
    prepTime: rec.prepTime,
    estimatedCost: rec.estimatedCost,
    requiredDocs: rec.requiredDocs,
    warnings: rec.warnings,
    nextActions: rec.nextActions,
    riskLevel: rec.riskLevel,
    confidence: rec.confidence,
    complianceCoverage: {
      status: rec.complianceCoverage.status,
      visaType: rec.complianceCoverage.visaType,
      policy: rec.complianceCoverage.policy,
      unsupportedReason: rec.complianceCoverage.unsupportedReason,
    },
    compliance: rec.compliance
      ? {
          visaType: rec.compliance.visaType,
          requiredInputs: rec.compliance.requiredInputs,
          missingInputs: rec.compliance.missingInputs,
          reviewStatus: rec.compliance.reviewStatus,
          fallbackPolicy: rec.compliance.fallbackPolicy,
          documents: rec.compliance.documents.map((doc) => ({
            id: doc.id,
            label: doc.label,
            required: doc.required,
            note: doc.note,
          })),
          warnings: rec.compliance.warnings,
          partnerEscalationReasons: rec.compliance.partnerEscalationReasons,
          blockedReasons: rec.compliance.blockedReasons,
        }
      : undefined,
    readiness: rec.readiness
      ? {
          score: rec.readiness.score,
          riskLevel: rec.readiness.riskLevel,
          confidence: rec.readiness.confidence,
          factors: rec.readiness.factors,
        }
      : undefined,
  };
}

export async function POST(req: NextRequest) {
  try {
    const input = parseDiagnosisInput(await req.json().catch(() => null));
    if (!input) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const diagnosisVisaType = inferDiagnosisVisaType(input);

    const complianceVisaType = input.goal === "transfer" ? "D-4" : diagnosisVisaType;
    const complianceProgram =
      input.goal === "language" ? "language" : input.goal === "degree" || input.goal === "transfer" ? "degree" : undefined;

    const complianceEvaluation =
      diagnosisVisaType === "D-2" || diagnosisVisaType === "D-4"
        ? await evaluateVisaRulesWithDbFallback({
            visa_type: complianceVisaType,
            program: complianceProgram,
            nationality: input.nationality,
            has_refusal_history: input.hasHistory,
          })
        : null;

    const rec = recommendPath(input, { visaRuleEvaluation: complianceEvaluation });

    return NextResponse.json(toPublicRecommendation(rec));
  } catch (e) {
    console.error("[POST /api/diagnosis]", e);
    return NextResponse.json({ error: "Failed to compute diagnosis" }, { status: 500 });
  }
}
