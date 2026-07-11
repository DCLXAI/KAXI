"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, FileText, Loader2, Save } from "lucide-react";
import { pickLang, recommendPath } from "@/lib/data/diagnosis";
import type { Locale } from "@/i18n/routing";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ReadinessScoreCard } from "@/components/kbridge/ReadinessScoreCard";

interface DiagnosisResultProps {
  locale: Locale;
  nickname: string;
  onNavigate: (view: string) => void;
  onNicknameChange: (value: string) => void;
  onSave: () => void;
  result: ReturnType<typeof recommendPath>;
  saveError: string | null;
  savingDiagnosis: boolean;
  showSave: boolean;
}

export function DiagnosisResult({
  locale,
  nickname,
  onNavigate,
  onNicknameChange,
  onSave,
  result,
  saveError,
  savingDiagnosis,
  showSave,
}: DiagnosisResultProps) {
  const t = useTranslations();
  const pathLabel = t(result.pathKey || "goal_language");

  return (
    <div id="result-section" className="space-y-4">
      <Card>
        <CardHeader>
          <Badge className="w-fit">{t("result_recommended")}</Badge>
          <CardTitle className="text-2xl mt-2">{pathLabel}</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 rounded-lg bg-muted/30 p-4">
            <Clock className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <div className="text-sm text-muted-foreground">{t("result_prep_time")}</div>
              <div className="font-medium mt-1">{pickLang(result.prepTime, locale)}</div>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-muted/30 p-4">
            <ArrowRight className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <div className="text-sm text-muted-foreground">{t("result_estimated_cost")}</div>
              <div className="font-medium mt-1">{result.estimatedCost.toLocaleString()} KRW</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {result.readiness && <ReadinessScoreCard readiness={result.readiness} lang={locale} />}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            {t("result_required_docs")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {result.requiredDocs.map((key) => (
              <Badge key={key} variant="outline">{t(key)}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {result.warnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("result_warnings")}</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              {result.warnings.map((warning, index) => (
                <li key={index}>{pickLang(warning, locale)}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("result_next_actions")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {result.nextActions.map((action, index) => (
              <li key={index} className="flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span className="text-sm">{pickLang(action, locale)}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Save className="h-4 w-4" />
            {t("diagnose_save_lead")}
          </CardTitle>
          <CardDescription>
            {locale === "ko" && "진단 결과를 저장합니다. 전문가 상담은 저장 후 별도 동의를 거쳐 요청할 수 있습니다."}
            {locale === "vi" && "Lưu kết quả đánh giá. Sau đó, bạn có thể đồng ý và gửi yêu cầu tư vấn riêng."}
            {locale === "mn" && "Үнэлгээний үр дүнг хадгална. Дараа нь зөвшөөрөл өгч тусдаа зөвлөгөө хүсэж болно."}
            {locale === "en" && "Save your diagnosis result. You can then consent and submit a separate consultation request."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder={locale === "ko" ? "닉네임" : locale === "vi" ? "Biệt danh" : locale === "mn" ? "Хоч нэр" : "Nickname"}
              value={nickname}
              onChange={(event) => onNicknameChange(event.target.value)}
              className="sm:max-w-xs"
              disabled={savingDiagnosis}
            />
            <Button onClick={onSave} className="gap-2" disabled={savingDiagnosis}>
              {savingDiagnosis ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t("diagnose_save_lead")}
            </Button>
          </div>
          {showSave && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                {locale === "ko" && "결과가 저장되었습니다. 전문가 연결이 필요하면 상담 요청으로 진행하세요."}
                {locale === "vi" && "Đã lưu kết quả. Hãy gửi yêu cầu nếu bạn cần được kết nối với chuyên gia."}
                {locale === "mn" && "Үр дүн хадгалагдлаа. Мэргэжилтэн хэрэгтэй бол зөвлөгөөний хүсэлт илгээнэ үү."}
                {locale === "en" && "Your result is saved. Submit a consultation request if you need an expert connection."}
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
            {showSave && (
              <Button onClick={() => onNavigate("partners")}>{t("partner_request")} →</Button>
            )}
            <Button variant="outline" onClick={() => onNavigate("schools")}>{t("nav_schools")} →</Button>
            <Button variant="outline" onClick={() => onNavigate("cost")}>{t("nav_cost")} →</Button>
            <Button variant="outline" onClick={() => onNavigate("docs")}>{t("nav_docs")} →</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
