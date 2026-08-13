"use client";

import { DiagnosisExperience } from "@/components/diagnosis/DiagnosisExperience";
import { usePublicNavigation } from "@/components/kbridge/PublicShell";

export function Diagnosis({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const shellNavigate = usePublicNavigation();
  return <DiagnosisExperience onNavigate={onNavigate || shellNavigate} />;
}
