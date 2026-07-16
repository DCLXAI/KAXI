"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/i18n/routing";
import type { School } from "@/lib/data/schools";

interface SelectedSchoolsBannerProps {
  hasCurrentDiagnosis: boolean;
  locale: Locale;
  onClear: () => void;
  selectedSchools: School[];
}

export function SelectedSchoolsBanner({
  hasCurrentDiagnosis,
  locale,
  onClear,
  selectedSchools,
}: SelectedSchoolsBannerProps) {
  const t = useTranslations();
  if (selectedSchools.length === 0) return null;

  return (
    <Card className="border-primary-strong/50">
      <CardHeader className="py-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm">
            {t("readiness_selected_schools")} ({selectedSchools.length}) - {t("readiness_score_applied")}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClear}>{t("readiness_clear_schools")}</Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 text-xs text-muted-foreground">
        {selectedSchools.map((school) => school.name[locale] || school.name.ko).join(", ")}
        {hasCurrentDiagnosis && <span className="ml-2 text-primary-strong">({t("readiness_auto_updates")})</span>}
      </CardContent>
    </Card>
  );
}
