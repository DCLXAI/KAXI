"use client";

import { DiagnosisExperience } from "@/components/diagnosis/DiagnosisExperience";

export function Diagnosis({ onNavigate }: { onNavigate: (view: string) => void }) {
  return <DiagnosisExperience onNavigate={onNavigate} />;
}
