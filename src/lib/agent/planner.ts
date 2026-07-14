import type { Lang } from "@/lib/i18n/translations";
import { extractAgentSlots, isDocumentMatrixVisaType } from "@/lib/agent/slot-extraction";
import type {
  AgentEducation,
  AgentGoal,
  AgentIntentSignals,
  AgentKoreanLevel,
  AgentVisaType,
} from "@/lib/agent/slot-extraction";

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
export type AgentIntentSignalName = keyof AgentIntentSignals;

export type AgentMissingSlot =
  | "region"
  | "program"
  | "budget"
  | "visa_type"
  | "nationality"
  | "education"
  | "korean_level"
  | "goal";

export type AgentSlotName =
  | "budget"
  | "schoolName"
  | "region"
  | "program"
  | "accreditation"
  | "visaType"
  | "nationality"
  | "partnerType"
  | "education"
  | "koreanLevel"
  | "goal"
  | "usingBroker"
  | "hasHistory";

export type AgentSlotStatus = "resolved" | "defaulted" | "missing";
export type AgentSlotSource = "explicit" | "inferred" | "default";

export interface AgentStructuredSlot {
  slot: AgentSlotName;
  status: AgentSlotStatus;
  source: AgentSlotSource;
  value?: string | number | boolean;
  missingSlot?: AgentMissingSlot;
  requiredFor: PlannedToolName[];
  reason?: string;
}

export interface AgentSlotRequirement {
  slot: AgentMissingSlot;
  requiredFor: PlannedToolName[];
  reason: string;
}

export interface AgentResolvedSlot {
  slot: string;
  value: string | number | boolean;
}

export interface AgentIntentEvidence {
  detectedSignals: AgentIntentSignalName[];
  resolvedSlots: AgentResolvedSlot[];
  structuredSlots: AgentStructuredSlot[];
  missingSlots: AgentMissingSlot[];
  slotRequirements: AgentSlotRequirement[];
  planReasons: string[];
  confidenceDrivers: string[];
}

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
  visaType?: AgentVisaType;
  nationality: string;
  partnerType: string;
  education: AgentEducation;
  koreanLevel: AgentKoreanLevel;
  goal: AgentGoal;
  usingBroker: boolean;
  hasHistory: boolean;
  confidence: AgentIntentConfidence;
  structuredSlots: AgentStructuredSlot[];
  missingSlots: AgentMissingSlot[];
  slotRequirements: AgentSlotRequirement[];
  evidence: AgentIntentEvidence;
  plan: PlannedToolCall[];
}

type ExtractedAgentSlots = ReturnType<typeof extractAgentSlots>;

interface PlannerSlotDefinition {
  slot: AgentSlotName;
  missingSlot?: AgentMissingSlot;
  getValue: (slots: ExtractedAgentSlots) => string | number | boolean | undefined;
  isResolved: (slots: ExtractedAgentSlots) => boolean;
  isExplicit?: (slots: ExtractedAgentSlots) => boolean;
  isMissing?: (slots: ExtractedAgentSlots) => boolean;
  requiredFor?: (slots: ExtractedAgentSlots) => PlannedToolName[];
  missingReason?: string;
}

function compactTools(tools: Array<PlannedToolName | false>): PlannedToolName[] {
  return tools.filter((tool): tool is PlannedToolName => Boolean(tool));
}

