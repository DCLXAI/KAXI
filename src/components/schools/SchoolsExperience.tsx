"use client";

import { useTranslations } from "next-intl";
import { useLeadStore } from "@/store/kbridge";
import { SchoolCard } from "./SchoolCard";
import { SchoolsFilterCard } from "./SchoolsFilterCard";
import { SelectedSchoolsBanner } from "./SelectedSchoolsBanner";
import { useSchoolsDirectory } from "./useSchoolsDirectory";

export function SchoolsExperience() {
  const t = useTranslations();
  const directory = useSchoolsDirectory();
  const {
    selectedSchoolsForReadiness,
    toggleSchoolForReadiness,
    clearSelectedSchoolsForReadiness,
    currentDiagnosis,
  } = useLeadStore();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("schools_title")}</h1>
        <p className="text-muted-foreground mt-2">{t("schools_subtitle")}</p>
        {directory.source && (
          <div className="mt-1 text-xs text-muted-foreground">
            데이터 출처: <span className="font-mono">{directory.source}</span> {directory.operational ? "(운영 DB)" : "(시드 fallback)"}
          </div>
        )}
      </div>

      <SchoolsFilterCard
        accreditation={directory.accreditation}
        locale={directory.locale}
        maxTuition={directory.maxTuition}
        onAccreditationChange={directory.setAccreditation}
        onMaxTuitionChange={directory.setMaxTuition}
        onProgramChange={directory.setProgram}
        onRegionChange={directory.setRegion}
        onReset={directory.reset}
        program={directory.program}
        region={directory.region}
        resultCount={directory.schools.length}
        total={directory.total}
      />

      <SelectedSchoolsBanner
        hasCurrentDiagnosis={Boolean(currentDiagnosis)}
        locale={directory.locale}
        onClear={clearSelectedSchoolsForReadiness}
        selectedSchools={selectedSchoolsForReadiness}
      />

      {directory.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {directory.error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {directory.schools.map((school) => (
          <SchoolCard
            key={school.id}
            isSelected={selectedSchoolsForReadiness.some((item) => item.id === school.id)}
            locale={directory.locale}
            onToggle={toggleSchoolForReadiness}
            school={school}
          />
        ))}
      </div>
      {!directory.loading && directory.schools.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          {directory.locale === "ko" ? "조건에 맞는 학교가 없습니다. 필터를 조정해보세요." : "No matching schools. Adjust filters."}
        </div>
      )}
      {directory.loading && directory.schools.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          {directory.locale === "ko" ? "학교 데이터를 불러오는 중..." : "Loading schools..."}
        </div>
      )}
    </div>
  );
}
