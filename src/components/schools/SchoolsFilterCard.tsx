"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type { Locale } from "@/i18n/routing";
import { PROGRAM_LABELS, REGION_LABELS } from "./school-labels";

interface SchoolsFilterCardProps {
  accreditation: string;
  locale: Locale;
  maxTuition: number;
  onAccreditationChange: (value: string) => void;
  onMaxTuitionChange: (value: number) => void;
  onProgramChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onReset: () => void;
  program: string;
  region: string;
  resultCount: number;
  total: number;
}

export function SchoolsFilterCard({
  accreditation,
  locale,
  maxTuition,
  onAccreditationChange,
  onMaxTuitionChange,
  onProgramChange,
  onRegionChange,
  onReset,
  program,
  region,
  resultCount,
  total,
}: SchoolsFilterCardProps) {
  const t = useTranslations();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filter</CardTitle>
          <Button variant="ghost" size="sm" onClick={onReset}>{t("filter_reset")}</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">{t("filter_region")}</Label>
            <Select value={region} onValueChange={onRegionChange}>
              <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("region_any")}</SelectItem>
                {Object.entries(REGION_LABELS).map(([key, value]) => (
                  <SelectItem key={key} value={key}>{value[locale]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">{t("filter_program")}</Label>
            <Select value={program} onValueChange={onProgramChange}>
              <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("region_any")}</SelectItem>
                {Object.entries(PROGRAM_LABELS).map(([key, value]) => (
                  <SelectItem key={key} value={key}>{value[locale]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">{t("filter_accreditation")}</Label>
            <Select value={accreditation} onValueChange={onAccreditationChange}>
              <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("region_any")}</SelectItem>
                <SelectItem value="accredited">{t("school_accredited")}</SelectItem>
                <SelectItem value="standard">{t("school_non_accredited")}</SelectItem>
                <SelectItem value="caution">{t("school_caution")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">
              {t("filter_tuition_max")}: <span className="font-mono">{maxTuition.toLocaleString()}₩</span>
            </Label>
            <Slider value={[maxTuition]} onValueChange={([value]) => onMaxTuitionChange(value)} min={1000000} max={6000000} step={100000} />
          </div>
        </div>
        <div className="mt-3 text-sm text-muted-foreground">
          {resultCount} / {total} {locale === "ko" ? "결과" : locale === "vi" ? "kết quả" : locale === "mn" ? "үр дүн" : "results"}
        </div>
      </CardContent>
    </Card>
  );
}
