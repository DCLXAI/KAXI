"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, FileText, Info, Loader2, LogIn, Save, ShieldCheck } from "lucide-react";
import { pickLang, recommendPath } from "@/lib/data/diagnosis";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ReadinessScoreCard } from "@/components/kbridge/ReadinessScoreCard";
import { KaxiCat } from "@/components/brand/KaxiCat";
import { KaxiPawMark } from "@/components/brand/KaxiPawMark";

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
  const coverageStatus = result.complianceCoverage?.status ?? "not_evaluated";
  const coverageLabelKey = coverageStatus === "rule_engine"
    ? "result_basis_rule_engine"
    : coverageStatus === "rag_only"
      ? "result_basis_rag_only"
      : "result_basis_not_evaluated";

  return (
    <div id="result-section" className="space-y-4">
      <Card
        className="relative overflow-hidden border-primary-strong/25 bg-gradient-to-br from-primary/20 via-card to-card dark:from-primary/10 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-snappy motion-reduce:animate-none"
        style={{ animationDelay: "0ms", animationFillMode: "backwards" }}
      >
        <KaxiPawMark className="pointer-events-none absolute -right-3 -top-3 h-24 w-24 rotate-12 text-icon-accent/[0.08] dark:text-icon-accent/10" />
        <CardHeader className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="w-fit">{t("result_recommended")}</Badge>
            {/* Deliberately a badge beside the path, not another bullet in the
                warnings list: "no rule engine ran for this status" is a
                different kind of statement from "your budget looks short", and
                burying it among the red warnings made the two look equally
                severe. */}
            <Badge
              variant={coverageStatus === "rule_engine" ? "secondary" : "outline"}
              className={cn(
                "w-fit gap-1 font-normal",
                coverageStatus === "rule_engine"
                  ? "border-primary-strong/30 bg-primary-strong/10 text-primary-strong dark:bg-primary-strong/15"
                  : "bg-background/60 text-muted-foreground",
              )}
            >
              {coverageStatus === "rule_engine" ? <ShieldCheck className="h-3 w-3" /> : <Info className="h-3 w-3" />}
              {t("result_basis_label")} · {t(coverageLabelKey)}
            </Badge>
          </div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <CardTitle className="font-serif text-3xl md:text-4xl">{pathLabel}</CardTitle>
            <KaxiCat state="happy" size={48} className="shrink-0 animate-in fade-in zoom-in-75 duration-300 ease-snappy motion-reduce:animate-none" />
          </div>
          {coverageStatus === "rag_only" && (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t("result_basis_rag_only_detail")}
            </p>
          )}
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 rounded-lg border border-primary-strong/15 bg-background/65 p-4 dark:bg-background/40">
            <Clock className="h-5 w-5 text-primary-strong mt-0.5" />
            <div>
              <div className="text-sm text-muted-foreground">{t("result_prep_time")}</div>
              <div className="font-medium mt-1">{pickLang(result.prepTime, locale)}</div>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-primary-strong/15 bg-background/65 p-4 dark:bg-background/40">
            <ArrowRight className="h-5 w-5 text-primary-strong mt-0.5" />
            <div>
              <div className="text-sm text-muted-foreground">{t("result_estimated_cost")}</div>
              <div className="font-medium mt-1">{result.estimatedCost.toLocaleString()} KRW</div>
            </div>
          </div>
          {(result.pathKey === "goal_in_korea_d10" || result.pathKey === "goal_in_korea_e7") && (
            <Button asChild className="gap-2 md:col-span-2">
              {/* Inline on purpose: importing the agent meta barrel would pull
                  agent-only modules into this client bundle. */}
              <a href={result.visaType === "D-10" || result.visaType === "E-7" ? `/docs?track=${result.visaType}` : "/docs"}>
                {t("diagnose_cta_docs_workspace")}
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          )}
        </CardContent>
      </Card>

      {result.readiness && (
        <div
          className="animate-in fade-in slide-in-from-bottom-2 duration-300 ease-snappy motion-reduce:animate-none"
          style={{ animationDelay: "60ms", animationFillMode: "backwards" }}
        >
          <ReadinessScoreCard readiness={result.readiness} lang={locale} />
        </div>
      )}

      <Card
        className="animate-in fade-in slide-in-from-bottom-2 duration-300 ease-snappy motion-reduce:animate-none"
        style={{ animationDelay: "120ms", animationFillMode: "backwards" }}
      >
        <CardHeader>
          <CardTitle className="font-serif flex items-center gap-2 text-lg">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-icon-accent/15 text-icon-accent"><FileText className="h-4 w-4" /></span>
            {t("result_required_docs")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {result.requiredDocs.map((key) => (
              <Badge key={key} variant="outline" className="border-icon-accent/40 bg-icon-accent/10 text-foreground">{t(key)}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {result.warnings.length > 0 && (
        <Alert
          variant="destructive"
          className="animate-in fade-in slide-in-from-bottom-2 duration-300 ease-snappy motion-reduce:animate-none"
          style={{ animationDelay: "180ms", animationFillMode: "backwards" }}
        >
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

      <Card
        className="animate-in fade-in slide-in-from-bottom-2 duration-300 ease-snappy motion-reduce:animate-none"
        style={{ animationDelay: "240ms", animationFillMode: "backwards" }}
      >
        <CardHeader>
          <CardTitle className="font-serif text-lg">{t("result_next_actions")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {result.nextActions.map((action, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/30 text-[11px] font-semibold tabular-nums text-primary-foreground dark:bg-primary/20 dark:text-primary">
                  {index + 1}
                </span>
                <span className="text-sm">{pickLang(action, locale)}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card
        className="border-primary-strong/25 shadow-md shadow-primary-strong/5 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-snappy motion-reduce:animate-none"
        style={{ animationDelay: "300ms", animationFillMode: "backwards" }}
      >
        <CardHeader>
          <CardTitle className="font-serif text-lg flex items-center gap-2">
            <Save className="h-4 w-4" />
            {t("diagnose_save_lead")}
          </CardTitle>
          <CardDescription>{t("diagnose_save_description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <LogIn className="h-3.5 w-3.5 shrink-0 text-primary-strong" />
            <span>{t("diagnose_login_nudge")}</span>
            <Link
              href={`/login?lang=${locale}`}
              className="font-medium text-primary-strong underline-offset-2 hover:underline"
            >
              {t("nav_login")} →
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder={t("diagnose_nickname_placeholder")}
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
            <div
              role="status"
              className="flex flex-col gap-3 rounded-lg border border-primary-strong/30 bg-primary-strong/5 p-4 sm:flex-row sm:items-center"
            >
              <KaxiCat state="happy" size={40} className="shrink-0" />
              <p className="flex-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary-strong" />
                {t("diagnose_save_success")}
              </p>
              <Button onClick={() => onNavigate("consult")} className="shrink-0 gap-2">
                {t("diagnose_cta_consult")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          {saveError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{saveError}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            {showSave && (
              <Button variant="outline" onClick={() => onNavigate("partners")}>{t("partner_request")} →</Button>
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