const SLOT_DEFINITIONS: PlannerSlotDefinition[] = [
  {
    slot: "budget",
    missingSlot: "budget",
    getValue: (slots) => slots.budget,
    isResolved: (slots) => Boolean(slots.budget),
    isExplicit: (slots) => Boolean(slots.budget),
    isMissing: (slots) => slots.signals.budgetSignal && !slots.budget,
    requiredFor: () => ["search_schools", "calculate_cost"],
    missingReason: "budget_signal_without_amount",
  },
  {
    slot: "schoolName",
    getValue: (slots) => slots.schoolName,
    isResolved: (slots) => Boolean(slots.schoolName),
    isExplicit: (slots) => Boolean(slots.schoolName),
  },
  {
    slot: "region",
    missingSlot: "region",
    getValue: (slots) => slots.region,
    isResolved: (slots) => slots.region !== "all",
    isExplicit: (slots) => slots.region !== "all",
    isMissing: (slots) => (slots.signals.school || slots.signals.cost) && !slots.schoolName && slots.region === "all",
    requiredFor: () => ["search_schools"],
    missingReason: "school_or_cost_request_without_region",
  },
  {
    slot: "program",
    missingSlot: "program",
    getValue: (slots) => slots.program,
    isResolved: (slots) => slots.program !== "all",
    isExplicit: (slots) => slots.program !== "all",
    isMissing: (slots) => slots.signals.school && !slots.schoolName && slots.program === "all",
    requiredFor: () => ["search_schools"],
    missingReason: "school_request_without_program",
  },
  {
    slot: "accreditation",
    getValue: (slots) => slots.accreditation,
    isResolved: (slots) => slots.accreditation !== "all",
    isExplicit: (slots) => slots.accreditation !== "all",
  },
  {
    slot: "visaType",
    missingSlot: "visa_type",
    getValue: (slots) => slots.visaType,
    isResolved: (slots) => slots.signals.explicitVisaType && Boolean(slots.visaType),
    isExplicit: (slots) => slots.signals.explicitVisaType && Boolean(slots.visaType),
    isMissing: (slots) => slots.signals.documents && !slots.visaType,
    requiredFor: () => ["get_documents"],
    missingReason: "document_request_without_explicit_visa_type",
  },
  {
    slot: "nationality",
    missingSlot: "nationality",
    getValue: (slots) => slots.nationality,
    isResolved: (slots) => slots.nationality !== "other",
    isExplicit: (slots) => slots.nationality !== "other",
    isMissing: (slots) => (
      slots.signals.diagnosis
      || (slots.signals.documents && (!slots.visaType || isDocumentMatrixVisaType(slots.visaType)))
    ) && slots.nationality === "other",
    requiredFor: (slots) => compactTools([
      slots.signals.documents && isDocumentMatrixVisaType(slots.visaType) && "get_documents",
      slots.signals.diagnosis && "diagnose_path",
    ]),
    missingReason: "visa_or_diagnosis_request_without_nationality",
  },
  {
    slot: "partnerType",
    getValue: (slots) => slots.partnerType,
    isResolved: (slots) => slots.signals.partner,
    isExplicit: (slots) => slots.signals.partner,
  },
  {
    slot: "education",
    missingSlot: "education",
    getValue: (slots) => slots.education,
    isResolved: (slots) => slots.signals.educationSignal,
    isExplicit: (slots) => slots.signals.educationSignal,
    isMissing: (slots) => slots.signals.diagnosis && !slots.signals.educationSignal,
    requiredFor: () => ["diagnose_path"],
    missingReason: "diagnosis_request_without_education",
  },
  {
    slot: "koreanLevel",
    missingSlot: "korean_level",
    getValue: (slots) => slots.koreanLevel,
    isResolved: (slots) => slots.signals.koreanLevelSignal,
    isExplicit: (slots) => slots.signals.koreanLevelSignal,
    isMissing: (slots) => slots.signals.diagnosis && !slots.signals.koreanLevelSignal,
    requiredFor: () => ["diagnose_path"],
    missingReason: "diagnosis_request_without_korean_level",
  },
  {
    slot: "goal",
    missingSlot: "goal",
    getValue: (slots) => slots.goal,
    isResolved: (slots) => slots.signals.goalSignal && slots.goal !== "unsure",
    isExplicit: (slots) => slots.signals.goalSignal && slots.goal !== "unsure",
    isMissing: (slots) => slots.signals.diagnosis && !slots.signals.goalSignal,
    requiredFor: () => ["diagnose_path"],
    missingReason: "diagnosis_request_without_goal",
  },
  {
    slot: "usingBroker",
    getValue: (slots) => slots.usingBroker,
    isResolved: (slots) => slots.usingBroker,
    isExplicit: (slots) => slots.usingBroker,
  },
  {
    slot: "hasHistory",
    getValue: (slots) => slots.hasHistory,
    isResolved: (slots) => slots.hasHistory,
    isExplicit: (slots) => slots.hasHistory,
  },
];

