"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  CircleHelp,
  GraduationCap,
  Languages,
  RefreshCcw,
  X,
  type LucideIcon,
} from "lucide-react";
import type { DiagnosisInput } from "@/lib/data/diagnosis";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KaxiCat } from "@/components/brand/KaxiCat";
import { EDUCATION_VALUES, isOneOf } from "./diagnosis-options";

const FIELD_LABEL_CLASS = "text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground";

interface DiagnosisFormProps {
  initialStep?: number;
  input: DiagnosisInput;
  locale: Locale;
  onSubmit: () => Promise<void> | void;
  onUpdate: (patch: Partial<DiagnosisInput>) => void;
  submitting: boolean;
}

interface ChoiceButtonProps {
  icon?: LucideIcon;
  label: string;
  onSelect: () => void;
  selected: boolean;
}

const TOTAL_STEPS = 6;
const BUDGET_PRESETS = [8_000_000, 10_000_000, 15_000_000, 20_000_000];

function ChoiceButton({ icon: Icon, label, onSelect, selected }: ChoiceButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "relative flex min-h-14 w-full items-center gap-3 rounded-lg border border-border bg-background px-4 py-3.5 text-left text-sm font-medium text-foreground transition-all duration-150 sm:min-h-16 sm:px-5",
        "hover:border-foreground/25 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected && "border-primary bg-primary/[0.06] shadow-sm ring-1 ring-primary",
      )}
    >
      {Icon && (
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors", selected && "bg-primary text-primary-foreground")}>
          <Icon className="h-4 w-4" />
        </span>
      )}
      <span className="min-w-0 flex-1 leading-snug">{label}</span>
      {selected && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
    </button>
  );
}

