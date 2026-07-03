"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Info } from "lucide-react";
import type { ReadinessScore, ReadinessFactor } from "@/lib/data/readiness";
import { tr, translationKey, type Lang } from "@/lib/i18n/translations";

interface ReadinessScoreCardProps {
  readiness: ReadinessScore;
  lang?: Lang;
  compact?: boolean;
  showDisclaimer?: boolean;
}

function getScoreColor(score: number) {
  if (score >= 75) return "text-green-600";
  if (score >= 45) return "text-yellow-600";
  return "text-red-600";
}

function getProgressColor(score: number) {
  if (score >= 75) return "bg-green-500";
  if (score >= 45) return "bg-yellow-500";
  return "bg-red-500";
}

function getRiskLabel(score: number, lang: Lang = "ko") {
  if (score >= 75) return tr("readiness_low", lang);
  if (score >= 45) return tr("readiness_medium", lang);
  return tr("readiness_high", lang);
}

function translateFactor(factor: ReadinessFactor, lang: Lang): string {
  return tr(translationKey(`readiness_factor_${factor.id}`, "readiness_factor_unknown"), lang);
}

export function ReadinessScoreCard({
  readiness,
  lang = "ko",
  compact = false,
  showDisclaimer = true,
}: ReadinessScoreCardProps) {
  const { score, riskLevel, confidence, factors } = readiness;

  const topFactors = factors.slice(0, 5);

  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-lg border p-3">
        <div className={`text-3xl font-bold tabular-nums ${getScoreColor(score)}`}>
          {score}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground">
            {tr("readiness_title", lang)}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant={riskLevel === "low" ? "default" : riskLevel === "medium" ? "secondary" : "destructive"}>
              {getRiskLabel(score, lang)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              ({tr("readiness_confidence", lang)}: {confidence})
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              {tr("readiness_title", lang)}
              <Info className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
            <CardDescription>
              {tr("readiness_subtitle", lang)}
            </CardDescription>
          </div>
          <div className={`text-right text-4xl font-bold tabular-nums ${getScoreColor(score)}`}>
            {score}
            <span className="text-sm font-normal text-muted-foreground ml-0.5">/100</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5 text-sm">
            <span className="font-medium">{getRiskLabel(score, lang)}</span>
            <span className="text-muted-foreground">{tr("readiness_confidence", lang)}: {confidence}</span>
          </div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full transition-all ${getProgressColor(score)}`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        {topFactors.length > 0 && (
          <div>
            <div className="mb-2 text-sm font-medium text-muted-foreground">
              {tr("readiness_factors", lang)}
            </div>
            <div className="space-y-2">
              {topFactors.map((factor, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-3 rounded-md border p-2 text-sm"
                >
                  <div className="flex-1">
                    <span className={factor.category === "positive" ? "text-green-700" : "text-red-700"}>
                      {factor.category === "positive" ? "✓ " : "⚠ "}
                      {translateFactor(factor, lang)}
                    </span>
                    {factor.description && (
                      <div className="mt-0.5 text-xs text-muted-foreground">{factor.description}</div>
                    )}
                  </div>
                  <div
                    className={`shrink-0 font-mono text-right tabular-nums ${
                      factor.delta >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {factor.delta >= 0 ? "+" : ""}
                    {factor.delta}
                  </div>
                </div>
              ))}
            </div>
            {factors.length > 5 && (
              <div className="mt-1 text-xs text-muted-foreground">
                {lang === "ko" ? "외 " : lang === "en" ? "+ " : lang === "vi" ? "+ " : "+ "}
                {factors.length - 5}
                {lang === "ko" ? "개 요인" : lang === "en" ? " more factors" : lang === "vi" ? " yếu tố khác" : " бусад хүчин зүйл"}
              </div>
            )}
          </div>
        )}

        {showDisclaimer && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs leading-relaxed">
              {lang === "ko" && (
                <>이 지수는 KAXI의 규칙 엔진과 공식 출처에 기반한 <strong>참고용 준비 지표</strong>이며, 실제 비자 심사 결과와 다를 수 있습니다. 개인 상황은 반드시 출입국사무소 또는 자격 있는 행정사와 확인하세요.</>
              )}
              {lang === "en" && (
                <>This score is a <strong>reference preparation indicator</strong> based on KAXI's rule engine and official sources. Actual visa outcomes may differ. Always verify with immigration authorities or a qualified scrivener.</>
              )}
              {lang === "vi" && (
                <>Chỉ số này là <strong>chỉ báo tham khảo</strong> dựa trên công cụ quy tắc và nguồn chính thức của KAXI. Kết quả visa thực tế có thể khác. Luôn xác nhận với cơ quan nhập cư hoặc chuyên gia.</>
              )}
              {lang === "mn" && (
                <>Энэ оноо нь KAXI-ийн дүрмийн хөдөлгүүр ба албан ёсны эх сурвалжид суурилсан <strong>лавлагаа бэлтгэлийн үзүүлэлт</strong> юм. Бодит визний үр дүн өөр байж болно. Үргэлж цагаачлалын байгууллага эсвэл мэргэжилтэнтэй баталгаажуулна уу.</>
              )}
            </AlertDescription>
          </Alert>
        )}

        {(riskLevel === "high" || factors.some((f) => f.id.includes("blocked"))) && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {lang === "ko" && "높은 리스크가 감지되었습니다. 행정사 상담을 강력히 권장합니다."}
              {lang === "en" && "High risk detected. Strongly recommend consulting an administrative scrivener."}
              {lang === "vi" && "Phát hiện rủi ro cao. Khuyến nghị mạnh mẽ tham khảo chuyên gia hành chính."}
              {lang === "mn" && "Өндөр эрсдэл илэрлээ. Захиргааны мэргэжилтэнтэй зөвлөлдөхийг зөвлөж байна."}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