function buildToolPlan(question: string, slots: ExtractedAgentSlots): PlannedToolCall[] {
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

  if (signals.documents && isDocumentMatrixVisaType(visaType)) {
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

function buildStructuredSlots(slots: ExtractedAgentSlots): AgentStructuredSlot[] {
  return SLOT_DEFINITIONS.map((definition) => {
    const missing = Boolean(definition.isMissing?.(slots));
    const resolved = definition.isResolved(slots);
    const explicit = Boolean(definition.isExplicit?.(slots));
    const requiredFor = missing ? definition.requiredFor?.(slots) || [] : [];
    const value = definition.getValue(slots);
    const status: AgentSlotStatus = missing ? "missing" : resolved ? "resolved" : "defaulted";
    const source: AgentSlotSource = explicit ? "explicit" : resolved ? "inferred" : "default";

    return {
      slot: definition.slot,
      status,
      source,
      value,
      missingSlot: missing ? definition.missingSlot : undefined,
      requiredFor,
      reason: missing ? definition.missingReason : undefined,
    };
  });
}

function buildSlotRequirements(structuredSlots: AgentStructuredSlot[]): AgentSlotRequirement[] {
  return structuredSlots
    .filter((slot): slot is AgentStructuredSlot & { missingSlot: AgentMissingSlot; reason: string } =>
      slot.status === "missing" && Boolean(slot.missingSlot) && Boolean(slot.reason)
    )
    .map((slot) => ({
      slot: slot.missingSlot,
      requiredFor: slot.requiredFor,
      reason: slot.reason,
    }));
}

function detectMissingSlots(structuredSlots: AgentStructuredSlot[]): AgentMissingSlot[] {
  const missingSlots = new Set<AgentMissingSlot>();
  for (const slot of structuredSlots) {
    if (slot.status === "missing" && slot.missingSlot) missingSlots.add(slot.missingSlot);
  }
  return Array.from(missingSlots);
}

function confidenceFor(
  slots: ExtractedAgentSlots,
  plan: PlannedToolCall[],
  missingSlots: AgentMissingSlot[]
): AgentIntentConfidence {
  if (slots.signals.smallTalk || slots.signals.safety) return "high";
  if (plan.length === 0 || missingSlots.length >= 3) return "low";
  if (missingSlots.length > 0) return "medium";
  return "high";
}

function detectedSignals(signals: AgentIntentSignals): AgentIntentSignalName[] {
  return (Object.keys(signals) as AgentIntentSignalName[]).filter((key) => signals[key]);
}

function resolvedSlots(structuredSlots: AgentStructuredSlot[]): AgentResolvedSlot[] {
  return structuredSlots
    .filter((slot) => slot.status === "resolved" && slot.value !== undefined)
    .map((slot) => ({ slot: slot.slot, value: slot.value as string | number | boolean }));
}

function confidenceDrivers(
  slots: ExtractedAgentSlots,
  plan: PlannedToolCall[],
  missingSlots: AgentMissingSlot[]
): string[] {
  if (slots.signals.smallTalk) return ["small_talk_terminal"];
  if (slots.signals.safety) return ["safety_terminal"];
  if (plan.length === 0) return ["no_tool_plan"];
  if (missingSlots.length >= 3) return ["many_missing_slots"];
  if (missingSlots.length > 0) return ["missing_slots"];
  return ["slots_complete"];
}

function buildIntentEvidence(
  slots: ExtractedAgentSlots,
  plan: PlannedToolCall[],
  structuredSlots: AgentStructuredSlot[],
  missingSlots: AgentMissingSlot[]
): AgentIntentEvidence {
  return {
    detectedSignals: detectedSignals(slots.signals),
    resolvedSlots: resolvedSlots(structuredSlots),
    structuredSlots,
    missingSlots,
    slotRequirements: buildSlotRequirements(structuredSlots),
    planReasons: plan.map((item) => item.reason),
    confidenceDrivers: confidenceDrivers(slots, plan, missingSlots),
  };
}

export function analyzeAgentIntent(question: string, lang?: Lang): AgentIntentAnalysis {
  void lang;
  const slots = extractAgentSlots(question);
  const plan = buildToolPlan(question, slots);
  const structuredSlots = buildStructuredSlots(slots);
  const missingSlots = detectMissingSlots(structuredSlots);
  const slotRequirements = buildSlotRequirements(structuredSlots);
  const confidence = confidenceFor(slots, plan, missingSlots);
  const evidence = buildIntentEvidence(slots, plan, structuredSlots, missingSlots);
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
    structuredSlots,
    missingSlots,
    slotRequirements,
    evidence,
    plan,
  };
}
