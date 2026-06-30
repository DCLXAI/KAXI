"use client";

import { useState } from "react";
import { useLangStore, useLeadStore } from "@/store/kbridge";
import { tr } from "@/lib/i18n/translations";
import { recommendPath, type DiagnosisInput, pickLang } from "@/lib/data/diagnosis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, Clock, FileText, AlertTriangle, ArrowRight, Save, Loader2 } from "lucide-react";

export function Diagnosis({ onNavigate }: { onNavigate: (v: string) => void }) {
  const { lang } = useLangStore();
  const { saveDiagnosis, savingDiagnosis } = useLeadStore();
  const [result, setResult] = useState<ReturnType<typeof recommendPath> | null>(null);
  const [showSave, setShowSave] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");

  const [input, setInput] = useState<DiagnosisInput>({
    nationality: "vn",
    age: "20",
    education: "highschool",
    korean: "none",
    goal: "language",
    budget: 10000000,
    region: "any",
    usingBroker: false,
    brokerCost: 0,
    hasHistory: false,
  });

  const update = (patch: Partial<DiagnosisInput>) => setInput((p) => ({ ...p, ...patch }));

  const submit = () => {
    const rec = recommendPath(input);
    setResult(rec);
    setShowSave(false);
    setSaveError(null);
    setTimeout(() => {
      document.getElementById("result-section")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const save = async () => {
    if (!result) return;
    setSaveError(null);
    const leadId = await saveDiagnosis(nickname || "익명", input, result);
    if (leadId) {
      setShowSave(true);
    } else {
      setSaveError(
        lang === "ko"
          ? "저장 중 오류가 발생했습니다. 다시 시도해주세요."
          : "Save error. Please retry."
      );
    }
  };

  const pathLabel = tr(result?.pathKey as any ?? "goal_language", lang);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{tr("diagnose_title", lang)}</h1>
        <p className="text-muted-foreground mt-2">{tr("diagnose_subtitle", lang)}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{tr("diagnose_subtitle", lang)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* 국적 */}
          <div className="space-y-2">
            <Label>{tr("diagnose_q_nationality", lang)}</Label>
            <Select value={input.nationality} onValueChange={(v) => update({ nationality: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="vn">🇻🇳 Vietnam</SelectItem>
                <SelectItem value="mn">🇲🇳 Mongolia</SelectItem>
                <SelectItem value="cn">🇨🇳 China</SelectItem>
                <SelectItem value="uz">🇺🇿 Uzbekistan</SelectItem>
                <SelectItem value="other">{lang === "ko" ? "기타" : "Other"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 나이 + 학력 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{tr("diagnose_q_age", lang)}</Label>
              <Input
                type="number"
                value={input.age}
                onChange={(e) => update({ age: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{tr("diagnose_q_education", lang)}</Label>
              <Select value={input.education} onValueChange={(v) => update({ education: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="highschool">{tr("edu_highschool", lang)}</SelectItem>
                  <SelectItem value="college">{tr("edu_college", lang)}</SelectItem>
                  <SelectItem value="university">{tr("edu_university", lang)}</SelectItem>
                  <SelectItem value="master">{tr("edu_master", lang)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 한국어 수준 */}
          <div className="space-y-2">
            <Label>{tr("diagnose_q_korean", lang)}</Label>
            <RadioGroup
              value={input.korean}
              onValueChange={(v) => update({ korean: v as any })}
              className="grid grid-cols-2 md:grid-cols-4 gap-2"
            >
              {[
                { v: "none", l: tr("korean_none", lang) },
                { v: "topik1", l: tr("korean_topik1", lang) },
                { v: "topik2", l: tr("korean_topik2", lang) },
                { v: "topik3", l: tr("korean_topik3", lang) },
              ].map((o) => (
                <div key={o.v} className="flex items-center space-x-2">
                  <RadioGroupItem value={o.v} id={`k-${o.v}`} />
                  <Label htmlFor={`k-${o.v}`} className="cursor-pointer text-sm font-normal">
                    {o.l}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* 희망 과정 */}
          <div className="space-y-2">
            <Label>{tr("diagnose_q_goal", lang)}</Label>
            <RadioGroup
              value={input.goal}
              onValueChange={(v) => update({ goal: v as any })}
              className="grid gap-2"
            >
              {[
                { v: "language", l: tr("goal_language", lang) },
                { v: "degree", l: tr("goal_degree", lang) },
                { v: "transfer", l: tr("goal_transfer", lang) },
                { v: "career", l: tr("goal_career", lang) },
                { v: "unsure", l: tr("goal_unsure", lang) },
              ].map((o) => (
                <div key={o.v} className="flex items-center space-x-2">
                  <RadioGroupItem value={o.v} id={`g-${o.v}`} />
                  <Label htmlFor={`g-${o.v}`} className="cursor-pointer text-sm">
                    {o.l}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* 예산 + 지역 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{tr("diagnose_q_budget", lang)}</Label>
              <Input
                type="number"
                step="500000"
                value={input.budget}
                onChange={(e) => update({ budget: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                {input.budget.toLocaleString()} KRW
              </p>
            </div>
            <div className="space-y-2">
              <Label>{tr("diagnose_q_region", lang)}</Label>
              <Select value={input.region} onValueChange={(v) => update({ region: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">{tr("region_any", lang)}</SelectItem>
                  <SelectItem value="seoul">{tr("region_seoul", lang)}</SelectItem>
                  <SelectItem value="gyeonggi">{tr("region_gyeonggi", lang)}</SelectItem>
                  <SelectItem value="busan">{tr("region_busan", lang)}</SelectItem>
                  <SelectItem value="daegu">{tr("region_daegu", lang)}</SelectItem>
                  <SelectItem value="gwangju">{tr("region_gwangju", lang)}</SelectItem>
                  <SelectItem value="other">{tr("region_other", lang)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 브로커 이용 */}
          <div className="space-y-2">
            <Label>{tr("diagnose_q_broker", lang)}</Label>
            <RadioGroup
              value={input.usingBroker ? "yes" : "no"}
              onValueChange={(v) => update({ usingBroker: v === "yes" })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="b-yes" />
                <Label htmlFor="b-yes" className="cursor-pointer">{tr("yes", lang)}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="b-no" />
                <Label htmlFor="b-no" className="cursor-pointer">{tr("no", lang)}</Label>
              </div>
            </RadioGroup>
          </div>

          {input.usingBroker && (
            <div className="space-y-2">
              <Label>{tr("diagnose_q_broker_cost", lang)}</Label>
              <Input
                type="number"
                step="100000"
                value={input.brokerCost}
                onChange={(e) => update({ brokerCost: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                {input.brokerCost.toLocaleString()} KRW
              </p>
            </div>
          )}

          {/* 비자 이력 */}
          <div className="space-y-2">
            <Label>{tr("diagnose_q_history", lang)}</Label>
            <RadioGroup
              value={input.hasHistory ? "yes" : "no"}
              onValueChange={(v) => update({ hasHistory: v === "yes" })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="h-yes" />
                <Label htmlFor="h-yes" className="cursor-pointer">{tr("yes", lang)}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="h-no" />
                <Label htmlFor="h-no" className="cursor-pointer">{tr("no", lang)}</Label>
              </div>
            </RadioGroup>
          </div>

          <Button size="lg" className="w-full" onClick={submit}>
            {tr("diagnose_submit", lang)}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>

      {/* 결과 */}
      {result && (
        <div id="result-section" className="space-y-4">
          <Card>
            <CardHeader>
              <Badge className="w-fit">{tr("result_recommended", lang)}</Badge>
              <CardTitle className="text-2xl mt-2">{pathLabel}</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 rounded-lg bg-muted/30 p-4">
                <Clock className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="text-sm text-muted-foreground">{tr("result_prep_time", lang)}</div>
                  <div className="font-medium mt-1">{pickLang(result.prepTime, lang)}</div>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-muted/30 p-4">
                <ArrowRight className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="text-sm text-muted-foreground">{tr("result_estimated_cost", lang)}</div>
                  <div className="font-medium mt-1">{result.estimatedCost.toLocaleString()} KRW</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                {tr("result_required_docs", lang)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {result.requiredDocs.map((k) => (
                  <Badge key={k} variant="outline">{tr(k as any, lang)}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {result.warnings.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{tr("result_warnings", lang)}</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  {result.warnings.map((w, i) => (
                    <li key={i}>{pickLang(w, lang)}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{tr("result_next_actions", lang)}</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {result.nextActions.map((a, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-sm">{pickLang(a, lang)}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {/* 저장 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Save className="h-4 w-4" />
                {tr("diagnose_save_lead", lang)}
              </CardTitle>
              <CardDescription>
                {lang === "ko" && "결과를 저장하고 상담을 예약하세요 (데모: 관리자 화면에서 확인 가능)"}
                {lang === "vi" && "Lưu kết quả và đặt lịch (demo)"}
                {lang === "mn" && "Хадгалж зөвлөгөө захиалах (demo)"}
                {lang === "en" && "Save & book consultation (demo)"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder={lang === "ko" ? "닉네임" : lang === "vi" ? "Biệt danh" : lang === "mn" ? "Хоч нэр" : "Nickname"}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="sm:max-w-xs"
                  disabled={savingDiagnosis}
                />
                <Button onClick={save} className="gap-2" disabled={savingDiagnosis}>
                  {savingDiagnosis ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {tr("diagnose_save_lead", lang)}
                </Button>
              </div>
              {showSave && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    {lang === "ko" && "저장되었습니다! 관리자 화면에서도 확인 가능합니다. 이제 학교 비교로 진행하세요."}
                    {lang === "vi" && "Đã lưu! Có thể xem ở trang quản trị."}
                    {lang === "mn" && "Хадгаллаа! Админ хуудаснаас харна."}
                    {lang === "en" && "Saved! Visible in admin page."}
                  </AlertDescription>
                </Alert>
              )}
              {saveError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{saveError}</AlertDescription>
                </Alert>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" onClick={() => onNavigate("schools")}>
                  {tr("nav_schools", lang)} →
                </Button>
                <Button variant="outline" onClick={() => onNavigate("cost")}>
                  {tr("nav_cost", lang)} →
                </Button>
                <Button variant="outline" onClick={() => onNavigate("docs")}>
                  {tr("nav_docs", lang)} →
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
