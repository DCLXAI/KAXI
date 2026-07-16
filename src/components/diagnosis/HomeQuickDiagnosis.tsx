"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Award,
  BookOpen,
  Check,
  Coins,
  GraduationCap,
  HelpCircle,
  Languages,
  MessageCircle,
  PiggyBank,
  Repeat2,
  RotateCcw,
  Trophy,
  WalletCards,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KaxiPawMark } from "@/components/brand/KaxiPawMark";
import { tr, translationKey, type Lang } from "@/lib/i18n/translations";
import { pickLang, recommendPath, type PathRecommendation } from "@/lib/data/diagnosis";
import {
  QUICK_BUDGET_IDS,
  QUICK_DIAGNOSIS_IDS,
  QUICK_KOREAN_IDS,
  quickDiagnosisInput,
  quickDiagnosisNeedsLanguageBridge,
  type QuickBudgetId,
  type QuickDiagnosisAnswers,
  type QuickDiagnosisId,
  type QuickKoreanId,
} from "@/lib/data/quick-diagnosis";
import { useLeadStore } from "@/store/kbridge";
import { trackProductEvent } from "@/lib/analytics/client";

type LocalizedText = Record<Lang, string>;

const OPTION_META = {
  language: { icon: Languages, title: "quick_option_language_title", description: "quick_option_language_desc" },
  degree: { icon: GraduationCap, title: "quick_option_degree_title", description: "quick_option_degree_desc" },
  transfer: { icon: Repeat2, title: "quick_option_transfer_title", description: "quick_option_transfer_desc" },
  unsure: { icon: HelpCircle, title: "quick_option_unsure_title", description: "quick_option_unsure_desc" },
} as const;

const KOREAN_META: Record<QuickKoreanId, { icon: typeof MessageCircle; label: LocalizedText; description: LocalizedText }> = {
  none: {
    icon: MessageCircle,
    label: { ko: "아직 못해요", vi: "Chưa biết", mn: "Одоохондоо мэдэхгүй", en: "Not yet" },
    description: { ko: "한글부터 시작", vi: "Bắt đầu từ Hangul", mn: "Хангылаас эхэлнэ", en: "Starting with Hangul" },
  },
  topik1: {
    icon: BookOpen,
    label: { ko: "기초 회화", vi: "Giao tiếp cơ bản", mn: "Анхан яриа", en: "Basic conversation" },
    description: { ko: "TOPIK 1급 안팎", vi: "Khoảng TOPIK 1", mn: "TOPIK 1 орчим", en: "Around TOPIK 1" },
  },
  topik2: {
    icon: Award,
    label: { ko: "일상 대화 가능", vi: "Giao tiếp hằng ngày", mn: "Өдөр тутмын яриа", en: "Everyday conversation" },
    description: { ko: "TOPIK 2급 안팎", vi: "Khoảng TOPIK 2", mn: "TOPIK 2 орчим", en: "Around TOPIK 2" },
  },
  topik3: {
    icon: Trophy,
    label: { ko: "수업을 따라갈 수 있어요", vi: "Có thể theo học", mn: "Хичээл дагаж чадна", en: "Ready for classes" },
    description: { ko: "TOPIK 3급 이상", vi: "TOPIK 3 trở lên", mn: "TOPIK 3-аас дээш", en: "TOPIK 3 or above" },
  },
};

const BUDGET_META: Record<QuickBudgetId, { icon: typeof Coins; label: LocalizedText; description: LocalizedText }> = {
  under8: {
    icon: Coins,
    label: { ko: "800만원 미만", vi: "Dưới 8 triệu KRW", mn: "8 сая KRW-оос бага", en: "Under 8M KRW" },
    description: { ko: "비용 절약이 중요해요", vi: "Ưu tiên tiết kiệm", mn: "Хэмнэлт чухал", en: "Keeping costs low matters" },
  },
  "8to12": {
    icon: PiggyBank,
    label: { ko: "800만~1,200만원", vi: "8–12 triệu KRW", mn: "8–12 сая KRW", en: "8–12M KRW" },
    description: { ko: "기본 준비 예산", vi: "Ngân sách cơ bản", mn: "Үндсэн төсөв", en: "A basic prep budget" },
  },
  "12to18": {
    icon: WalletCards,
    label: { ko: "1,200만~1,800만원", vi: "12–18 triệu KRW", mn: "12–18 сая KRW", en: "12–18M KRW" },
    description: { ko: "학교 선택 폭을 넓게", vi: "Nhiều lựa chọn trường hơn", mn: "Сургуулийн сонголт өргөн", en: "More school options" },
  },
  over18: {
    icon: WalletCards,
    label: { ko: "1,800만원 이상", vi: "Từ 18 triệu KRW", mn: "18 сая KRW-оос дээш", en: "18M+ KRW" },
    description: { ko: "수도권·학위과정도 검토", vi: "Có thể xem xét Seoul/hệ bằng", mn: "Сөүл, зэрэгт хөтөлбөр", en: "Consider Seoul and degrees" },
  },
};

