"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLangStore } from "@/store/kbridge";
import { tr } from "@/lib/i18n/translations";
import type { School } from "@/lib/data/schools";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KaxiCat } from "@/components/brand/KaxiCat";
import { AgentExperience } from "@/components/agent/AgentExperience";
import { smoothScrollIntoView } from "@/lib/ui/scroll";
import { HomeQuickDiagnosis } from "@/components/diagnosis/HomeQuickDiagnosis";
import { ArrowRight, Calculator, FileCheck, School as SchoolIcon, Users, Globe2, AlertTriangle } from "lucide-react";

export function Landing({ onNavigate }: { onNavigate: (v: string) => void }) {
  const { lang } = useLangStore();
  const shouldReduceMotion = useReducedMotion();
  const [schoolStats, setSchoolStats] = useState<{ total: number | null; accredited: number | null }>({
    total: null,
    accredited: null,
  });

  const sectionReveal = {
    initial: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(8px)" },
    whileInView: shouldReduceMotion ? { opacity: 1 } : { opacity: 1, transform: "translateY(0px)" },
    viewport: { once: true, margin: "-60px" } as const,
    transition: { duration: 0.25, ease: [0.23, 1, 0.32, 1] as const },
  };

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/schools", { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load school stats");
        return res.json();
      })
      .then((data) => {
        const schools = Array.isArray(data.schools) ? data.schools as School[] : [];
        setSchoolStats({
          total: Number(data.total || schools.length),
          accredited: schools.filter((school) => school.accreditation === "accredited").length,
        });
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("[landing-school-stats]", err);
        setSchoolStats({ total: null, accredited: null });
      });

    return () => controller.abort();
  }, []);

  const features = [
    {
      icon: SchoolIcon,
      title: tr("nav_schools", lang),
      desc: {
        ko: "공식 정보 기반 학교·어학당 비교. 인증대학, 비자심사 강화대학 표시.",
        vi: "So sánh trường dựa trên thông tin chính thức.",
        mn: "Албан ёсны мэдээлэлд үндэслэсэн харьцуулалт.",
        en: "Compare schools based on official info. Accreditation & visa flags shown.",
      }[lang],
      action: "schools",
    },
    {
      icon: Calculator,
      title: tr("nav_cost", lang),
      desc: {
        ko: "등록금·기숙사·서류·번역공증·비자·항공·정착비 분해 계산. 브로커 견적과 비교.",
        vi: "Phân tích chi phí từng mục. So sánh môi giới.",
        mn: "Зардлыг задалж тооцоолох.",
        en: "Itemized cost breakdown. Compare with broker quote.",
      }[lang],
      action: "cost",
    },
    {
      icon: FileCheck,
      title: tr("nav_docs", lang),
      desc: {
        ko: "개인별 필요 서류 자동 생성. 상태 관리·업로드·진행률 추적.",
        vi: "Tự tạo checklist hồ sơ cá nhân.",
        mn: "Хувийн баримтын жагсаалт үүсгэх.",
        en: "Auto-generate personal document checklist.",
      }[lang],
      action: "docs",
    },
    {
      icon: Users,
      title: tr("nav_partners", lang),
      desc: {
        ko: "행정사·번역공증·어학당·정착 파트너 연결. 취업 매칭은 제외.",
        vi: "Kết nối đối tác đã xác minh.",
        mn: "Шалгагдсан түнш холбох.",
        en: "Connect with verified partners. No job matching.",
      }[lang],
      action: "partners",
    },
  ];

  const brokerComparison = [
    { broker: { ko: "비용 불투명", vi: "Không rõ ràng", mn: "Тодорхойгүй", en: "Opaque" }, us: { ko: "항목별 분해", vi: "Minh bạch", mn: "Ил тод", en: "Itemized" } },
    { broker: { ko: "허위서류 위험", vi: "Nguy hiểm", mn: "Аюултай", en: "Risky" }, us: { ko: "전면 거부", vi: "Từ chối", mn: "Татгалзах", en: "Refused" } },
    { broker: { ko: "비자 보장 거짓", vi: "Xạo", mn: "Хуурамч", en: "Fake" }, us: { ko: "보장 안 함 (솔직)", vi: "Thành thật", mn: "Шударга", en: "Honest" } },
    { broker: { ko: "불법취업 연결", vi: "Bất hợp pháp", mn: "Хууль бус", en: "Illegal" }, us: { ko: "제공 안 함", vi: "Không", mn: "Үгүй", en: "None" } },
  ];

  const scrollToQuickDiagnosis = () => {
    smoothScrollIntoView(document.getElementById("quick-diagnosis"), { block: "center" });
  };

  return (
    <div className="space-y-12 md:space-y-16">
      {/* Hero */}
      <section className="relative overflow-hidden animate-in fade-in duration-300 ease-snappy motion-reduce:animate-none">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[-16rem] h-[28rem] w-[44rem] -translate-x-1/2 rounded-full bg-primary/40 blur-3xl opacity-70 dark:opacity-25" />
          <div className="absolute left-[10%] top-24 h-40 w-40 rounded-full bg-icon-accent/25 blur-3xl dark:bg-icon-accent/10" />
        </div>
        <div className="relative mx-auto max-w-5xl px-4 pt-12 pb-0 text-center md:pt-16 md:pb-2">
          <h1 className="font-serif text-4xl md:text-6xl font-extrabold tracking-tight leading-tight text-balance">
            {tr("hero_title", lang)}
          </h1>
          <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed text-pretty">
            {tr("hero_subtitle", lang)}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="gap-2 shadow-md shadow-primary/50 hover:shadow-lg hover:shadow-primary/40" onClick={scrollToQuickDiagnosis}>
              {tr("quick_diagnosis_eyebrow", lang)}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 bg-card/70"
              onClick={() => smoothScrollIntoView(document.getElementById("kaxi-ai"), { block: "start" })}
            >
              {tr("hero_cta_agent", lang)}
            </Button>
          </div>
          <div className="mx-auto mt-10 h-px max-w-3xl bg-gradient-to-r from-transparent via-border to-transparent md:mt-12" aria-hidden="true" />
        </div>
      </section>

      <HomeQuickDiagnosis lang={lang} onNavigate={onNavigate} />

      <section id="kaxi-ai" aria-label="KARXY AI" className="mx-auto w-full max-w-3xl px-4">
        <div className="rounded-2xl border border-primary/50 bg-gradient-to-b from-primary/20 via-primary/10 to-transparent p-3 shadow-[0_16px_40px_-24px_rgba(79,93,179,0.45)] sm:p-5 dark:border-primary/25 dark:from-primary/15 dark:via-primary/5 dark:shadow-[0_16px_40px_-24px_rgba(0,0,0,0.5)]">
          <AgentExperience embedded />
        </div>
      </section>

      <section aria-label={tr("hero_stat_schools", lang)} className="mx-auto w-full max-w-2xl px-4">
        <div className="grid grid-cols-3 divide-x divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(31,30,29,0.05),0_12px_32px_-20px_rgba(79,93,179,0.35)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_12px_32px_-20px_rgba(0,0,0,0.5)]">
          <div className="p-4 text-center md:p-5">
            <div className="font-serif text-2xl md:text-3xl font-semibold text-primary-strong">{tr("hero_stat_students_value", lang)}</div>
            <div className="text-xs text-muted-foreground mt-1">{tr("hero_stat_students", lang)}</div>
          </div>
          <div className="p-4 text-center md:p-5">
            <div className="font-serif text-2xl md:text-3xl font-semibold text-primary-strong">
              <span
                key={String(schoolStats.total)}
                className="inline-block animate-in fade-in duration-200 ease-snappy motion-reduce:animate-none"
              >
                {schoolStats.total ?? "—"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">{tr("hero_stat_schools", lang)}</div>
            {schoolStats.accredited !== null && (
              <div className="mt-1 text-[10px] text-muted-foreground">
                {tr("hero_stat_accredited", lang).replace("{n}", String(schoolStats.accredited))}
              </div>
            )}
          </div>
          <div className="p-4 text-center md:p-5">
            <div className="font-serif text-2xl md:text-3xl font-semibold text-primary-strong">4</div>
            <div className="text-xs text-muted-foreground mt-1">{tr("hero_stat_langs", lang)}</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-border/60 bg-card/70 py-12 md:py-16 dark:bg-card/40">
        <div className="mx-auto max-w-7xl px-4">
        <div className="text-center mb-10">
          <h2 className="font-serif text-3xl font-bold tracking-tight">{tr("features_title", lang)}</h2>
          <p className="mt-3 text-muted-foreground">{tr("features_subtitle", lang)}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.action}
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(12px)" }}
                whileInView={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, transform: "translateY(0px)" }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1], delay: i * 0.05 }}
              >
                <Card
                  className="group cursor-pointer border-border/70 bg-card shadow-[0_1px_2px_rgba(31,30,29,0.04)] transition-[border-color,box-shadow,transform] duration-200 ease-snappy hover:border-primary-strong/40 hover:shadow-[0_12px_28px_-16px_rgba(79,93,179,0.45)] hover:-translate-y-0.5 dark:shadow-[0_1px_2px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_12px_28px_-16px_rgba(0,0,0,0.6)]"
                  onClick={() => onNavigate(f.action)}
                >
                  <CardHeader>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-icon-accent/25 to-icon-accent/10 ring-1 ring-inset ring-icon-accent/30">
                      <Icon className="h-5 w-5 text-icon-accent" />
                    </div>
                    <CardTitle className="font-serif mt-2 text-lg">{f.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">{f.desc}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" size="sm" className="w-full justify-between group-hover:text-primary-strong">
                      {tr("feature_open", lang)}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 ease-snappy group-hover:translate-x-0.5" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
        </div>
      </section>

      {/* Broker comparison */}
      <motion.section className="mx-auto max-w-5xl px-4" {...sectionReveal}>
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="font-serif flex items-center gap-2 text-xl">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {tr("broker_compare_title", lang)}
            </CardTitle>
            <CardDescription>{tr("broker_compare_subtitle", lang)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="font-medium text-muted-foreground"></div>
              <div className="font-medium text-destructive">Broker</div>
              <div className="font-medium text-primary-strong">KARXY</div>
              {brokerComparison.map((row, i) => (
                <div key={i} className="contents">
                  <div className="py-2 border-t text-muted-foreground">
                    {
                      [
                        { ko: "비용 투명성", vi: "Minh bạch", mn: "Ил тод", en: "Cost transparency" },
                        { ko: "허위서류", vi: "Hồ sơ giả", mn: "Хуурамч баримт", en: "Fake docs" },
                        { ko: "비자 보장", vi: "Bảo đảm visa", mn: "Виз баталгаа", en: "Visa guarantee" },
                        { ko: "불법취업 연결", vi: "Việc bất hợp pháp", mn: "Хууль бус ажил", en: "Illegal job" },
                      ][i][lang]
                    }
                  </div>
                  <div className="py-2 border-t text-destructive">{row.broker[lang]}</div>
                  <div className="py-2 border-t text-primary-strong font-medium">{row.us[lang]}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.section>

      {/* CTA */}
      <motion.section className="mx-auto max-w-4xl px-4 pb-16" {...sectionReveal}>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-[#b7c4fd] p-8 md:p-12 text-primary-foreground text-center shadow-[0_24px_48px_-24px_rgba(79,93,179,0.55)] ring-1 ring-inset ring-primary-foreground/10">
          <div className="relative">
            <div className="mb-4 flex justify-center">
              <KaxiCat state="happy" size={44} />
            </div>
            <h2 className="font-serif text-2xl md:text-3xl font-bold mb-3">{tr("hero_title", lang)}</h2>
            <p className="text-primary-foreground/80 mb-6 max-w-2xl mx-auto">{tr("hero_subtitle", lang)}</p>
            <Button size="lg" className="gap-2 bg-primary-foreground text-[#eef2ff] hover:bg-[#3b4690] shadow-md" onClick={scrollToQuickDiagnosis}>
              {tr("quick_diagnosis_return", lang)}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
