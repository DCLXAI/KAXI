import type { DiagnosisInput } from "@/lib/data/diagnosis";

export const EDUCATION_VALUES = ["highschool", "college", "university", "master"] as const satisfies readonly DiagnosisInput["education"][];
export const KOREAN_VALUES = ["none", "topik1", "topik2", "topik3"] as const satisfies readonly DiagnosisInput["korean"][];
export const GOAL_VALUES = ["language", "degree", "transfer", "career", "unsure"] as const satisfies readonly DiagnosisInput["goal"][];

export function isOneOf<T extends string>(value: string, values: readonly T[]): value is T {
  return values.includes(value as T);
}
