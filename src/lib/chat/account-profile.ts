import { normalizeVisaCode, type SessionProfile, type SessionProfileSignals } from "@/lib/chat/session-profile";

export type StudentChatProfileFields = {
  visaType?: string | null;
  targetVisa?: string | null;
  chatStudyStage?: string | null;
};

const STUDY_STAGES = new Set(["language", "undergraduate", "graduate"]);

function cleanCode(value: unknown): string | undefined {
  return typeof value === "string" ? normalizeVisaCode(value) || undefined : undefined;
}

function cleanStage(value: unknown): string | undefined {
  return typeof value === "string" && STUDY_STAGES.has(value) ? value : undefined;
}

function isEmpty(value: string | null | undefined): boolean {
  return !value || !value.trim();
}

// Session profile -> the StudentProfile columns to fill. Only returns columns
// that the session has AND the account currently leaves empty (fill-only).
// Nationality is never included (see spec: default-"VN" ambiguity).
export function sessionProfileToStudentFills(
  profile: SessionProfile,
  existing: StudentChatProfileFields,
): Partial<{ visaType: string; targetVisa: string; chatStudyStage: string }> {
  const fills: Partial<{ visaType: string; targetVisa: string; chatStudyStage: string }> = {};
  const visaType = cleanCode(profile.currentVisa);
  if (visaType && isEmpty(existing.visaType)) fills.visaType = visaType;
  const targetVisa = cleanCode(profile.targetVisa);
  if (targetVisa && isEmpty(existing.targetVisa)) fills.targetVisa = targetVisa;
  const chatStudyStage = cleanStage(profile.studyStage);
  if (chatStudyStage && isEmpty(existing.chatStudyStage)) fills.chatStudyStage = chatStudyStage;
  return fills;
}

// StudentProfile columns -> session signals for read-back seeding. Empty
// columns are omitted; nationality is never produced.
export function studentFieldsToSessionSignals(row: StudentChatProfileFields): SessionProfileSignals {
  const signals: SessionProfileSignals = {};
  const currentVisa = cleanCode(row.visaType);
  if (currentVisa) signals.currentVisa = currentVisa;
  const targetVisa = cleanCode(row.targetVisa);
  if (targetVisa) signals.targetVisa = targetVisa;
  const studyStage = cleanStage(row.chatStudyStage);
  if (studyStage) signals.studyStage = studyStage as SessionProfileSignals["studyStage"];
  return signals;
}
