import type { DiagnosisInput } from "./diagnosis";

export const QUICK_DIAGNOSIS_IDS = ["language", "degree", "transfer", "unsure"] as const;
export const QUICK_KOREAN_IDS = ["none", "topik1", "topik2", "topik3"] as const;
export const QUICK_BUDGET_IDS = ["under8", "8to12", "12to18", "over18"] as const;

export type QuickDiagnosisId = (typeof QUICK_DIAGNOSIS_IDS)[number];
export type QuickKoreanId = (typeof QUICK_KOREAN_IDS)[number];
export type QuickBudgetId = (typeof QUICK_BUDGET_IDS)[number];

export interface QuickDiagnosisAnswers {
  goal: QuickDiagnosisId;
  korean: QuickKoreanId;
  budget: QuickBudgetId;
}

const BASE_INPUT: Omit<DiagnosisInput, "education" | "korean" | "goal" | "budget"> = {
  nationality: "other",
  age: "20",
  region: "any",
  usingBroker: false,
  brokerCost: 0,
  hasHistory: false,
};

export const QUICK_BUDGET_VALUES: Record<QuickBudgetId, number> = {
  under8: 6_000_000,
  "8to12": 10_000_000,
  "12to18": 15_000_000,
  over18: 20_000_000,
};

export function quickDiagnosisNeedsLanguageBridge(answers: QuickDiagnosisAnswers): boolean {
  return (
    (answers.goal === "degree" || answers.goal === "transfer") &&
    (answers.korean === "none" || answers.korean === "topik1")
  );
}

export function quickDiagnosisInput(answers: QuickDiagnosisAnswers): DiagnosisInput {
  const bridgeToLanguage = quickDiagnosisNeedsLanguageBridge(answers);

  return {
    ...BASE_INPUT,
    education: answers.goal === "transfer" ? "college" : "highschool",
    korean: answers.korean,
    goal: bridgeToLanguage ? "unsure" : answers.goal,
    budget: QUICK_BUDGET_VALUES[answers.budget],
  };
}
