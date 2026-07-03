"use client";

import { useEffect, useMemo, useState } from "react";
import { useCostStore, useLangStore } from "@/store/kbridge";
import { tr, translationKey } from "@/lib/i18n/translations";
import type { School } from "@/lib/data/schools";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Save, Trash2 } from "lucide-react";

const COST_ITEMS = [
  "cost_item_application",
  "cost_item_tuition",
  "cost_item_dorm",
  "cost_item_insurance",
  "cost_item_translation",
  "cost_item_visa",
  "cost_item_flight",
  "cost_item_settle",
  "cost_item_platform",
  "cost_item_partner",
] as const;

// 항목별 기본값 (플랫폼 예상)
const PLATFORM_DEFAULTS: Record<string, number> = {
  cost_item_application: 80000,
  cost_item_tuition: 1700000,
  cost_item_dorm: 2400000,
  cost_item_insurance: 240000,
  cost_item_translation: 150000,
  cost_item_visa: 60000,
  cost_item_flight: 400000,
  cost_item_settle: 1200000,
  cost_item_platform: 49000,
  cost_item_partner: 99000,
};

const PLATFORM_FEE_ITEMS = new Set(["cost_item_application", "cost_item_visa", "cost_item_platform", "cost_item_partner"]);

function schoolCostPatch(school: School): Record<"cost_item_tuition" | "cost_item_dorm", number> {
  return {
    cost_item_tuition: school.tuitionPerSemester,
    cost_item_dorm: school.dormitoryAvailable ? (school.dormitoryCost ?? 0) : 0,
  };
}

