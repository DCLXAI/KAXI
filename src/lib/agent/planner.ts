import type { Lang } from "@/lib/i18n/translations";
import { extractAgentSlots } from "@/lib/agent/slot-extraction";
import type { AgentEducation, AgentGoal, AgentKoreanLevel, AgentVisaType } from "@/lib/agent/slot-extraction";

export {
  detectAccreditation,
  detectNationality,
  detectProgram,
  detectRegion,
  detectSchoolName,
  detectVisaType,
  extractAgentSlots,
  parseKrwBudget,
} from "@/lib/agent/slot-extraction";

export type PlannedToolName =
  | "search_schools"
  | "calculate_cost"
  | "get_documents"
  | "search_knowledge"
  | "diagnose_path"
  | "request_partner";

export interface PlannedToolCall {
  tool: PlannedToolName;
  args: Record<string, unknown>;
  reason: string;
}

export type AgentIntentConfidence = "low" | "medium" | "high";

export type AgentMissingSlot =
  | "region"
  | "program"
  | "budget"
  | "visa_type"
  | "nationality"
  | "education"
  | "korean_level"
  | "goal";

export interface AgentIntentAnalysis {
  text: string;
  smallTalk: boolean;
  safety: boolean;
  school: boolean;
  cost: boolean;
  documents: boolean;
  knowledge: boolean;
  diagnosis: boolean;
  partner: boolean;
  budget?: number;
  schoolName?: string;
  region: string;
  program: string;
  accreditation: string;
  visaType: AgentVisaType;
  nationality: string;
  partnerType: string;
  education: AgentEducation;
  koreanLevel: AgentKoreanLevel;
  goal: AgentGoal;
  usingBroker: boolean;
  hasHistory: boolean;
  confidence: AgentIntentConfidence;
  missingSlots: AgentMissingSlot[];
  plan: PlannedToolCall[];
}

function buildToolPlan(question: string, slots: ReturnType<typeof extractAgentSlots>): PlannedToolCall[] {
  const {
    budget,
    schoolName,
    region,
    program,
    accreditation,
    visaType,
    nationality,
    partnerType,
    education,
    koreanLevel,
    goal,
    usingBroker,
    hasHistory,
    signals,
  } = slots;

  const plan: PlannedToolCall[] = [];
  if (signals.smallTalk) return plan;

  if (signals.school || signals.cost) {
    plan.push({
      tool: "search_schools",
      args: {
        region,
        program,
        accreditation,
        max_tuition: budget,
        school_name: schoolName,
        limit: signals.cost ? 3 : 5,
      },
      reason: "school_or_cost_request",
    });
  }

  if (signals.diagnosis) {
    plan.push({
      tool: "diagnose_path",
      args: {
        nationality,
        education,
        korean_level: koreanLevel,
        goal,
        budget: budget || 10_000_000,
        using_broker: usingBroker,
        broker_cost: usingBroker ? budget || 0 : 0,
        has_history: hasHistory,
      },
      reason: "personalized_path_request",
    });
  }

  if (signals.documents) {
    plan.push({
      tool: "get_documents",
      args: { visa_type: visaType, nationality },
      reason: "visa_document_request",
    });
  }

  if (signals.knowledge || plan.length === 0) {
    plan.push({
      tool: "search_knowledge",
      args: { query: question, top_k: signals.knowledge ? 4 : 3 },
      reason: signals.knowledge ? "official_knowledge_required" : "fallback_knowledge_search",
    });
  }

  if (signals.partner) {
    plan.push({
      tool: "request_partner",
      args: { partner_type: partnerType, question },
      reason: "partner_consultation_request",
    });
  }

  return plan;
}

function detectMissingSlots(slots: ReturnType<typeof extractAgentSlots>): AgentMissingSlot[] {
  const { budget, schoolName, region, program, nationality, signals } = slots;
  const missingSlots = new Set<AgentMissingSlot>();

  if ((signals.school || signals.cost) && !schoolName && region === "all") missingSlots.add("region");
  if (signals.school && !schoolName && program === "all") missingSlots.add("program");
  if (signals.budgetSignal && !budget) missingSlots.add("budget");
  if (signals.documents && !signals.explicitVisaType) missingSlots.add("visa_type");
  if ((signals.documents || signals.diagnosis) && nationality === "other") missingSlots.add("nationality");
  if (signals.diagnosis && !signals.educationSignal) missingSlots.add("education");
  if (signals.diagnosis && !signals.koreanLevelSignal) missingSlots.add("korean_level");
  if (signals.diagnosis && !signals.goalSignal) missingSlots.add("goal");

  return Array.from(missingSlots);
}

function confidenceFor(
  slots: ReturnType<typeof extractAgentSlots>,
  plan: PlannedToolCall[],
  missingSlots: AgentMissingSlot[]
): AgentIntentConfidence {
  if (slots.signals.smallTalk || slots.signals.safety) return "high";
  if (plan.length === 0 || missingSlots.length >= 3) return "low";
  if (missingSlots.length > 0) return "medium";
  return "high";
}

export function analyzeAgentIntent(question: string, lang?: Lang): AgentIntentAnalysis {
  void lang;
  const slots = extractAgentSlots(question);
  const plan = buildToolPlan(question, slots);
  const missingSlots = detectMissingSlots(slots);
  const confidence = confidenceFor(slots, plan, missingSlots);
  const { signals } = slots;

  return {
    text: slots.text,
    smallTalk: signals.smallTalk,
    safety: signals.safety,
    school: signals.school,
    cost: signals.cost,
    documents: signals.documents,
    knowledge: signals.knowledge,
    diagnosis: signals.diagnosis,
    partner: signals.partner,
    budget: slots.budget,
    schoolName: slots.schoolName,
    region: slots.region,
    program: slots.program,
    accreditation: slots.accreditation,
    visaType: slots.visaType,
    nationality: slots.nationality,
    partnerType: slots.partnerType,
    education: slots.education,
    koreanLevel: slots.koreanLevel,
    goal: slots.goal,
    usingBroker: slots.usingBroker,
    hasHistory: slots.hasHistory,
    confidence,
    missingSlots,
    plan,
  };
}
