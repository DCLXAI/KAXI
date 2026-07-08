"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, Banknote, ExternalLink, Home, MapPin, School as SchoolIcon, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/i18n/routing";
import type { School } from "@/lib/data/schools";
import { PROGRAM_LABELS, REGION_LABELS } from "./school-labels";

interface SchoolCardProps {
  isSelected: boolean;
  locale: Locale;
  onToggle: (school: School) => void;
  school: School;
}

export function SchoolCard({ isSelected, locale, onToggle, school }: SchoolCardProps) {
  const t = useTranslations();
  const accredBadge = {
    accredited: { variant: "default" as const, label: t("school_accredited"), icon: ShieldCheck },
    standard: { variant: "secondary" as const, label: t("school_non_accredited"), icon: SchoolIcon },
    caution: { variant: "destructive" as const, label: t("school_caution"), icon: AlertTriangle },
  }[school.accreditation];
  const AccredIcon = accredBadge.icon;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-base leading-tight">{school.name[locale]}</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3" />
              {REGION_LABELS[school.region][locale]} · {PROGRAM_LABELS[school.program][locale]}
            </CardDescription>
          </div>
          <Badge variant={accredBadge.variant} className="gap-1 shrink-0">
            <AccredIcon className="h-3 w-3" />
            {accredBadge.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground flex items-center gap-1">
            <Banknote className="h-3 w-3" /> {t("school_tuition")}
          </span>
          <span className="font-mono">{school.tuitionPerSemester.toLocaleString()}₩</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground flex items-center gap-1">
            <Home className="h-3 w-3" /> {t("school_dormitory")}
          </span>
          {school.dormitoryAvailable ? (
            <span>{school.dormitoryCost?.toLocaleString()}₩ / 6mo</span>
          ) : (
            <Badge variant="outline" className="text-xs">{t("school_unavailable")}</Badge>
          )}
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("school_topik")}</span>
          <span className="text-right max-w-[60%]">{school.koreanRequirement}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{locale === "ko" ? "입학시기" : locale === "vi" ? "Kỳ nhập học" : locale === "mn" ? "Элсэлт" : "Intake"}</span>
          <span className="text-right">{school.intake.join(", ")}</span>
        </div>
        <div className="flex justify-between gap-3 text-xs">
          <span className="text-muted-foreground">{locale === "ko" ? "검증" : "Verified"}</span>
          <span className="text-right">
            {school.verifiedAt || "—"} · {locale === "ko" ? "재검토" : "Review"} {school.reviewAfter || "—"}
          </span>
        </div>
        {school.accreditation === "caution" && (
          <div className="mt-2 rounded-md bg-destructive/10 border border-destructive/20 p-2 text-xs text-destructive">
            {school.notes[locale]}
          </div>
        )}
        <div className="pt-2 flex flex-wrap gap-2">
          <Button size="sm" variant={isSelected ? "default" : "outline"} className="min-w-[9rem] flex-1" onClick={() => onToggle(school)}>
            {isSelected ? `✓ ${t("readiness_school_selected")}` : t("readiness_select_school")}
          </Button>
          <Button size="sm" variant="outline" className="min-w-[7rem] flex-1" asChild>
            <a href={school.officialUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 mr-1" />
              {t("school_official_link")}
            </a>
          </Button>
          {school.sourceUrl && school.sourceUrl !== school.officialUrl && (
            <Button size="sm" variant="ghost" className="shrink-0" asChild>
              <a href={school.sourceUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          )}
          <Button size="sm" className="min-w-[7rem] flex-1">{t("school_apply")}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
