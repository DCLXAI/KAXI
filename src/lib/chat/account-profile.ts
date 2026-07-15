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

// Session signals -> the StudentProfile columns to fill. Only returns columns
// that the signals have AND the account currently leaves empty (fill-only).
// Nationality is never included (see spec: default-"VN" ambiguity).
//
// Takes SIGNALS, not a whole SessionProfile: callers must first narrow to
// accountEligibleSignals() so only this-turn, deterministically-established
// facts ever reach the account (see accountEligibleSignals below for why).
export function sessionProfileToStudentFills(
  signals: SessionProfileSignals,
  existing: StudentChatProfileFields,
): Partial<{ visaType: string; targetVisa: string; chatStudyStage: string }> {
  const fills: Partial<{ visaType: string; targetVisa: string; chatStudyStage: string }> = {};
  const visaType = cleanCode(signals.currentVisa);
  if (visaType && isEmpty(existing.visaType)) fills.visaType = visaType;
  const targetVisa = cleanCode(signals.targetVisa);
  if (targetVisa && isEmpty(existing.targetVisa)) fills.targetVisa = targetVisa;
  const chatStudyStage = cleanStage(signals.studyStage);
  if (chatStudyStage && isEmpty(existing.chatStudyStage)) fills.chatStudyStage = chatStudyStage;
  return fills;
}

// The account may only receive facts the authenticated student stated on THIS
// turn, established by the deterministic extractor. Older facts may belong to a
// different visitor sharing the browser's chat-session cookie, and mediation
// (LLM) values are guesses that fill-only would make permanent.
export function accountEligibleSignals(
  profile: SessionProfile,
  turn: number,
): SessionProfileSignals {
  const eligible: SessionProfileSignals = {};
  const fields = profile.fields || {};
  for (const key of ["currentVisa", "targetVisa", "studyStage"] as const) {
    const meta = fields[key];
    if (!meta || meta.turn !== turn || meta.source !== "deterministic") continue;
    const value = profile[key];
    if (value) (eligible as Record<string, unknown>)[key] = value;
  }
  return eligible;
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
