"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiagnosisForm } from "./DiagnosisForm";
import { DiagnosisResult } from "./DiagnosisResult";
import { useDiagnosisFlow } from "./useDiagnosisFlow";

interface DiagnosisExperienceProps {
  onNavigate: (view: string) => void;
}

export function DiagnosisExperience({ onNavigate }: DiagnosisExperienceProps) {
  const t = useTranslations();
  const flow = useDiagnosisFlow();
  const [editing, setEditing] = useState(false);
  const showResult = Boolean(flow.result) && !editing;

  const submit = async () => {
    await flow.submit();
    setEditing(false);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:py-10">
      <div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold sm:text-3xl">{t("diagnose_title")}</h1>
          {showResult && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
              {t("diagnose_edit_answers")}
            </Button>
          )}
        </div>
        <p className="text-muted-foreground mt-2">{t("diagnose_subtitle")}</p>
      </div>

      {!showResult && (
        <DiagnosisForm
          initialStep={flow.result ? 5 : 0}
          input={flow.input}
          locale={flow.locale}
          onSubmit={submit}
          onUpdate={flow.update}
          submitting={flow.submitting}
        />
      )}

      {showResult && flow.result && (
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 ease-snappy motion-reduce:animate-none">
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
        </div>
      )}
    </div>
  );
}
