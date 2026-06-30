"use client";

import { useState, useMemo } from "react";
import { useLangStore } from "@/store/kbridge";
import { tr, type Lang } from "@/lib/i18n/translations";
import { SCHOOLS, filterSchools, type School, type Accreditation } from "@/lib/data/schools";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ExternalLink, School as SchoolIcon, MapPin, Banknote, Home, AlertTriangle, ShieldCheck } from "lucide-react";

const REGION_LABELS: Record<string, Record<Lang, string>> = {
  seoul: { ko: "서울", vi: "Seoul", mn: "Сеул", en: "Seoul" },
  gyeonggi: { ko: "경기", vi: "Gyeonggi", mn: "Кёнги", en: "Gyeonggi" },
  busan: { ko: "부산", vi: "Busan", mn: "Пусан", en: "Busan" },
  daegu: { ko: "대구", vi: "Daegu", mn: "Тэгу", en: "Daegu" },
  gwangju: { ko: "광주", vi: "Gwangju", mn: "Кванчжу", en: "Gwangju" },
  other: { ko: "기타 지방", vi: "Khu vực khác", mn: "Бусад бүс", en: "Other" },
};

const PROGRAM_LABELS: Record<string, Record<Lang, string>> = {
  language: { ko: "어학당 (D-4)", vi: "Lớp tiếng (D-4)", mn: "Хэлний курс (D-4)", en: "Language (D-4)" },
  college: { ko: "전문대 (D-2)", vi: "Cao đẳng (D-2)", mn: "Коллеж (D-2)", en: "College (D-2)" },
  university: { ko: "4년제 (D-2)", vi: "ĐH (D-2)", mn: "Бакалавр (D-2)", en: "Univ (D-2)" },
  graduate: { ko: "대학원 (D-2)", vi: "Thạc sĩ (D-2)", mn: "Магистр (D-2)", en: "Grad (D-2)" },
  vocational: { ko: "직업계열 (D-2)", vi: "Nghề (D-2)", mn: "Мэргэжлийн (D-2)", en: "Vocational (D-2)" },
};

export function Schools() {
  const { lang } = useLangStore();
  const [region, setRegion] = useState("all");
  const [program, setProgram] = useState("all");
  const [accred, setAccred] = useState("all");
  const [maxTuition, setMaxTuition] = useState(6000000);

  const filtered = useMemo(
    () => filterSchools({ region, program, accreditation: accred, maxTuition }),
    [region, program, accred, maxTuition]
  );

  const reset = () => {
    setRegion("all");
    setProgram("all");
    setAccred("all");
    setMaxTuition(6000000);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{tr("schools_title", lang)}</h1>
        <p className="text-muted-foreground mt-2">{tr("schools_subtitle", lang)}</p>
      </div>

      {/* 필터 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filter</CardTitle>
            <Button variant="ghost" size="sm" onClick={reset}>
              {tr("filter_reset", lang)}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">{tr("filter_region", lang)}</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tr("region_any", lang)}</SelectItem>
                  {Object.entries(REGION_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v[lang]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{tr("filter_program", lang)}</Label>
              <Select value={program} onValueChange={setProgram}>
                <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tr("region_any", lang)}</SelectItem>
                  {Object.entries(PROGRAM_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v[lang]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{tr("filter_accreditation", lang)}</Label>
              <Select value={accred} onValueChange={setAccred}>
                <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tr("region_any", lang)}</SelectItem>
                  <SelectItem value="accredited">{tr("school_accredited", lang)}</SelectItem>
                  <SelectItem value="standard">{tr("school_non_accredited", lang)}</SelectItem>
                  <SelectItem value="caution">{tr("school_caution", lang)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">
                {tr("filter_tuition_max", lang)}: <span className="font-mono">{maxTuition.toLocaleString()}₩</span>
              </Label>
              <Slider
                value={[maxTuition]}
                onValueChange={([v]) => setMaxTuition(v)}
                min={1000000}
                max={6000000}
                step={100000}
              />
            </div>
          </div>
          <div className="mt-3 text-sm text-muted-foreground">
            {filtered.length} / {SCHOOLS.length} {lang === "ko" ? "결과" : lang === "vi" ? "kết quả" : lang === "mn" ? "үр дүн" : "results"}
          </div>
        </CardContent>
      </Card>

      {/* 학교 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s) => (
          <SchoolCard key={s.id} school={s} lang={lang} />
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          {lang === "ko" ? "조건에 맞는 학교가 없습니다. 필터를 조정해보세요." : "No matching schools. Adjust filters."}
        </div>
      )}
    </div>
  );
}

function SchoolCard({ school, lang }: { school: School; lang: Lang }) {
  const accredBadge = {
    accredited: { variant: "default" as const, label: tr("school_accredited", lang), icon: ShieldCheck },
    standard: { variant: "secondary" as const, label: tr("school_non_accredited", lang), icon: SchoolIcon },
    caution: { variant: "destructive" as const, label: tr("school_caution", lang), icon: AlertTriangle },
  }[school.accreditation];

  const AccredIcon = accredBadge.icon;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-base leading-tight">{school.name[lang]}</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3" />
              {REGION_LABELS[school.region][lang]} · {PROGRAM_LABELS[school.program][lang]}
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
            <Banknote className="h-3 w-3" /> {tr("school_tuition", lang)}
          </span>
          <span className="font-mono">{school.tuitionPerSemester.toLocaleString()}₩</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground flex items-center gap-1">
            <Home className="h-3 w-3" /> {tr("school_dormitory", lang)}
          </span>
          {school.dormitoryAvailable ? (
            <span>{school.dormitoryCost?.toLocaleString()}₩ / 6mo</span>
          ) : (
            <Badge variant="outline" className="text-xs">{tr("school_unavailable", lang)}</Badge>
          )}
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{tr("school_topik", lang)}</span>
          <span className="text-right max-w-[60%]">{school.koreanRequirement}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{lang === "ko" ? "입학시기" : lang === "vi" ? "Kỳ nhập học" : lang === "mn" ? "Элсэлт" : "Intake"}</span>
          <span className="text-right">{school.intake.join(", ")}</span>
        </div>
        {school.accreditation === "caution" && (
          <div className="mt-2 rounded-md bg-destructive/10 border border-destructive/20 p-2 text-xs text-destructive">
            {school.notes[lang]}
          </div>
        )}
        <div className="pt-2 flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" asChild>
            <a href={school.officialUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 mr-1" />
              {tr("school_official_link", lang)}
            </a>
          </Button>
          <Button size="sm" className="flex-1">
            {tr("school_apply", lang)}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
