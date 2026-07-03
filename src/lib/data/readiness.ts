import type { DiagnosisInput } from "./diagnosis";
import type { VisaRuleEvaluation } from "../rules/visa-rules";

export interface ReadinessComplianceSignals {
  sourceRefs?: string[];
  blockedReasons?: string[];
  partnerEscalationReasons?: string[];
  warnings?: string[];
  missingInputs?: string[];
}

// Readiness Score Types (0-100 Preparation Risk Index)
export interface ReadinessFactor {
  id: string;
  delta: number; // change to the final score (+ positive, - risk)
  category: "positive" | "risk";
  source: "internal" | "compliance" | "school";
  description?: string;
}

export interface ReadinessScore {
  score: number; // 0-100, higher = better (lower risk)
  riskLevel: "low" | "medium" | "high";
  confidence: "low" | "medium" | "high";
  factors: ReadinessFactor[];
  sourceRefs: string[];
}

export interface CalculateReadinessInput {
  input: DiagnosisInput;
  visaRuleEvaluation?: VisaRuleEvaluation | null;
  complianceSignals?: ReadinessComplianceSignals | null;
  selectedSchoolAccreditations?: ("accredited" | "standard" | "caution")[]; // Phase 2 integration
}

// Weights tuned for 0-100 scale (baseline 75)
// Fine-tuned based on rule severity, nationality/program impact, and compliance signals.
// Positive factors boost score; risks reduce it. Blocked always caps low via override.
// Adjust deltas for calibration against real visa outcome data if available.
const READINESS_WEIGHTS = {
  // Korean level risks (nationality/program sensitive)
  korean_low_d2: -18,           // D-2 with none/topik1
  degree_topik_gap: -12,        // D-2 low korean
  good_korean_d2: +12,          // D-2 good level

  // Financial
  budget_gap: -10,              // below 75% of estimate
  strong_budget: +8,            // >110%

  // History & broker
  visa_history: -22,            // past refusal
  broker_excessive: -8,         // >30% of estimate

  // Demographics
  minor_age: -9,                // <18

  // Compliance (strong)
  compliance_blocked: -35,      // hard block (fake/illegal/guarantee)
  compliance_escalation: -20,   // partner review needed
  compliance_warning_or_missing: -10,
} as const;

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function mapRiskLevel(score: number): "low" | "medium" | "high" {
  if (score >= 75) return "low";
  if (score >= 45) return "medium";
  return "high";
}