const COPY = {
  step: { ko: "단계", vi: "Bước", mn: "Алхам", en: "Step" },
  back: { ko: "이전 질문", vi: "Câu trước", mn: "Өмнөх асуулт", en: "Previous question" },
  goalQuestion: { ko: "한국에서 가장 하고 싶은 일은 무엇인가요?", vi: "Bạn muốn làm gì nhất tại Hàn Quốc?", mn: "Солонгост хамгийн их юу хийхийг хүсэж байна?", en: "What do you most want to do in Korea?" },
  koreanQuestion: { ko: "지금 한국어는 어느 정도인가요?", vi: "Tiếng Hàn hiện tại của bạn ở mức nào?", mn: "Таны солонгос хэл одоо ямар түвшинд вэ?", en: "What is your Korean level now?" },
  budgetQuestion: { ko: "첫 6개월에 준비 가능한 예산은 얼마인가요?", vi: "Bạn có thể chuẩn bị bao nhiêu cho 6 tháng đầu?", mn: "Эхний 6 сард хэдий хэмжээний төсөв бэлдэх вэ?", en: "What can you budget for the first six months?" },
  why: { ko: "이렇게 추천한 이유", vi: "Vì sao lộ trình này phù hợp", mn: "Яагаад энэ замыг санал болгов", en: "Why this path" },
  costRange: { ko: "6개월 기본 비용 범위", vi: "Khoảng chi phí cơ bản 6 tháng", mn: "6 сарын үндсэн зардлын хүрээ", en: "Estimated six-month range" },
  difficulty: { ko: "현재 준비 난이도", vi: "Độ khó chuẩn bị hiện tại", mn: "Одоогийн бэлтгэлийн түвшин", en: "Current prep difficulty" },
  low: { ko: "차근차근 가능", vi: "Có thể tiến từng bước", mn: "Алхам алхмаар боломжтой", en: "Manageable" },
  medium: { ko: "보완이 필요해요", vi: "Cần bổ sung", mn: "Нэмэлт бэлтгэл хэрэгтэй", en: "Needs preparation" },
  high: { ko: "먼저 조건을 조정해요", vi: "Nên điều chỉnh trước", mn: "Нөхцөлөө эхлээд засна", en: "Adjust conditions first" },
  restart: { ko: "다시 해보기", vi: "Làm lại", mn: "Дахин хийх", en: "Start over" },
  bridgeReason: { ko: "학위가 목표지만 현재 한국어 수준을 고려하면, 어학과정으로 기반을 만든 뒤 D-2를 준비하는 2단계 경로가 더 안전해요.", vi: "Bạn hướng đến bằng cấp, nhưng với trình độ tiếng Hàn hiện tại, học ngôn ngữ trước rồi chuẩn bị D-2 sẽ an toàn hơn.", mn: "Зэрэг авах зорилготой ч одоогийн хэлний түвшнээр эхлээд хэлний курс, дараа нь D-2 бэлтгэх нь найдвартай.", en: "A degree is your goal, but with your current Korean level, building language skills first and then preparing for D-2 is the safer two-step path." },
  languageReason: { ko: "한국어 실력을 먼저 만드는 목표와 어학과정 출발점이 잘 맞아요. 학교별 수업 기간과 기숙사 비용부터 비교해 보세요.", vi: "Mục tiêu học tiếng phù hợp với lộ trình ngôn ngữ. Hãy so sánh thời lượng khóa học và ký túc xá trước.", mn: "Хэлээ эхлээд сайжруулах зорилгод хэлний курс тохирно. Хугацаа, дотуур байрны зардлыг харьцуулна уу.", en: "Your goal fits a language-program starting point. Compare program length and dormitory costs first." },
  degreeReason: { ko: "현재 한국어 수준이면 학위과정을 직접 비교해 볼 수 있어요. 다만 학교별 TOPIK 기준은 반드시 따로 확인해야 해요.", vi: "Trình độ hiện tại cho phép bạn so sánh trực tiếp chương trình bằng cấp, nhưng cần kiểm tra TOPIK của từng trường.", mn: "Одоогийн түвшнээр зэрэгт хөтөлбөрүүдийг шууд харьцуулж болно. Сургууль бүрийн TOPIK шаардлагыг шалгана уу.", en: "Your current Korean level lets you compare degree programs directly, but each school's TOPIK requirement still needs checking." },
  unsureReason: { ko: "목표가 아직 열려 있어 한국어 수준을 기준으로 가장 현실적인 출발점을 골랐어요. 정밀 진단에서 학력과 희망 전공을 더하면 정확해져요.", vi: "Vì mục tiêu còn mở, chúng tôi chọn điểm bắt đầu thực tế theo trình độ tiếng Hàn. Thêm học lực và ngành học ở bước chi tiết để chính xác hơn.", mn: "Зорилго нээлттэй тул хэлний түвшнээр бодит эхлэлийг сонгов. Дэлгэрэнгүй үнэлгээнд боловсрол, мэргэжлээ нэмнэ үү.", en: "Because your goal is still open, this uses your Korean level to choose a practical start. Add education and major in the detailed assessment for better precision." },
  budgetGap: { ko: "선택한 예산은 기본 예상비보다 낮아 지역·기숙사·학비 조건을 함께 조정해야 해요.", vi: "Ngân sách đã chọn thấp hơn mức cơ bản, nên cần điều chỉnh khu vực, ký túc xá hoặc học phí.", mn: "Сонгосон төсөв үндсэн тооцоогоос бага тул бүс, байр, сургалтын төлбөрөө тохируулна уу.", en: "Your selected budget is below the baseline, so region, housing, or tuition choices may need adjustment." },
} satisfies Record<string, LocalizedText>;

