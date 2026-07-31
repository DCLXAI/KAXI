import { DIAGNOSIS_GOALS, type DiagnosisInput } from "@/lib/data/diagnosis";

export const EDUCATION_VALUES = ["highschool", "college", "university", "master"] as const satisfies readonly DiagnosisInput["education"][];
export const KOREAN_VALUES = ["none", "topik1", "topik2", "topik3"] as const satisfies readonly DiagnosisInput["korean"][];
// The one runtime goal list lives with the type it defines; `satisfies` only
// checks subset, so a restated copy could silently drop a member.
export const GOAL_VALUES = DIAGNOSIS_GOALS;
export const CURRENT_VISA_VALUES = ["D-2", "D-4"] as const satisfies readonly Exclude<DiagnosisInput["currentVisa"], "" | undefined>[];
export const IN_KOREA_GOAL_VALUES = ["in_korea_job", "in_korea_employment"] as const satisfies readonly DiagnosisInput["goal"][];

export function isOneOf<T extends string>(value: string, values: readonly T[]): value is T {
  return values.includes(value as T);
}
