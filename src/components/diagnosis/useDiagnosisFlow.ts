"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { defaultLocale, isLocale } from "@/i18n/routing";
import { useLeadStore } from "@/store/kbridge";
import { recommendPath, type DiagnosisInput } from "@/lib/data/diagnosis";

const DEFAULT_INPUT: DiagnosisInput = {
  nationality: "vn",
  age: "20",
  education: "highschool",
  korean: "none",
  goal: "unsure",
  budget: 10000000,
  region: "any",
  usingBroker: false,
  brokerCost: 0,
  hasHistory: false,
};

export function useDiagnosisFlow() {
  const t = useTranslations();
  const activeLocale = useLocale();
  const locale = isLocale(activeLocale) ? activeLocale : defaultLocale;
  const { saveDiagnosis, savingDiagnosis, currentDiagnosis, updateCurrentDiagnosisRecommendation } = useLeadStore();
  const [result, setResult] = useState<ReturnType<typeof recommendPath> | null>(null);
  const [showSave, setShowSave] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [input, setInput] = useState<DiagnosisInput>(DEFAULT_INPUT);
  const [submitting, setSubmitting] = useState(false);

  const update = (patch: Partial<DiagnosisInput>) => setInput((current) => ({ ...current, ...patch }));

  useEffect(() => {
    if (currentDiagnosis) {
      setInput(currentDiagnosis.input);
      if (currentDiagnosis.recommendation) setResult(currentDiagnosis.recommendation);
    }
  }, [currentDiagnosis]);

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
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
    } finally {
      setSubmitting(false);
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
      setSaveError(t("diagnose_save_error"));
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
    submitting,
    update,
  };
}
