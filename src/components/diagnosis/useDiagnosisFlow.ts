"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { defaultLocale, isLocale } from "@/i18n/routing";
import { useLeadStore } from "@/store/kbridge";
import { recommendPath, type DiagnosisInput } from "@/lib/data/diagnosis";

const DEFAULT_INPUT: DiagnosisInput = {
  nationality: "vn",
  age: "20",
  education: "highschool",
  korean: "none",
  goal: "language",
  budget: 10000000,
  region: "any",
  usingBroker: false,
  brokerCost: 0,
  hasHistory: false,
};

export function useDiagnosisFlow() {
  const activeLocale = useLocale();
  const locale = isLocale(activeLocale) ? activeLocale : defaultLocale;
  const { saveDiagnosis, savingDiagnosis, currentDiagnosis, updateCurrentDiagnosisRecommendation } = useLeadStore();
  const [result, setResult] = useState<ReturnType<typeof recommendPath> | null>(null);
  const [showSave, setShowSave] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [input, setInput] = useState<DiagnosisInput>(DEFAULT_INPUT);

  const update = (patch: Partial<DiagnosisInput>) => setInput((current) => ({ ...current, ...patch }));

  useEffect(() => {
    if (currentDiagnosis) {
      setInput(currentDiagnosis.input);
      if (currentDiagnosis.recommendation) setResult(currentDiagnosis.recommendation);
    }
  }, [currentDiagnosis]);

  const submit = async () => {
    try {
      const res = await fetch("/api/diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("diagnosis failed");
      const rec = await res.json();
      setResult(rec);
      updateCurrentDiagnosisRecommendation(input, rec);
    } catch {
      const rec = recommendPath(input);
      setResult(rec);
      updateCurrentDiagnosisRecommendation(input, rec);
    }
    setShowSave(false);
    setSaveError(null);
    setTimeout(() => {
      document.getElementById("result-section")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const save = async () => {
    if (!result) return;
    setSaveError(null);
    const leadId = await saveDiagnosis(nickname || "익명", input, result);
    if (leadId) {
      setShowSave(true);
    } else {
      setSaveError(locale === "ko" ? "저장 중 오류가 발생했습니다. 다시 시도해주세요." : "Save error. Please retry.");
    }
  };

  return {
    input,
    locale,
    nickname,
    result,
    save,
    saveError,
    savingDiagnosis,
    setNickname,
    showSave,
    submit,
    update,
  };
}