export function CostCalculator() {
  const { lang } = useLangStore();
  const { savedCosts, saveCost, removeCost } = useCostStore();
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [schoolsError, setSchoolsError] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<string>("");
  const [platformValues, setPlatformValues] = useState<Record<string, number>>(PLATFORM_DEFAULTS);
  const [brokerValues, setBrokerValues] = useState<Record<string, number>>({});
  const [brokerTotalInput, setBrokerTotalInput] = useState<number>(0);
  const [savedAlert, setSavedAlert] = useState(false);

  const school = useMemo(
    () => schools.find((s) => s.id === selectedSchool) || schools[0] || null,
    [schools, selectedSchool]
  );

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/schools", { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load schools");
        return res.json();
      })
      .then((data) => {
        const nextSchools = Array.isArray(data.schools) ? data.schools as School[] : [];
        setSchools(nextSchools);
        setSchoolsError(false);
        setSelectedSchool((current) => {
          if (current && nextSchools.some((item) => item.id === current)) return current;
          return nextSchools[0]?.id || "";
        });
        if (nextSchools[0]) {
          setPlatformValues((prev) => ({ ...prev, ...schoolCostPatch(nextSchools[0]) }));
        }
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("[cost-schools]", err);
        setSchoolsError(true);
      })
      .finally(() => setSchoolsLoading(false));

    return () => controller.abort();
  }, []);

  const applySchool = () => {
    if (!school) return;
    setPlatformValues((prev) => ({ ...prev, ...schoolCostPatch(school) }));
  };

  // 학교 선택 변경시 자동으로 비용 반영
  const onSchoolChange = (id: string) => {
    setSelectedSchool(id);
    const selected = schools.find((x) => x.id === id);
    if (selected) setPlatformValues((prev) => ({ ...prev, ...schoolCostPatch(selected) }));
  };

  const platformTotal = Object.values(platformValues).reduce((a, b) => a + b, 0);
  const brokerTotal = brokerTotalInput || Object.values(brokerValues).reduce((a, b) => a + b, 0);
  const diff = brokerTotal - platformTotal;
  const diffPct = platformTotal > 0 ? Math.round((diff / platformTotal) * 100) : 0;

  const isOver = brokerTotal > 0 && diffPct > 30;

  const handleSave = () => {
    if (!school) return;
    saveCost({
      schoolId: school.id,
      schoolName: school.name[lang],
      total: platformTotal,
      items: { ...platformValues },
      brokerTotal: brokerTotal > 0 ? brokerTotal : undefined,
    });
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 2500);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{tr("cost_title", lang)}</h1>
        <p className="text-muted-foreground mt-2">{tr("cost_subtitle", lang)}</p>
      </div>

      {/* 학교 선택 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{tr("nav_schools", lang)}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedSchool} onValueChange={onSchoolChange}>
              <SelectTrigger className="flex-1" disabled={schoolsLoading || schools.length === 0}>
                <SelectValue
                  placeholder={
                    schoolsLoading
                      ? lang === "ko" ? "학교 데이터를 불러오는 중..." : "Loading school data..."
                      : lang === "ko" ? "학교 데이터 없음" : "No school data"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {schools.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name[lang]} ({s.tuitionPerSemester.toLocaleString()}₩)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={applySchool} disabled={!school}>
              {lang === "ko" ? "학교 비용 반영" : lang === "vi" ? "Áp dụng" : lang === "mn" ? "Хэрэглэх" : "Apply school costs"}
            </Button>
          </div>
          {schoolsError && (
            <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {lang === "ko" ? "운영 학교 데이터를 불러오지 못했습니다." : "Could not load operational school data."}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 비교 테이블 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{tr("cost_subtitle", lang)}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
              <div className="col-span-6">{lang === "ko" ? "항목" : lang === "vi" ? "Hạng mục" : lang === "mn" ? "Бичлэг" : "Item"}</div>
              <div className="col-span-3 text-right text-primary">{tr("cost_platform", lang)}</div>
              <div className="col-span-3 text-right text-destructive">{tr("cost_broker", lang)}</div>
            </div>
            {COST_ITEMS.map((item) => (
              <div key={item} className="grid grid-cols-12 gap-2 items-center py-1">
                <div className="col-span-6 flex items-center gap-1.5 text-sm">
                  {tr(translationKey(item, "cost_item_application"), lang)}
                  {PLATFORM_FEE_ITEMS.has(item) && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      {lang === "ko" ? "명확" : "clear"}
                    </Badge>
                  )}
                </div>
                <Input
                  type="number"
                  className="col-span-3 text-right font-mono text-sm h-8"
                  value={platformValues[item] ?? 0}
                  onChange={(e) =>
                    setPlatformValues((p) => ({ ...p, [item]: Number(e.target.value) }))
                  }
                />
                <Input
                  type="number"
                  placeholder="0"
                  className="col-span-3 text-right font-mono text-sm h-8"
                  value={brokerValues[item] ?? ""}
                  onChange={(e) =>
                    setBrokerValues((p) => ({ ...p, [item]: Number(e.target.value) }))
                  }
                />
              </div>
            ))}

            {/* 총액 */}
            <div className="grid grid-cols-12 gap-2 pt-3 mt-2 border-t-2 items-center">
              <div className="col-span-6 font-bold">{tr("cost_total", lang)}</div>
              <div className="col-span-3 text-right font-mono font-bold text-primary">
                {platformTotal.toLocaleString()}₩
              </div>
              <div className="col-span-3 text-right font-mono font-bold text-destructive">
                {brokerTotal > 0 ? `${brokerTotal.toLocaleString()}₩` : "—"}
              </div>
            </div>
          </div>

          {/* 총액 직접 입력 옵션 */}
          <div className="mt-4 pt-3 border-t flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <Label className="text-xs text-muted-foreground">
              {lang === "ko" ? "브로커가 총액만 말한 경우 (선택)" : lang === "vi" ? "Nếu môi giới chỉ báo tổng" : lang === "mn" ? "Зуучлагч зөвхөн нийт дүнг хэлсэн бол" : "If broker only quotes total"}
            </Label>
            <Input
              type="number"
              placeholder="0"
              value={brokerTotalInput || ""}
              onChange={(e) => {
                const v = Number(e.target.value);
                setBrokerTotalInput(v);
                if (v > 0) setBrokerValues({});
              }}
              className="text-right font-mono h-8 sm:max-w-xs"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setBrokerTotalInput(0);
                setBrokerValues({});
              }}
            >
              {tr("filter_reset", lang)}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 경고 */}
      {brokerTotal > 0 && (
        <Card className={isOver ? "border-destructive" : "border-green-500"}>
          <CardContent className="pt-6 flex items-start gap-3">
            {isOver ? (
              <AlertTriangle className="h-6 w-6 text-destructive shrink-0" />
            ) : (
              <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
            )}
            <div className="flex-1">
              <div className="font-medium">
                {isOver ? tr("cost_warning_broker", lang) : tr("cost_warning_normal", lang)}
              </div>
              {isOver && (
                <div className="text-sm text-muted-foreground mt-1">
                  {lang === "ko" && `플랫폼 예상 ${platformTotal.toLocaleString()}₩ 대비 ${diff.toLocaleString()}₩ (${diffPct}%) 더 비쌉니다. 항목별로 어느 부분이 부풀려졌는지 비교하세요.`}
                  {lang === "vi" && `Cao hơn ${diff.toLocaleString()}₩ (${diffPct}%) so với nền tảng.`}
                  {lang === "mn" && `Платформын ${platformTotal.toLocaleString()}₩-ээс ${diff.toLocaleString()}₩ (${diffPct}%) өндөр.`}
                  {lang === "en" && `${diff.toLocaleString()}₩ (${diffPct}%) higher than platform estimate.`}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 저장 */}
      <Card>
        <CardContent className="pt-6 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div>
            <div className="font-medium">{tr("cost_add_to_workspace", lang)}</div>
            <div className="text-sm text-muted-foreground">
              {lang === "ko" && "플랫폼 예상 비용이 브라우저에 저장됩니다 (최대 20개)."}
              {lang === "vi" && "Lưu vào trình duyệt (tối đa 20)."}
              {lang === "mn" && "Хөтөчөөр хадгалах (20 хүртэл)."}
              {lang === "en" && "Saves to browser (max 20)."}
            </div>
            {savedAlert && (
              <div className="text-sm text-green-600 flex items-center gap-1 mt-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {lang === "ko" ? "저장되었습니다!" : "Saved!"}
              </div>
            )}
          </div>
          <Button className="gap-2" onClick={handleSave} disabled={!school}>
            <Save className="h-4 w-4" />
            {tr("cost_add_to_workspace", lang)}
          </Button>
        </CardContent>
      </Card>

      {savedCosts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {lang === "ko" ? "저장된 비용 견적" : "Saved estimates"} ({savedCosts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {savedCosts.map((cost) => (
              <div key={cost.id} className="flex items-center justify-between gap-2 p-2 rounded-md border text-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{cost.schoolName}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(cost.savedAt).toLocaleDateString()} · {cost.total.toLocaleString()}₩
                    {cost.brokerTotal ? ` (브로커: ${cost.brokerTotal.toLocaleString()}₩)` : ""}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive"
                  onClick={() => removeCost(cost.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
