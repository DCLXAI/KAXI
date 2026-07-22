import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { inferDiagnosisVisaType, recommendPath, type PathRecommendation } from "@/lib/data/diagnosis";
import { evaluateVisaRulesWithDbFallback } from "@/lib/rules/visa-rule-engine";
import { maybeCreateHighRiskEscalationCase } from "@/lib/cases/high-risk-hook";
import { currentAuthenticatedStudentProfileId } from "@/lib/cases/current-student";
import { parseJsonBody } from "@/lib/api/validation";

const EDUCATION_VALUES = ["highschool", "college", "university", "master"] as const;
const KOREAN_VALUES = ["none", "topik1", "topik2", "topik3"] as const;
const GOAL_VALUES = ["language", "degree", "transfer", "career", "unsure", "in_korea_job", "in_korea_employment"] as const;
const REGION_VALUES = ["any", "seoul", "gyeonggi", "busan", "daegu", "gwangju", "other"] as const;

// The following preprocessors reproduce the exact fallback/coercion behaviour
// of the hand-rolled stringField/numberField/booleanField/region helpers this
// route used to have, so previously-accepted inputs (e.g. comma-formatted
// numbers like "6,000,000", or truthy strings for booleans) keep working
// identically. Unlike z.coerce.number()/z.coerce.boolean(), these never
// reject — they silently fall back, matching the prior behaviour for
// non-required fields.
function stringFieldSchema(fallback: string) {
  return z.preprocess((value) => {
    let s: string;
    if (typeof value === "string") s = value.trim().slice(0, 80);
    else if (typeof value === "number" && Number.isFinite(value)) s = String(value);
    else s = fallback;
    return s || fallback;
  }, z.string());
}

function numberFieldSchema(fallback: number) {
  return z.preprocess((value) => {
    if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value);
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value.replace(/[,\s]/g, ""));
      if (Number.isFinite(parsed)) return Math.max(0, parsed);
    }
    return fallback;
  }, z.number());
}

function booleanFieldSchema() {
  return z.preprocess((value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return ["true", "yes", "1", "y"].includes(value.trim().toLowerCase());
    return false;
  }, z.boolean());
}

function regionFieldSchema() {
  return z.preprocess(
    (value) => (typeof value === "string" && (REGION_VALUES as readonly string[]).includes(value) ? value : "any"),
    z.enum(REGION_VALUES)
  );
}

// education/korean/goal are required and must reject (400) when missing or
// invalid, matching the prior isOneOf(...) ?? return null short-circuit.
const diagnosisSchema = z.object({
  nationality: stringFieldSchema("other"),
  age: stringFieldSchema("20"),
  education: z.enum(EDUCATION_VALUES),
  korean: z.enum(KOREAN_VALUES),
  goal: z.enum(GOAL_VALUES),
  budget: numberFieldSchema(0),
  region: regionFieldSchema(),
  usingBroker: booleanFieldSchema(),
  brokerCost: numberFieldSchema(0),
  hasHistory: booleanFieldSchema(),
});

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
    const parsed = await parseJsonBody(req, diagnosisSchema);
    if (!parsed.ok) return parsed.response;
    const input = parsed.data;

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
    if (rec.riskLevel === "high" || rec.readiness?.riskLevel === "high") {
      const studentProfileId = await currentAuthenticatedStudentProfileId();
      maybeCreateHighRiskEscalationCase({
        studentProfileId,
        category: `diagnosis:${rec.visaType}`,
        summary: `${rec.visaType} 진단 고위험 판정`,
        conversationSummary: rec.warnings.map((warning) => warning.ko).join("\n").slice(0, 4000),
        ruleSnapshot: toPublicRecommendation(rec),
        source: "diagnosis",
      }).catch((err) => {
        console.warn("[diagnosis high-risk escalation skipped]", err instanceof Error ? err.message : err);
      });
    }

    return NextResponse.json(toPublicRecommendation(rec));
  } catch (e) {
    console.error("[POST /api/diagnosis]", e);
    return NextResponse.json({ error: "Failed to compute diagnosis" }, { status: 500 });
  }
}