export function DiagnosisForm({ initialStep = 0, input, locale, onSubmit, onUpdate, submitting }: DiagnosisFormProps) {
  const t = useTranslations();
  const [step, setStep] = useState(initialStep);
  const [goalConfirmed, setGoalConfirmed] = useState(initialStep > 0);
  const [koreanConfirmed, setKoreanConfirmed] = useState(initialStep > 2);
  const [brokerConfirmed, setBrokerConfirmed] = useState(initialStep > 4);
  const [historyConfirmed, setHistoryConfirmed] = useState(initialStep > 4);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const age = Number(input.age);
  const ageValid = Number.isInteger(age) && age >= 14 && age <= 80;
  const budgetValid = Number.isFinite(input.budget) && input.budget > 0;

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const goalOptions: Array<{ value: DiagnosisInput["goal"]; label: string; icon: LucideIcon }> = [
    { value: "language", label: t("goal_language"), icon: Languages },
    { value: "degree", label: t("goal_degree"), icon: GraduationCap },
    { value: "transfer", label: t("goal_transfer"), icon: BookOpen },
    { value: "career", label: t("goal_career"), icon: BriefcaseBusiness },
    { value: "unsure", label: t("goal_unsure"), icon: CircleHelp },
  ];
  const educationOptions: Array<{ value: DiagnosisInput["education"]; label: string }> = [
    { value: "highschool", label: t("edu_highschool") },
    { value: "college", label: t("edu_college") },
    { value: "university", label: t("edu_university") },
    { value: "master", label: t("edu_master") },
  ];
  const koreanOptions: Array<{ value: DiagnosisInput["korean"]; label: string }> = [
    { value: "none", label: t("korean_none") },
    { value: "topik1", label: t("korean_topik1") },
    { value: "topik2", label: t("korean_topik2") },
    { value: "topik3", label: t("korean_topik3") },
  ];
  const nationalityOptions = [
    { value: "vn", label: "🇻🇳 Vietnam" },
    { value: "mn", label: "🇲🇳 Mongolia" },
    { value: "cn", label: "🇨🇳 China" },
    { value: "uz", label: "🇺🇿 Uzbekistan" },
    { value: "other", label: t("nationality_other") },
  ];
  const regionOptions = [
    { value: "any", label: t("region_any") },
    { value: "seoul", label: t("region_seoul") },
    { value: "gyeonggi", label: t("region_gyeonggi") },
    { value: "busan", label: t("region_busan") },
    { value: "daegu", label: t("region_daegu") },
    { value: "gwangju", label: t("region_gwangju") },
    { value: "other", label: t("region_other") },
  ];
  const stepCopy = [
    { title: t("diagnose_step_goal_title"), hint: t("diagnose_step_goal_hint") },
    { title: t("diagnose_step_profile_title"), hint: t("diagnose_step_profile_hint") },
    { title: t("diagnose_step_korean_title"), hint: t("diagnose_step_korean_hint") },
    { title: t("diagnose_step_budget_title"), hint: t("diagnose_step_budget_hint") },
    { title: t("diagnose_step_broker_title"), hint: t("diagnose_step_broker_hint") },
    { title: t("diagnose_step_history_title"), hint: t("diagnose_step_history_hint") },
  ];
  const money = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const compactMoney = new Intl.NumberFormat(locale, {
    currency: "KRW",
    maximumFractionDigits: 0,
    notation: "compact",
    style: "currency",
  });
  const currentStepValid = step === 0
    ? goalConfirmed
    : step === 1
      ? ageValid
      : step === 2
        ? koreanConfirmed
        : step === 3
          ? budgetValid
          : step === 4
            ? brokerConfirmed
            : historyConfirmed;
  const selectedGoal = goalOptions.find((option) => option.value === input.goal)?.label || t("goal_unsure");
  const selectedEducation = educationOptions.find((option) => option.value === input.education)?.label || "-";
  const selectedKorean = koreanOptions.find((option) => option.value === input.korean)?.label || "-";
  const selectedNationality = nationalityOptions.find((option) => option.value === input.nationality)?.label || input.nationality;
  const selectedRegion = regionOptions.find((option) => option.value === input.region)?.label || input.region;
  const brokerValue = input.usingBroker
    ? `${t("yes")}${input.brokerCost > 0 ? ` · ${money.format(input.brokerCost)} KRW` : ""}`
    : t("no");
  const reviewRows = [
    { label: t("diagnose_q_goal"), value: selectedGoal },
    { label: t("diagnose_q_nationality"), value: selectedNationality },
    { label: t("diagnose_q_age"), value: input.age },
    { label: t("diagnose_q_education"), value: selectedEducation },
    { label: t("diagnose_q_korean"), value: selectedKorean },
    { label: t("diagnose_q_budget"), value: `${money.format(input.budget)} KRW` },
    { label: t("diagnose_q_region"), value: selectedRegion },
    { label: t("diagnose_q_broker"), value: brokerValue },
    { label: t("diagnose_q_history"), value: input.hasHistory ? t("yes") : t("no") },
  ];

  const next = () => setStep((current) => Math.min(TOTAL_STEPS - 1, current + 1));
  const previous = () => setStep((current) => Math.max(0, current - 1));

  return (
    <Card className="overflow-hidden bg-card py-0">
      <CardHeader className="border-b border-border bg-card px-5 py-5 sm:px-7 sm:py-6">
        <div className="mb-3 flex items-center justify-between gap-3" aria-live="polite">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {step + 1} / {TOTAL_STEPS}
          </span>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {Math.round(((step + 1) / TOTAL_STEPS) * 100)}%
            </span>
            <KaxiCat state="running" size={22} className="hidden opacity-90 sm:block" />
          </div>
        </div>
        <Progress
          value={((step + 1) / TOTAL_STEPS) * 100}
          aria-label={`${step + 1} / ${TOTAL_STEPS}`}
          className="h-1.5 bg-muted"
        />
        <div className="pt-5 sm:pt-6">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="font-serif text-2xl font-semibold leading-tight tracking-tight text-foreground outline-none sm:text-3xl"
          >
            {stepCopy[step].title}
          </h2>
          <p className="mt-2.5 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-[15px]">{stepCopy[step].hint}</p>
        </div>
      </CardHeader>

      <CardContent className="min-h-[20rem] px-5 py-6 sm:min-h-[21rem] sm:px-7 sm:py-8">
        {step === 0 && (
          <div role="group" aria-label={t("diagnose_q_goal")} className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            {goalOptions.map((option) => (
              <ChoiceButton
                key={option.value}
                icon={option.icon}
                label={option.label}
                selected={goalConfirmed && input.goal === option.value}
                onSelect={() => {
                  setGoalConfirmed(true);
                  onUpdate({ goal: option.value });
                }}
              />
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2.5">
              <Label className={FIELD_LABEL_CLASS}>{t("diagnose_q_nationality")}</Label>
              <Select value={input.nationality} onValueChange={(value) => onUpdate({ nationality: value })}>
                <SelectTrigger className="h-11 w-full bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {nationalityOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="diagnosis-age" className={FIELD_LABEL_CLASS}>{t("diagnose_q_age")}</Label>
              <Input
                id="diagnosis-age"
                type="number"
                min="14"
                max="80"
                value={input.age}
                aria-invalid={!ageValid}
                onChange={(event) => onUpdate({ age: event.target.value })}
                className="h-11 bg-background text-base font-medium tabular-nums"
              />
              {!ageValid && <p className="text-xs text-destructive">{t("diagnose_age_error")}</p>}
            </div>
            <div className="space-y-2.5 sm:col-span-2">
              <Label className={FIELD_LABEL_CLASS}>{t("diagnose_q_education")}</Label>
              <Select
                value={input.education}
                onValueChange={(value) => {
                  if (isOneOf(value, EDUCATION_VALUES)) onUpdate({ education: value });
                }}
              >
                <SelectTrigger className="h-11 w-full bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {educationOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div role="group" aria-label={t("diagnose_q_korean")} className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            {koreanOptions.map((option) => (
              <ChoiceButton
                key={option.value}
                label={option.label}
                selected={koreanConfirmed && input.korean === option.value}
                onSelect={() => {
                  setKoreanConfirmed(true);
                  onUpdate({ korean: option.value });
                }}
              />
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8">
            <div className="space-y-3">
              <Label htmlFor="diagnosis-budget" className={FIELD_LABEL_CLASS}>{t("diagnose_q_budget")}</Label>
              <div className="relative">
                <Input
                  id="diagnosis-budget"
                  type="number"
                  min="1"
                  step="500000"
                  value={input.budget}
                  onChange={(event) => onUpdate({ budget: Number(event.target.value) })}
                  className="h-12 bg-background pr-16 text-lg font-semibold tabular-nums"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">KRW</span>
              </div>
              <p className="font-serif text-base font-semibold text-foreground">{money.format(input.budget)} <span className="text-sm font-sans font-normal text-muted-foreground">KRW</span></p>
              <div className="space-y-2 pt-1">
                <p className={FIELD_LABEL_CLASS}>{t("diagnose_budget_quick")}</p>
                <div className="flex flex-wrap gap-2">
                  {BUDGET_PRESETS.map((amount) => (
                    <Button
                      key={amount}
                      type="button"
                      size="sm"
                      variant={input.budget === amount ? "secondary" : "outline"}
                      className="rounded-full"
                      onClick={() => onUpdate({ budget: amount })}
                    >
                      {compactMoney.format(amount)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2.5">
              <Label className={FIELD_LABEL_CLASS}>{t("diagnose_q_region")}</Label>
              <Select value={input.region} onValueChange={(value) => onUpdate({ region: value })}>
                <SelectTrigger className="h-11 w-full bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {regionOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div role="group" aria-label={t("diagnose_q_broker")} className="grid grid-cols-2 gap-3">
              <ChoiceButton
                icon={Check}
                label={t("yes")}
                selected={brokerConfirmed && input.usingBroker}
                onSelect={() => {
                  setBrokerConfirmed(true);
                  onUpdate({ usingBroker: true });
                }}
              />
              <ChoiceButton
                icon={X}
                label={t("no")}
                selected={brokerConfirmed && !input.usingBroker}
                onSelect={() => {
                  setBrokerConfirmed(true);
                  onUpdate({ usingBroker: false, brokerCost: 0 });
                }}
              />
            </div>
            {input.usingBroker && (
              <div className="space-y-2.5 border-t border-border pt-6">
                <Label htmlFor="diagnosis-broker-cost" className={FIELD_LABEL_CLASS}>{t("diagnose_q_broker_cost")}</Label>
                <div className="relative">
                  <Input
                    id="diagnosis-broker-cost"
                    type="number"
                    min="0"
                    step="100000"
                    value={input.brokerCost}
                    onChange={(event) => onUpdate({ brokerCost: Number(event.target.value) })}
                    className="h-11 bg-background pr-16 tabular-nums"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">KRW</span>
                </div>
                <p className="text-sm font-medium text-foreground">{money.format(input.brokerCost)} KRW</p>
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-7">
            <div role="group" aria-label={t("diagnose_q_history")} className="grid grid-cols-2 gap-3">
              <ChoiceButton
                icon={RefreshCcw}
                label={t("yes")}
                selected={historyConfirmed && input.hasHistory}
                onSelect={() => {
                  setHistoryConfirmed(true);
                  onUpdate({ hasHistory: true });
                }}
              />
              <ChoiceButton
                icon={Check}
                label={t("no")}
                selected={historyConfirmed && !input.hasHistory}
                onSelect={() => {
                  setHistoryConfirmed(true);
                  onUpdate({ hasHistory: false });
                }}
              />
            </div>
            <div>
              <h3 className="font-serif text-base font-semibold text-foreground">{t("diagnose_review")}</h3>
              <dl className="mt-3 grid border-t border-border sm:grid-cols-2 sm:gap-x-6">
                {reviewRows.map((row) => (
                  <div key={row.label} className="flex min-w-0 items-start justify-between gap-4 border-b border-border py-3 text-sm">
                    <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
                    <dd className="min-w-0 text-right font-medium leading-snug text-foreground">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="sticky bottom-0 z-10 justify-between gap-3 border-t border-border bg-card/95 px-5 py-4 backdrop-blur sm:px-7">
        {step > 0 ? (
          <Button type="button" variant="ghost" onClick={previous} disabled={submitting}>
            <ArrowLeft className="h-4 w-4" />
            {t("diagnose_back")}
          </Button>
        ) : <span />}
        {step < TOTAL_STEPS - 1 ? (
          <Button type="button" onClick={next} disabled={!currentStepValid}>
            {t("diagnose_next")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" size="lg" onClick={() => void onSubmit()} disabled={submitting || !currentStepValid}>
            {submitting ? (
              <KaxiCat state="running" size={18} inverted />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            {submitting ? t("diagnose_submitting") : t("diagnose_submit")}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
