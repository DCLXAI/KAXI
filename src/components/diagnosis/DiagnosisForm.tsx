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
  Loader2,
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
import { EDUCATION_VALUES, isOneOf } from "./diagnosis-options";

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
        "relative flex min-h-14 w-full items-center gap-3 rounded-lg border bg-background px-4 py-3 text-left text-sm font-medium transition-colors sm:min-h-16",
        "hover:border-foreground/30 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected && "border-primary bg-primary/5 ring-1 ring-primary",
      )}
    >
      {Icon && (
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted", selected && "bg-primary text-primary-foreground")}>
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
    { value: "other", label: locale === "ko" ? "기타" : "Other" },
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
    <Card className="py-0">
      <CardHeader className="border-b px-5 py-5 sm:px-7 sm:py-6">
        <div className="mb-2 flex items-center justify-between gap-3 text-xs font-medium text-muted-foreground" aria-live="polite">
          <span>{step + 1} / {TOTAL_STEPS}</span>
          <span>{Math.round(((step + 1) / TOTAL_STEPS) * 100)}%</span>
        </div>
        <Progress value={((step + 1) / TOTAL_STEPS) * 100} aria-label={`${step + 1} / ${TOTAL_STEPS}`} />
        <div className="pt-4">
          <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold leading-tight outline-none sm:text-2xl">
            {stepCopy[step].title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{stepCopy[step].hint}</p>
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
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("diagnose_q_nationality")}</Label>
              <Select value={input.nationality} onValueChange={(value) => onUpdate({ nationality: value })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {nationalityOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="diagnosis-age">{t("diagnose_q_age")}</Label>
              <Input
                id="diagnosis-age"
                type="number"
                min="14"
                max="80"
                value={input.age}
                aria-invalid={!ageValid}
                onChange={(event) => onUpdate({ age: event.target.value })}
              />
              {!ageValid && <p className="text-xs text-destructive">{t("diagnose_age_error")}</p>}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t("diagnose_q_education")}</Label>
              <Select
                value={input.education}
                onValueChange={(value) => {
                  if (isOneOf(value, EDUCATION_VALUES)) onUpdate({ education: value });
                }}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
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
          <div className="space-y-7">
            <div className="space-y-3">
              <Label htmlFor="diagnosis-budget">{t("diagnose_q_budget")}</Label>
              <div className="relative">
                <Input
                  id="diagnosis-budget"
                  type="number"
                  min="1"
                  step="500000"
                  value={input.budget}
                  onChange={(event) => onUpdate({ budget: Number(event.target.value) })}
                  className="h-12 pr-16 text-lg font-semibold"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">KRW</span>
              </div>
              <p className="text-sm font-medium">{money.format(input.budget)} KRW</p>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{t("diagnose_budget_quick")}</p>
                <div className="flex flex-wrap gap-2">
                  {BUDGET_PRESETS.map((amount) => (
                    <Button
                      key={amount}
                      type="button"
                      size="sm"
                      variant={input.budget === amount ? "secondary" : "outline"}
                      onClick={() => onUpdate({ budget: amount })}
                    >
                      {compactMoney.format(amount)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("diagnose_q_region")}</Label>
              <Select value={input.region} onValueChange={(value) => onUpdate({ region: value })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
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
              <div className="space-y-2 border-t pt-5">
                <Label htmlFor="diagnosis-broker-cost">{t("diagnose_q_broker_cost")}</Label>
                <div className="relative">
                  <Input
                    id="diagnosis-broker-cost"
                    type="number"
                    min="0"
                    step="100000"
                    value={input.brokerCost}
                    onChange={(event) => onUpdate({ brokerCost: Number(event.target.value) })}
                    className="h-11 pr-16"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">KRW</span>
                </div>
                <p className="text-sm font-medium">{money.format(input.brokerCost)} KRW</p>
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
              <h3 className="text-sm font-semibold">{t("diagnose_review")}</h3>
              <dl className="mt-3 grid border-t sm:grid-cols-2 sm:gap-x-6">
                {reviewRows.map((row) => (
                  <div key={row.label} className="flex min-w-0 items-start justify-between gap-4 border-b py-3 text-sm">
                    <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
                    <dd className="min-w-0 text-right font-medium leading-snug">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="sticky bottom-0 z-10 justify-between gap-3 border-t bg-card/95 px-5 py-4 backdrop-blur sm:px-7">
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
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {submitting ? t("diagnose_submitting") : t("diagnose_submit")}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
