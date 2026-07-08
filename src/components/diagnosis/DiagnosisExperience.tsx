"use client";

import { useTranslations } from "next-intl";
import { DiagnosisForm } from "./DiagnosisForm";
import { DiagnosisResult } from "./DiagnosisResult";
import { useDiagnosisFlow } from "./useDiagnosisFlow";

interface DiagnosisExperienceProps {
  onNavigate: (view: string) => void;
}

export function DiagnosisExperience({ onNavigate }: DiagnosisExperienceProps) {
  const t = useTranslations();
  const flow = useDiagnosisFlow();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("diagnose_title")}</h1>
        <p className="text-muted-foreground mt-2">{t("diagnose_subtitle")}</p>
      </div>

      <DiagnosisForm input={flow.input} locale={flow.locale} onSubmit={flow.submit} onUpdate={flow.update} />

      {flow.result && (
        <DiagnosisResult
          locale={flow.locale}
          nickname={flow.nickname}
          onNavigate={onNavigate}
          onNicknameChange={flow.setNickname}
          onSave={flow.save}
          result={flow.result}
          saveError={flow.saveError}
          savingDiagnosis={flow.savingDiagnosis}
          showSave={flow.showSave}
        />
      )}
    </div>
  );
}