function localized(text: LocalizedText, lang: Lang): string {
  return text[lang];
}

function roundedHalfMillion(value: number): number {
  return Math.round(value / 500_000) * 500_000;
}

function costRange(result: PathRecommendation): string {
  const low = roundedHalfMillion(result.estimatedCost * 0.9);
  const high = roundedHalfMillion(result.estimatedCost * 1.15);
  return `${low.toLocaleString()}–${high.toLocaleString()} KRW`;
}

function resultReason(answers: QuickDiagnosisAnswers, result: PathRecommendation, lang: Lang): string {
  const base = quickDiagnosisNeedsLanguageBridge(answers)
    ? COPY.bridgeReason
    : answers.goal === "language"
      ? COPY.languageReason
      : answers.goal === "unsure"
        ? COPY.unsureReason
        : COPY.degreeReason;
  const budgetWarning = result.appliedRules.includes("rule:budget-gap")
    ? ` ${localized(COPY.budgetGap, lang)}`
    : "";
  return `${localized(base, lang)}${budgetWarning}`;
}

export function HomeQuickDiagnosis({ lang, onNavigate }: { lang: Lang; onNavigate: (view: string) => void }) {
  const [goal, setGoal] = useState<QuickDiagnosisId | null>(null);
  const [korean, setKorean] = useState<QuickKoreanId | null>(null);
  const [budget, setBudget] = useState<QuickBudgetId | null>(null);
  const updateCurrentDiagnosisRecommendation = useLeadStore((state) => state.updateCurrentDiagnosisRecommendation);

  useEffect(() => {
    trackProductEvent("diagnosis_viewed", { locale: lang, surface: "home_quick_diagnosis" });
  }, [lang]);

  const selectGoal = (id: QuickDiagnosisId) => {
    trackProductEvent("diagnosis_card_selected", { locale: lang, surface: "home_quick_diagnosis", properties: { step: "goal", optionId: id } });
    setGoal(id);
  };

  const selectKorean = (id: QuickKoreanId) => {
    trackProductEvent("diagnosis_card_selected", { locale: lang, surface: "home_quick_diagnosis", properties: { step: "korean", optionId: id } });
    setKorean(id);
  };

  const selectBudget = (id: QuickBudgetId) => {
    trackProductEvent("diagnosis_card_selected", { locale: lang, surface: "home_quick_diagnosis", properties: { step: "budget", optionId: id } });
    trackProductEvent("diagnosis_completed", { locale: lang, surface: "home_quick_diagnosis", properties: { goal: goal || "unknown", korean: korean || "unknown", budget: id } });
    setBudget(id);
  };

  const answers: QuickDiagnosisAnswers | null = goal && korean && budget ? { goal, korean, budget } : null;
  const input = answers ? quickDiagnosisInput(answers) : null;
  const result = input ? recommendPath(input) : null;
  const step = !goal ? 1 : !korean ? 2 : !budget ? 3 : 3;

  const goBack = () => {
    if (!korean) setGoal(null);
    else if (!budget) setKorean(null);
    else setBudget(null);
  };

  const restart = () => {
    setGoal(null);
    setKorean(null);
    setBudget(null);
  };

  const continueToSchools = () => {
    if (!input || !result) return;
    updateCurrentDiagnosisRecommendation(input, result);
    onNavigate("schools");
  };

  const riskCopy = result ? COPY[result.riskLevel] : COPY.low;

  return (
    <section id="quick-diagnosis" data-testid="home-quick-diagnosis" aria-labelledby="quick-diagnosis-title" className="mx-auto w-full max-w-5xl px-4">
      <div className="mb-5 text-center">
        <div className="mb-2 flex items-center justify-center gap-1.5 text-sm font-semibold text-primary-strong">
          <KaxiPawMark className="h-4 w-4" />
          {tr("quick_diagnosis_eyebrow", lang)}
        </div>
        <h2 id="quick-diagnosis-title" className="font-serif text-2xl font-bold sm:text-3xl">{tr("quick_diagnosis_title", lang)}</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">{tr("quick_diagnosis_subtitle", lang)}</p>
      </div>

      {!result && (
        <div className="mx-auto mb-6 max-w-xl" aria-label={`${localized(COPY.step, lang)} ${step} / 3`}>
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>{localized(COPY.step, lang)} {step} / 3</span>
            {step > 1 && (
              <button type="button" onClick={goBack} className="inline-flex items-center gap-1 text-foreground hover:text-primary-strong">
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                {localized(COPY.back, lang)}
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step}>
            {[1, 2, 3].map((value) => (
              <span key={value} className={`h-1.5 rounded-full ${value <= step ? "bg-icon-accent" : "bg-muted"}`} />
            ))}
          </div>
        </div>
      )}

      {!goal && (
        <div data-testid="quick-diagnosis-step-goal">
          <h3 className="mb-4 text-center text-lg font-bold">{localized(COPY.goalQuestion, lang)}</h3>
          <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
            {QUICK_DIAGNOSIS_IDS.map((id) => {
              const meta = OPTION_META[id];
              const Icon = meta.icon;
              return (
                <li key={id}>
                  <button type="button" data-testid={`quick-diagnosis-option-${id}`} aria-pressed={goal === id} onClick={() => selectGoal(id)} className="h-full min-h-32 w-full rounded-lg border border-icon-accent/45 bg-card p-4 text-left transition hover:-translate-y-0.5 hover:border-icon-accent hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-icon-accent focus-visible:ring-offset-2">
                    <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-icon-accent/15 text-icon-accent"><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></span>
                    <span className="block text-sm font-semibold leading-snug sm:text-base">{tr(meta.title, lang)}</span>
                    <span className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">{tr(meta.description, lang)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {goal && !korean && (
        <div data-testid="quick-diagnosis-step-korean">
          <h3 className="mb-4 text-center text-lg font-bold">{localized(COPY.koreanQuestion, lang)}</h3>
          <ul className="mx-auto grid max-w-3xl grid-cols-2 gap-2.5 md:grid-cols-4">
            {QUICK_KOREAN_IDS.map((id) => {
              const meta = KOREAN_META[id];
              const Icon = meta.icon;
              return (
                <li key={id}>
                  <button type="button" data-testid={`quick-diagnosis-korean-${id}`} aria-pressed={korean === id} onClick={() => selectKorean(id)} className="h-full min-h-28 w-full rounded-lg border border-icon-accent/45 bg-card p-4 text-left transition hover:-translate-y-0.5 hover:border-icon-accent hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-icon-accent focus-visible:ring-offset-2">
                    <Icon className="mb-3 size-5 text-icon-accent" aria-hidden="true" />
                    <span className="block text-sm font-semibold">{localized(meta.label, lang)}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{localized(meta.description, lang)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {goal && korean && !budget && (
        <div data-testid="quick-diagnosis-step-budget">
          <h3 className="mb-4 text-center text-lg font-bold">{localized(COPY.budgetQuestion, lang)}</h3>
          <ul className="mx-auto grid max-w-3xl grid-cols-2 gap-2.5 md:grid-cols-4">
            {QUICK_BUDGET_IDS.map((id) => {
              const meta = BUDGET_META[id];
              const Icon = meta.icon;
              return (
                <li key={id}>
                  <button type="button" data-testid={`quick-diagnosis-budget-${id}`} aria-pressed={budget === id} onClick={() => selectBudget(id)} className="h-full min-h-28 w-full rounded-lg border border-icon-accent/45 bg-card p-4 text-left transition hover:-translate-y-0.5 hover:border-icon-accent hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-icon-accent focus-visible:ring-offset-2">
                    <Icon className="mb-3 size-5 text-icon-accent" aria-hidden="true" />
                    <span className="block text-sm font-semibold">{localized(meta.label, lang)}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{localized(meta.description, lang)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div aria-live="polite" aria-atomic="true">
        {result && answers && (
          <div data-testid="quick-diagnosis-result" className="rounded-lg border border-primary-strong/25 bg-primary-strong/5 p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{tr("quick_result_badge", lang)}</Badge>
              {[tr(OPTION_META[answers.goal].title, lang), localized(KOREAN_META[answers.korean].label, lang), localized(BUDGET_META[answers.budget].label, lang)].map((label) => (
                <span key={label} className="inline-flex items-center gap-1 rounded-full border border-icon-accent/40 bg-background/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  <Check className="size-3 text-icon-accent" aria-hidden="true" />{label}
                </span>
              ))}
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
              <div>
                <h3 className="font-serif text-xl font-bold sm:text-2xl">{tr(translationKey(result.pathKey, "goal_unsure"), lang)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{tr("quick_result_summary", lang).replace("{visa}", result.visaType)}</p>
                <div className="mt-4 rounded-md border border-primary-strong/15 bg-background/65 p-4">
                  <p className="text-xs font-bold text-foreground">{localized(COPY.why, lang)}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{resultReason(answers, result, lang)}</p>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                <div className="rounded-md border border-primary-strong/15 bg-background/65 p-3.5">
                  <dt className="text-xs text-muted-foreground">{localized(COPY.costRange, lang)}</dt>
                  <dd className="mt-1 text-sm font-bold">{costRange(result)}</dd>
                </div>
                <div className="rounded-md border border-primary-strong/15 bg-background/65 p-3.5">
                  <dt className="text-xs text-muted-foreground">{localized(COPY.difficulty, lang)}</dt>
                  <dd className="mt-1 text-sm font-bold">{localized(riskCopy, lang)}</dd>
                  <div className="mt-2 grid grid-cols-3 gap-1" aria-hidden="true">
                    {[0, 1, 2].map((value) => <span key={value} className={`h-1.5 rounded-full ${value <= ["low", "medium", "high"].indexOf(result.riskLevel) ? "bg-primary" : "bg-muted"}`} />)}
                  </div>
                </div>
                <div className="col-span-2 rounded-md border border-primary-strong/15 bg-background/65 p-3.5 lg:col-span-1">
                  <dt className="text-xs text-muted-foreground">{tr("result_prep_time", lang)}</dt>
                  <dd className="mt-1 text-sm font-bold">{pickLang(result.prepTime, lang)}</dd>
                </div>
              </dl>
            </div>

            <div className="mt-5 border-t border-primary-strong/15 pt-4">
              <p className="text-xs font-semibold text-foreground">{tr("quick_result_next", lang)}</p>
              <div className="mt-2 grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
                {result.nextActions.slice(0, 2).map((action) => <p key={action.en}>{pickLang(action, lang)}</p>)}
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 pr-16 sm:flex-row sm:items-center sm:pr-20 xl:pr-0">
              <Button onClick={continueToSchools}>{tr("quick_result_schools", lang)}</Button>
              <Button variant="outline" onClick={() => onNavigate("diagnose")}>{tr("quick_result_refine", lang)}</Button>
              <button type="button" onClick={restart} className="inline-flex h-9 items-center justify-center gap-1.5 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
                <RotateCcw className="size-3.5" aria-hidden="true" />{localized(COPY.restart, lang)}
              </button>
              <p data-testid="quick-diagnosis-note" className="text-xs leading-relaxed text-muted-foreground sm:ml-auto sm:max-w-xs sm:text-right">{tr("quick_result_note", lang)}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