export function calculateReadinessScore(data: CalculateReadinessInput): ReadinessScore {
  const { input, visaRuleEvaluation, complianceSignals, selectedSchoolAccreditations } = data;
  let score = 75; // neutral starting point (good baseline)
  const factors: ReadinessFactor[] = [];
  const sourceRefs: string[] = [];
  const compliance = {
    sourceRefs: visaRuleEvaluation?.source_refs || complianceSignals?.sourceRefs || [],
    blockedReasons: visaRuleEvaluation?.blocked_reasons || complianceSignals?.blockedReasons || [],
    partnerEscalationReasons:
      visaRuleEvaluation?.partner_escalation_reasons || complianceSignals?.partnerEscalationReasons || [],
    warnings: visaRuleEvaluation?.warnings || complianceSignals?.warnings || [],
    missingInputs: visaRuleEvaluation?.missing_inputs || complianceSignals?.missingInputs || [],
    provided: Boolean(visaRuleEvaluation || complianceSignals),
  };

  const visaType = input.goal === "language" ? "D-4" : input.goal === "career" ? "D-10" : "D-2";

  // --- Internal diagnosis rules signals ---

  // Korean level
  if ((visaType === "D-2" || visaType === "D-10") && (input.korean === "none" || input.korean === "topik1")) {
    const delta = READINESS_WEIGHTS.korean_low_d2;
    score += delta;
    factors.push({
      id: "korean_low_for_degree",
      delta,
      category: "risk",
      source: "internal",
    });
  } else if (visaType === "D-2" && (input.korean === "topik2" || input.korean === "topik3")) {
    const delta = READINESS_WEIGHTS.good_korean_d2;
    score += delta;
    factors.push({
      id: "good_korean_for_d2",
      delta,
      category: "positive",
      source: "internal",
    });
  }

  // Budget
  const estimatedBase = visaType === "D-2" ? 12_000_000 : visaType === "D-4" ? 8_000_000 : 9_000_000;
  if (input.budget > 0 && input.budget < estimatedBase * 0.75) {
    const delta = READINESS_WEIGHTS.budget_gap;
    score += delta;
    factors.push({
      id: "budget_gap",
      delta,
      category: "risk",
      source: "internal",
    });
  } else if (input.budget >= estimatedBase * 1.1) {
    const delta = READINESS_WEIGHTS.strong_budget;
    score += delta;
    factors.push({
      id: "budget_strong",
      delta,
      category: "positive",
      source: "internal",
    });
  }

  // History
  if (input.hasHistory) {
    const delta = READINESS_WEIGHTS.visa_history;
    score += delta;
    factors.push({
      id: "visa_history",
      delta,
      category: "risk",
      source: "internal",
    });
  }

  // Broker
  if (input.usingBroker && input.brokerCost > estimatedBase * 0.3) {
    const delta = READINESS_WEIGHTS.broker_excessive;
    score += delta;
    factors.push({
      id: "broker_excessive",
      delta,
      category: "risk",
      source: "internal",
    });
  }

  // Minor
  const age = Number(input.age);
  if (age > 0 && age < 18) {
    const delta = READINESS_WEIGHTS.minor_age;
    score += delta;
    factors.push({
      id: "minor_age",
      delta,
      category: "risk",
      source: "internal",
    });
  }

  // School accreditation impact (when schools selected)
  if (selectedSchoolAccreditations && selectedSchoolAccreditations.length > 0) {
    const accreditedCount = selectedSchoolAccreditations.filter(a => a === "accredited").length;
    const cautionCount = selectedSchoolAccreditations.filter(a => a === "caution").length;
    if (accreditedCount > 0) {
      const delta = accreditedCount * 8;
      score += delta;
      factors.push({
        id: "school_accredited",
        delta,
        category: "positive",
        source: "school",
      });
    }
    if (cautionCount > 0) {
      const delta = cautionCount * -12;
      score += delta;
      factors.push({
        id: "school_caution",
        delta,
        category: "risk",
        source: "school",
      });
    }
  }

  // --- Compliance engine signals (highest weight) ---
  if (compliance.provided) {
    sourceRefs.push(...compliance.sourceRefs);

    if (compliance.blockedReasons.length > 0) {
      const delta = READINESS_WEIGHTS.compliance_blocked;
      score += delta;
      factors.push({
        id: "compliance_blocked",
        delta,
        category: "risk",
        source: "compliance",
        description: compliance.blockedReasons.join("; "),
      });
    }

    if (compliance.partnerEscalationReasons.length > 0) {
      const delta = READINESS_WEIGHTS.compliance_escalation;
      score += delta;
      factors.push({
        id: "compliance_escalation",
        delta,
        category: "risk",
        source: "compliance",
      });
    }

    if (compliance.warnings.length > 0 || compliance.missingInputs.length > 0) {
      const delta = READINESS_WEIGHTS.compliance_warning_or_missing;
      score += delta;
      factors.push({
        id: "compliance_gaps",
        delta,
        category: "risk",
        source: "compliance",
      });
    }

    // Positive from clean compliance (no issues)
    if (
      compliance.blockedReasons.length === 0 &&
      compliance.partnerEscalationReasons.length === 0 &&
      compliance.warnings.length === 0 &&
      compliance.missingInputs.length === 0
    ) {
      // mild positive
      score += 5;
      factors.push({
        id: "compliance_clean",
        delta: 5,
        category: "positive",
        source: "compliance",
      });
    }
  }

  let finalScore = clampScore(score);

  // P1 hard override for blocked reasons (must force low score)
  const hasBlocked = compliance.blockedReasons.length > 0;
  const hasEscalation = compliance.partnerEscalationReasons.length > 0;
  if (hasBlocked) {
    finalScore = Math.min(finalScore, 29);
  } else if (hasEscalation) {
    finalScore = Math.min(finalScore, 44);
  }

  let riskLevel = mapRiskLevel(finalScore);
  if (hasBlocked || hasEscalation) {
    riskLevel = "high";
  }

  // Derive confidence from existing logic (reuse spirit)
  let confidence: "low" | "medium" | "high" = "high";
  if (!compliance.provided || compliance.missingInputs.length > 0 || input.goal === "unsure") {
    confidence = "medium";
  }
  if (input.nationality === "other" || (input.budget && input.budget < estimatedBase * 0.5)) {
    confidence = "medium";
  }
  if (hasBlocked || hasEscalation) {
    confidence = "medium"; // at most medium
  }

  const sortedFactors = factors.sort((a, b) => {
    const absA = Math.abs(a.delta);
    const absB = Math.abs(b.delta);
    if (absA !== absB) return absB - absA;
    // risk factors first
    if (a.category !== b.category) return a.category === "risk" ? -1 : 1;
    return 0;
  });

  return {
    score: finalScore,
    riskLevel,
    confidence,
    factors: sortedFactors,
    sourceRefs: Array.from(new Set(sourceRefs)),
  };
}
