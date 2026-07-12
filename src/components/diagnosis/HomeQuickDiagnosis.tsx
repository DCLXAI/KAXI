"use client";

import { useState } from "react";
import { GraduationCap, HelpCircle, Languages, Repeat2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KaxiPawMark } from "@/components/brand/KaxiPawMark";
import { tr, translationKey, type Lang } from "@/lib/i18n/translations";
import { pickLang, recommendPath } from "@/lib/data/diagnosis";
import {
  QUICK_DIAGNOSIS_IDS,
  quickDiagnosisInput,
  type QuickDiagnosisId,
} from "@/lib/data/quick-diagnosis";
import { useLeadStore } from "@/store/kbridge";

const OPTION_META = {
  language: {
    icon: Languages,
    title: "quick_option_language_title",
    description: "quick_option_language_desc",
  },
  degree: {
    icon: GraduationCap,
    title: "quick_option_degree_title",
    description: "quick_option_degree_desc",
  },
  transfer: {
    icon: Repeat2,
    title: "quick_option_transfer_title",
    description: "quick_option_transfer_desc",
  },
  unsure: {
    icon: HelpCircle,
    title: "quick_option_unsure_title",
    description: "quick_option_unsure_desc",
  },
} as const;

export function HomeQuickDiagnosis({
  lang,
  onNavigate,
}: {
  lang: Lang;
  onNavigate: (view: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<QuickDiagnosisId | null>(null);
  const updateCurrentDiagnosisRecommendation = useLeadStore(
    (state) => state.updateCurrentDiagnosisRecommendation,
  );
  const input = selectedId ? quickDiagnosisInput(selectedId) : null;
  const result = input ? recommendPath(input) : null;

  const continueToSchools = () => {
    if (!input || !result) return;
    updateCurrentDiagnosisRecommendation(input, result);
    onNavigate("schools");
  };

  return (
    <section
      id="quick-diagnosis"
      data-testid="home-quick-diagnosis"
      aria-labelledby="quick-diagnosis-title"
      className="mx-auto w-full max-w-5xl px-4"
    >
      <div className="mb-5 text-center">
        <div className="mb-2 flex items-center justify-center gap-1.5 text-sm font-semibold text-primary">
          <KaxiPawMark className="h-4 w-4" />
          {tr("quick_diagnosis_eyebrow", lang)}
        </div>
        <h2 id="quick-diagnosis-title" className="font-serif text-2xl font-bold sm:text-3xl">
          {tr("quick_diagnosis_title", lang)}
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {tr("quick_diagnosis_subtitle", lang)}
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
        {QUICK_DIAGNOSIS_IDS.map((id) => {
          const meta = OPTION_META[id];
          const Icon = meta.icon;
          const selected = selectedId === id;

          return (
            <li key={id}>
              <button
                type="button"
                data-testid={`quick-diagnosis-option-${id}`}
                aria-pressed={selected}
                onClick={() => setSelectedId(id)}
                className={[
                  "h-full min-h-36 w-full rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-icon-accent focus-visible:ring-offset-2",
                  selected
                    ? "border-icon-accent bg-primary/5 shadow-sm"
                    : "border-icon-accent/45 bg-card hover:border-icon-accent hover:bg-muted/30",
                ].join(" ")}
              >
                <span
                  className={[
                    "mb-4 flex h-9 w-9 items-center justify-center rounded-lg",
                    selected ? "bg-icon-accent/25 text-icon-accent" : "bg-icon-accent/15 text-icon-accent",
                  ].join(" ")}
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <span className="block text-sm font-semibold leading-snug sm:text-base">
                  {tr(meta.title, lang)}
                </span>
                <span className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">
                  {tr(meta.description, lang)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div aria-live="polite" aria-atomic="true">
        {result && (
          <div
            data-testid="quick-diagnosis-result"
            className="mt-5 rounded-lg border border-primary/25 bg-primary/5 p-5 sm:p-6"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <Badge className="mb-3">{tr("quick_result_badge", lang)}</Badge>
                <h3 className="font-serif text-xl font-bold sm:text-2xl">
                  {tr(translationKey(result.pathKey, "goal_unsure"), lang)}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tr("quick_result_summary", lang).replace("{visa}", result.visaType)}
                </p>
              </div>

              <dl className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-3 sm:min-w-80">
                <div>
                  <dt className="text-xs text-muted-foreground">{tr("result_prep_time", lang)}</dt>
                  <dd className="mt-1 text-sm font-semibold">{pickLang(result.prepTime, lang)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{tr("result_estimated_cost", lang)}</dt>
                  <dd className="mt-1 text-sm font-semibold">{result.estimatedCost.toLocaleString()} KRW</dd>
                </div>
              </dl>
            </div>

            <div className="mt-5 border-t border-primary/15 pt-4">
              <p className="text-xs font-semibold text-foreground">{tr("quick_result_next", lang)}</p>
              <div className="mt-2 grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
                {result.nextActions.slice(0, 2).map((action) => (
                  <p key={action.en}>{pickLang(action, lang)}</p>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 pr-16 sm:flex-row sm:items-center sm:pr-20 xl:pr-0">
              <Button onClick={continueToSchools}>{tr("quick_result_schools", lang)}</Button>
              <Button variant="outline" onClick={() => onNavigate("diagnose")}>
                {tr("quick_result_refine", lang)}
              </Button>
              <p
                data-testid="quick-diagnosis-note"
                className="text-xs leading-relaxed text-muted-foreground sm:ml-auto sm:max-w-xs sm:text-right"
              >
                {tr("quick_result_note", lang)}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
