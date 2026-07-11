"use client";

import { useEffect, useState } from "react";
import { useLangStore } from "@/store/kbridge";
import { tr } from "@/lib/i18n/translations";
import type { School } from "@/lib/data/schools";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Calculator, FileCheck, School as SchoolIcon, ShieldCheck, Users, Globe2, AlertTriangle, Scale, Sparkles } from "lucide-react";

export function Landing({ onNavigate }: { onNavigate: (v: string) => void }) {
  const { lang } = useLangStore();
  const [schoolStats, setSchoolStats] = useState<{ total: number | null; accredited: number | null }>({
    total: null,
    accredited: null,
  });

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

  return (
    <div className="space-y-20">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-5xl px-4 pt-12 pb-16 text-center">
          <Badge variant="secondary" className="mb-4 gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            {tr("hero_badge", lang)}
          </Badge>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
            {tr("hero_title", lang)}
          </h1>
          <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            {tr("hero_subtitle", lang)}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="gap-2" onClick={() => onNavigate("agent")}>
              <Sparkles className="h-4 w-4" />
              {lang === "ko" ? "AI 에이전트 시작" : lang === "vi" ? "Bắt đầu Agent" : lang === "mn" ? "Агент эхлэх" : "Start AI Agent"}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => onNavigate("diagnose")}>
              {tr("cta_start", lang)}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="rounded-lg border bg-card p-4">
              <div className="text-2xl md:text-3xl font-bold">25.3만</div>
              <div className="text-xs text-muted-foreground mt-1">{tr("hero_stat_students", lang)}</div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-2xl md:text-3xl font-bold">{schoolStats.total ?? "—"}</div>
              <div className="text-xs text-muted-foreground mt-1">{tr("hero_stat_schools", lang)}</div>
              {schoolStats.accredited !== null && (
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {lang === "ko" ? `인증 ${schoolStats.accredited}` : `${schoolStats.accredited} accredited`}
                </div>
              )}
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-2xl md:text-3xl font-bold">4</div>
              <div className="text-xs text-muted-foreground mt-1">{tr("hero_stat_langs", lang)}</div>
            </div>
          </div>
        </div>
      </section>

      {/* AI 에이전트 배너 (메인 CTA) */}
      <section className="mx-auto max-w-5xl px-4">
        <Card
          className="cursor-pointer overflow-hidden border-2 border-primary/30 hover:border-primary/60 transition-all bg-gradient-to-br from-primary/5 to-transparent"
          onClick={() => onNavigate("agent")}
        >
          <CardContent className="p-0">
            <div className="grid md:grid-cols-[auto_1fr_auto] gap-6 p-6 md:p-8 items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shrink-0">
                <Sparkles className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="gap-1.5">
                    <Sparkles className="h-3 w-3" />
                    {lang === "ko" ? "네이티브 AI 에이전트" : "Native AI Agent"}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Scale className="h-3 w-3" />
                    ReAct · 6 Tools
                  </Badge>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold tracking-tight">
                  {lang === "ko"
                    ? "한 번에 끝내는 유학 준비"
                    : lang === "vi"
                    ? "Hoàn tất trong một bước"
                    : lang === "mn"
                    ? "Нэг удаад дуусгах"
                    : "Everything in one go"}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {lang === "ko"
                    ? "학교 검색 → 비용 계산 → 서류 생성 → 비자 정보 → 전문가 연결. 자연어로 요청하면 에이전트가 도구를 호출해 직접 실행합니다."
                    : lang === "vi"
                    ? "Tìm trường → Chi phí → Hồ sơ → Visa → Chuyên gia. Nói tự nhiên, agent tự gọi công cụ."
                    : lang === "mn"
                    ? "Сургууль → Зардал → Баримт → Виз → Мэргэжилтэн. Хэлж байгаа л агент гүйцэтгэнэ."
                    : "Search → Cost → Documents → Visa → Experts. Just ask, agent calls tools for you."}
                </p>
              </div>
              <Button size="lg" className="gap-2 shrink-0">
                {lang === "ko" ? "에이전트 실행" : "Launch"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 전문 상담 배너 */}
      <section className="mx-auto max-w-5xl px-4">
        <Card
          className="cursor-pointer overflow-hidden border-2 hover:border-primary/50 transition-all"
          onClick={() => onNavigate("consult")}
        >
          <CardContent className="p-0">
            <div className="grid md:grid-cols-[1fr_auto] gap-6 p-6 md:p-8 items-center">
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="gap-1.5">
                    <Scale className="h-3 w-3" />
                    {lang === "ko" ? "행정사 AI 에이전트" : lang === "vi" ? "AI luật sư" : lang === "mn" ? "Зөвлөгөөний AI" : "Admin Lawyer AI"}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    RAG · Deep Think
                  </Badge>
                </div>
                <h3 className="text-xl md:text-2xl font-bold tracking-tight">
                  {lang === "ko"
                    ? "유학 비자·체류, 전문가에게 직접 물어보세요"
                    : lang === "vi"
                    ? "Hỏi trực tiếp chuyên gia về visa du học"
                    : lang === "mn"
                    ? "Мэргэжилтнээс шууд асуугаарай"
                    : "Ask an expert about study visa & stay"}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {lang === "ko"
                    ? "공식 문서 기반 RAG · 5가지 전문 모드 (종합/비자/서류/거절대응/유학원운영) · 위험 신호 자동 감지 · 법적 경계 명확화"
                    : lang === "vi"
                    ? "RAG chính thức · 5 chế độ chuyên gia · phát hiện rủi ro · ranh giới pháp lý rõ ràng"
                    : lang === "mn"
                    ? "Албан баримт RAG · 5 төрөл · эрсдэл илрүүлэлт · хуулийн хязгаар"
                    : "Official RAG · 5 expert modes · risk detection · clear legal boundaries"}
                </p>
              </div>
              <Button size="lg" className="gap-2 shrink-0">
                {lang === "ko" ? "상담 시작" : lang === "vi" ? "Bắt đầu" : lang === "mn" ? "Эхлэх" : "Start"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight">{tr("features_title", lang)}</h2>
          <p className="mt-3 text-muted-foreground">{tr("features_subtitle", lang)}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <Card
                key={f.action}
                className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-1"
                onClick={() => onNavigate(f.action)}
              >
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="mt-2 text-lg">{f.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">{f.desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    {tr("cta_start", lang)}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Broker comparison */}
      <section className="mx-auto max-w-5xl px-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {tr("broker_compare_title", lang)}
            </CardTitle>
            <CardDescription>{tr("broker_compare_subtitle", lang)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="font-medium text-muted-foreground"></div>
              <div className="font-medium text-destructive">Broker</div>
              <div className="font-medium text-primary">KAXI</div>
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
                  <div className="py-2 border-t text-primary font-medium">{row.us[lang]}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 pb-16">
        <div className="rounded-2xl bg-primary p-8 md:p-12 text-primary-foreground text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">{tr("hero_title", lang)}</h2>
          <p className="text-primary-foreground/80 mb-6 max-w-2xl mx-auto">{tr("hero_subtitle", lang)}</p>
          <Button size="lg" variant="secondary" className="gap-2" onClick={() => onNavigate("diagnose")}>
            {tr("cta_start", lang)}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}
