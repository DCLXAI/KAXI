"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLangStore } from "@/store/kbridge";
import { tr, type Lang } from "@/lib/i18n/translations";
import type { School } from "@/lib/data/schools";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AgentExperience } from "@/components/agent/AgentExperience";
import { smoothScrollIntoView } from "@/lib/ui/scroll";
import { HomeQuickDiagnosis } from "@/components/diagnosis/HomeQuickDiagnosis";
import { HeroFluidInk } from "@/components/kbridge/HeroFluidInk";
import { ArrowRight, Calculator, FileCheck, School as SchoolIcon, Users, Globe2, AlertTriangle } from "lucide-react";

export function Landing({ onNavigate, locale }: { onNavigate: (v: string) => void; locale?: Lang }) {
  // 라우트의 locale이 먼저다. 스토어만 읽으면 서버 렌더에서 값이 항상 기본값
  // ko라, /vi 와 /mn 의 초기 HTML이 통째로 한국어로 나갔다 — h1까지 포함해서.
  // 하이드레이션 후에야 번역으로 바뀌므로 사람 눈에는 한국어가 한 번 번쩍이고,
  // 크롤러와 폰트 unicode-range에는 그 한국어가 이 페이지의 내용으로 남는다.
  // KaxiPage와 Header는 이미 이 방식이었고 Landing만 빠져 있었다.
  const { lang: storeLang } = useLangStore();
  const lang = locale ?? storeLang;
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
          {/* 물감 번짐: feTurbulence가 블롭 경계를 일그러뜨려 물에 푼 물감의
              가장자리를 만든다. 필터는 SVG 내부 셰이프에만 적용되어 한 번만
              래스터라이즈되고(사파리의 HTML filter:url() 이슈도 회피), 퍼짐
              드리프트는 svg 요소의 transform만 움직여 합성기에서 처리된다. */}
          {/* 필터 영역은 userSpaceOnUse로 명시한다: 퍼센트 영역은 콘텐츠 bbox
              기준이라 변위(±scale/2)+블러(≈3σ)로 밀려난 픽셀이 경계에서 직선으로
              잘린다. 타원 배치도 그 여유(≈82px/53px)가 viewBox 안에 들어오도록
              잡아 뷰포트 클리핑의 직선 모서리를 없앤다. */}
          <div className="absolute left-1/2 top-[-14rem] h-[36rem] w-[52rem] -translate-x-1/2">
            <svg
              className="animate-ink-spread h-full w-full overflow-visible opacity-70 motion-reduce:animate-none dark:opacity-25"
              viewBox="0 0 832 576"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {/* 물감의 농도 감쇠: 플랫 불투명도 도형은 가장자리를 일그러뜨려도
                    "잘린 종이"처럼 읽힌다. 중심이 진하고 밖으로 0까지 빠지는
                    radial gradient가 물에 푼 안료의 층을 만든다. stop-color는
                    presentation attribute라 var()를 못 받으므로 style로 넣는다. */}
                <radialGradient id="karxy-ink-g1">
                  <stop offset="0%" style={{ stopColor: "var(--primary)", stopOpacity: 0.55 }} />
                  <stop offset="55%" style={{ stopColor: "var(--primary)", stopOpacity: 0.32 }} />
                  <stop offset="100%" style={{ stopColor: "var(--primary)", stopOpacity: 0 }} />
                </radialGradient>
                <radialGradient id="karxy-ink-g2">
                  <stop offset="0%" style={{ stopColor: "var(--primary)", stopOpacity: 0.34 }} />
                  <stop offset="100%" style={{ stopColor: "var(--primary)", stopOpacity: 0 }} />
                </radialGradient>
                <radialGradient id="karxy-ink-g3">
                  <stop offset="0%" style={{ stopColor: "var(--primary-strong)", stopOpacity: 0.16 }} />
                  <stop offset="100%" style={{ stopColor: "var(--primary-strong)", stopOpacity: 0 }} />
                </radialGradient>
              </defs>
              <filter id="karxy-ink-primary" filterUnits="userSpaceOnUse" x="-60" y="-60" width="952" height="696">
                <feTurbulence type="fractalNoise" baseFrequency="0.012 0.016" numOctaves="3" seed="7" result="ink" />
                <feDisplacementMap in="SourceGraphic" in2="ink" scale="110" xChannelSelector="R" yChannelSelector="G" />
                <feGaussianBlur stdDeviation="6" />
              </filter>
              <g filter="url(#karxy-ink-primary)">
                <ellipse cx="416" cy="250" rx="250" ry="150" fill="url(#karxy-ink-g1)" />
                <ellipse cx="300" cy="330" rx="160" ry="100" fill="url(#karxy-ink-g2)" />
                <ellipse cx="545" cy="320" rx="130" ry="84" fill="url(#karxy-ink-g3)" />
              </g>
            </svg>
          </div>
          <div className="absolute left-[8%] top-16 h-64 w-64">
            <svg
              className="animate-ink-spread-slow h-full w-full overflow-visible motion-reduce:animate-none dark:opacity-40"
              viewBox="0 0 256 256"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <radialGradient id="karxy-ink-ga1">
                  <stop offset="0%" style={{ stopColor: "var(--icon-accent)", stopOpacity: 0.38 }} />
                  <stop offset="60%" style={{ stopColor: "var(--icon-accent)", stopOpacity: 0.22 }} />
                  <stop offset="100%" style={{ stopColor: "var(--icon-accent)", stopOpacity: 0 }} />
                </radialGradient>
                <radialGradient id="karxy-ink-ga2">
                  <stop offset="0%" style={{ stopColor: "var(--icon-accent)", stopOpacity: 0.2 }} />
                  <stop offset="100%" style={{ stopColor: "var(--icon-accent)", stopOpacity: 0 }} />
                </radialGradient>
              </defs>
              <filter id="karxy-ink-accent" filterUnits="userSpaceOnUse" x="-40" y="-40" width="336" height="336">
                <feTurbulence type="fractalNoise" baseFrequency="0.02 0.024" numOctaves="3" seed="11" result="ink" />
                <feDisplacementMap in="SourceGraphic" in2="ink" scale="64" xChannelSelector="R" yChannelSelector="G" />
                <feGaussianBlur stdDeviation="5" />
              </filter>
              <g filter="url(#karxy-ink-accent)">
                <ellipse cx="124" cy="118" rx="60" ry="48" fill="url(#karxy-ink-ga1)" />
                <ellipse cx="150" cy="150" rx="40" ry="32" fill="url(#karxy-ink-ga2)" />
              </g>
            </svg>
          </div>
          {/* 모션 허용 + WebGL + 충분한 메모리 환경에서 실제 유체역학이 위
              정적 워터컬러 위로 페이드인한다 (모바일은 경량 프로파일). 그 외
              환경은 SVG가 배경. */}
          <HeroFluidInk />
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
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(12px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1], delay: 0.12 }}
            className="relative mx-auto mt-8 w-full max-w-2xl"
          >
            <div aria-hidden className="absolute inset-x-[12%] bottom-[8%] h-10 rounded-[50%] bg-primary/20 blur-2xl" />
            <Image
              src="/mascot/karxy-mascot-trio.png"
              alt="여권 준비, 공식 근거 확인, 다음 행동 안내를 함께하는 KARXY 세 마스코트"
              width={1774}
              height={887}
              sizes="(max-width: 768px) 92vw, 672px"
              className="relative h-auto w-full object-contain"
              priority
            />
          </motion.div>
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
              <Image
                src="/mascot/karxy-mascot-trio.png"
                alt=""
                aria-hidden
                width={1774}
                height={887}
                sizes="13rem"
                className="h-auto w-52 object-contain"
              />
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
