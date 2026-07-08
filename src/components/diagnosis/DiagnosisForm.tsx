"use client";

import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import type { DiagnosisInput } from "@/lib/data/diagnosis";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EDUCATION_VALUES, GOAL_VALUES, isOneOf, KOREAN_VALUES } from "./diagnosis-options";
import type { Locale } from "@/i18n/routing";

interface DiagnosisFormProps {
  input: DiagnosisInput;
  locale: Locale;
  onSubmit: () => void;
  onUpdate: (patch: Partial<DiagnosisInput>) => void;
}

export function DiagnosisForm({ input, locale, onSubmit, onUpdate }: DiagnosisFormProps) {
  const t = useTranslations();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("diagnose_subtitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>{t("diagnose_q_nationality")}</Label>
          <Select value={input.nationality} onValueChange={(value) => onUpdate({ nationality: value })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="vn">🇻🇳 Vietnam</SelectItem>
              <SelectItem value="mn">🇲🇳 Mongolia</SelectItem>
              <SelectItem value="cn">🇨🇳 China</SelectItem>
              <SelectItem value="uz">🇺🇿 Uzbekistan</SelectItem>
              <SelectItem value="other">{locale === "ko" ? "기타" : "Other"}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>{t("diagnose_q_age")}</Label>
            <Input type="number" value={input.age} onChange={(event) => onUpdate({ age: event.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>{t("diagnose_q_education")}</Label>
            <Select
              value={input.education}
              onValueChange={(value) => {
                if (isOneOf(value, EDUCATION_VALUES)) onUpdate({ education: value });
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="highschool">{t("edu_highschool")}</SelectItem>
                <SelectItem value="college">{t("edu_college")}</SelectItem>
                <SelectItem value="university">{t("edu_university")}</SelectItem>
                <SelectItem value="master">{t("edu_master")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t("diagnose_q_korean")}</Label>
          <RadioGroup
            value={input.korean}
            onValueChange={(value) => {
              if (isOneOf(value, KOREAN_VALUES)) onUpdate({ korean: value });
            }}
            className="grid grid-cols-2 md:grid-cols-4 gap-2"
          >
            {[
              { value: "none", label: t("korean_none") },
              { value: "topik1", label: t("korean_topik1") },
              { value: "topik2", label: t("korean_topik2") },
              { value: "topik3", label: t("korean_topik3") },
            ].map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`k-${option.value}`} />
                <Label htmlFor={`k-${option.value}`} className="cursor-pointer text-sm font-normal">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label>{t("diagnose_q_goal")}</Label>
          <RadioGroup
            value={input.goal}
            onValueChange={(value) => {
              if (isOneOf(value, GOAL_VALUES)) onUpdate({ goal: value });
            }}
            className="grid gap-2"
          >
            {[
              { value: "language", label: t("goal_language") },
              { value: "degree", label: t("goal_degree") },
              { value: "transfer", label: t("goal_transfer") },
              { value: "career", label: t("goal_career") },
              { value: "unsure", label: t("goal_unsure") },
            ].map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`g-${option.value}`} />
                <Label htmlFor={`g-${option.value}`} className="cursor-pointer text-sm">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>{t("diagnose_q_budget")}</Label>
            <Input
              type="number"
              step="500000"
              value={input.budget}
              onChange={(event) => onUpdate({ budget: Number(event.target.value) })}
            />
            <p className="text-xs text-muted-foreground">{input.budget.toLocaleString()} KRW</p>
          </div>
          <div className="space-y-2">
            <Label>{t("diagnose_q_region")}</Label>
            <Select value={input.region} onValueChange={(value) => onUpdate({ region: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t("region_any")}</SelectItem>
                <SelectItem value="seoul">{t("region_seoul")}</SelectItem>
                <SelectItem value="gyeonggi">{t("region_gyeonggi")}</SelectItem>
                <SelectItem value="busan">{t("region_busan")}</SelectItem>
                <SelectItem value="daegu">{t("region_daegu")}</SelectItem>
                <SelectItem value="gwangju">{t("region_gwangju")}</SelectItem>
                <SelectItem value="other">{t("region_other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t("diagnose_q_broker")}</Label>
          <RadioGroup value={input.usingBroker ? "yes" : "no"} onValueChange={(value) => onUpdate({ usingBroker: value === "yes" })} className="flex gap-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="b-yes" />
              <Label htmlFor="b-yes" className="cursor-pointer">{t("yes")}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="b-no" />
              <Label htmlFor="b-no" className="cursor-pointer">{t("no")}</Label>
            </div>
          </RadioGroup>
        </div>

        {input.usingBroker && (
          <div className="space-y-2">
            <Label>{t("diagnose_q_broker_cost")}</Label>
            <Input
              type="number"
              step="100000"
              value={input.brokerCost}
              onChange={(event) => onUpdate({ brokerCost: Number(event.target.value) })}
            />
            <p className="text-xs text-muted-foreground">{input.brokerCost.toLocaleString()} KRW</p>
          </div>
        )}

        <div className="space-y-2">
          <Label>{t("diagnose_q_history")}</Label>
          <RadioGroup value={input.hasHistory ? "yes" : "no"} onValueChange={(value) => onUpdate({ hasHistory: value === "yes" })} className="flex gap-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="h-yes" />
              <Label htmlFor="h-yes" className="cursor-pointer">{t("yes")}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="h-no" />
              <Label htmlFor="h-no" className="cursor-pointer">{t("no")}</Label>
            </div>
          </RadioGroup>
        </div>

        <Button size="lg" className="w-full" onClick={onSubmit}>
          {t("diagnose_submit")}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
