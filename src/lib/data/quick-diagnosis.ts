import type { DiagnosisInput, DiagnosisVisaType } from "./diagnosis";

export const QUICK_DIAGNOSIS_IDS = ["language", "degree", "transfer", "unsure"] as const;

export type QuickDiagnosisId = (typeof QUICK_DIAGNOSIS_IDS)[number];

const BASE_INPUT: Omit<DiagnosisInput, "education" | "korean" | "goal" | "budget"> = {
  nationality: "other",
  age: "20",
  region: "any",
  usingBroker: false,
  brokerCost: 0,
  hasHistory: false,
};

export const QUICK_DIAGNOSIS_PRESETS: Record<QuickDiagnosisId, DiagnosisInput> = {
  language: {
    ...BASE_INPUT,
    education: "highschool",
    korean: "none",
    goal: "language",
    budget: 10_000_000,
  },
  degree: {
    ...BASE_INPUT,
    education: "highschool",
    korean: "topik3",
    goal: "degree",
    budget: 15_000_000,
  },
  transfer: {
    ...BASE_INPUT,
    education: "college",
    korean: "topik3",
    goal: "transfer",
    budget: 15_000_000,
  },
  unsure: {
    ...BASE_INPUT,
    education: "highschool",
    korean: "none",
    goal: "unsure",
    budget: 10_000_000,
  },
};

export const QUICK_DIAGNOSIS_EXPECTED_VISA: Record<QuickDiagnosisId, DiagnosisVisaType> = {
  language: "D-4",
  degree: "D-2",
  transfer: "D-2",
  unsure: "D-4",
};

export function quickDiagnosisInput(id: QuickDiagnosisId): DiagnosisInput {
  return { ...QUICK_DIAGNOSIS_PRESETS[id] };
}
