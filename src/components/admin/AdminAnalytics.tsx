"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, MessageCircle, MousePointerClick, RefreshCw, UserRoundCheck } from "lucide-react";
import { useAdminApi } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Funnel = {
  pageVisitors: number;
  diagnosisViews: number;
  diagnosisSelections: number;
  diagnosisSelectionRate: number;
  chatbotOpens: number;
  chatbotOpenRate: number;
  firstQuestions: number;
  firstQuestionRate: number;
  questionAttempts: number;
  answers: number;
  answerSuccessRate: number;
  noContext: number;
  noContextRate: number;
  retries: number;
  retryRate: number;
  citationSessions: number;
  answersWithSources: number;
  citationClickRate: number;
  handoffs: number;
  handoffConversionRate: number;
  completedHandoffs: number;
  handoffCompletionRate: number;
};

type AnalyticsResponse = {
  range: { days: number; since: string; until: string };
  funnel: Funnel;
  locales: Array<{
    locale: string;
    visitors: number;
    engaged: number;
    dropoffRate: number;
    diagnosisSelectionRate: number;
    firstQuestionRate: number;
    handoffUsers: number;
  }>;
  error?: string;
};

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function Metric({ label, value, rate, detail, icon: Icon }: { label: string; value: number; rate: number; detail: string; icon: typeof BarChart3 }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="flex items-center justify-between text-sm"><span>{label}</span><Icon className="size-4 text-muted-foreground" /></CardTitle></CardHeader>
      <CardContent><div className="flex items-end gap-2"><span className="text-2xl font-semibold">{percent(rate)}</span><span className="pb-1 text-xs text-muted-foreground">{value.toLocaleString()}건</span></div><p className="mt-1 text-xs text-muted-foreground">{detail}</p></CardContent>
    </Card>
  );
}

export function AdminAnalytics() {
  const { adminFetch } = useAdminApi();
  const [days, setDays] = useState("30");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminFetch(`/api/admin/analytics?days=${days}`, { cache: "no-store" });
      const payload = await response.json() as AnalyticsResponse;
      if (!response.ok) throw new Error(payload.error || "제품 분석을 불러오지 못했습니다.");
      setData(payload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [adminFetch, days]);

  useEffect(() => { void load(); }, [load]);
  const funnel = data?.funnel;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight">제품 분석</h1><p className="text-sm text-muted-foreground">진단, 챗봇, 출처 확인, 상담 응답까지 실제 참여 퍼널을 봅니다.</p></div>
        <div className="flex items-center gap-2"><Tabs value={days} onValueChange={setDays}><TabsList><TabsTrigger value="7">7일</TabsTrigger><TabsTrigger value="30">30일</TabsTrigger><TabsTrigger value="90">90일</TabsTrigger></TabsList></Tabs><Button variant="outline" size="icon" onClick={() => void load()} disabled={loading} aria-label="새로고침"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /></Button></div>
      </div>
      {error && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

      <section aria-labelledby="participation-title" className="space-y-3">
        <div className="flex items-center gap-2"><h2 id="participation-title" className="font-semibold">참여 퍼널</h2><Badge variant="outline">세션 기준</Badge></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="진단 카드 선택률" value={funnel?.diagnosisSelections || 0} rate={funnel?.diagnosisSelectionRate || 0} detail={`${funnel?.diagnosisViews || 0}회 진단 노출 기준`} icon={MousePointerClick} />
          <Metric label="챗봇 열기율" value={funnel?.chatbotOpens || 0} rate={funnel?.chatbotOpenRate || 0} detail={`${funnel?.pageVisitors || 0}명 방문 기준`} icon={MessageCircle} />
          <Metric label="첫 질문 전송률" value={funnel?.firstQuestions || 0} rate={funnel?.firstQuestionRate || 0} detail={`${funnel?.chatbotOpens || 0}명 챗봇 오픈 기준`} icon={MessageCircle} />
          <Metric label="상담 응답 완료율" value={funnel?.completedHandoffs || 0} rate={funnel?.handoffCompletionRate || 0} detail={`${funnel?.handoffs || 0}건 상담 전환 기준`} icon={UserRoundCheck} />
        </div>
      </section>

      <section aria-labelledby="quality-title" className="space-y-3">
        <h2 id="quality-title" className="font-semibold">답변 품질과 행동</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="답변 성공률" value={funnel?.answers || 0} rate={funnel?.answerSuccessRate || 0} detail={`${funnel?.questionAttempts || 0}회 질문 시도 기준`} icon={BarChart3} />
          <Metric label="No-context율" value={funnel?.noContext || 0} rate={funnel?.noContextRate || 0} detail="성공 응답 중 근거 부족" icon={BarChart3} />
          <Metric label="재시도율" value={funnel?.retries || 0} rate={funnel?.retryRate || 0} detail="실패 응답 기준" icon={RefreshCw} />
          <Metric label="출처 클릭률" value={funnel?.citationSessions || 0} rate={funnel?.citationClickRate || 0} detail={`${funnel?.answersWithSources || 0}건 출처 포함 답변 기준`} icon={MousePointerClick} />
          <Metric label="상담 전환율" value={funnel?.handoffs || 0} rate={funnel?.handoffConversionRate || 0} detail="첫 질문 사용자 기준" icon={UserRoundCheck} />
        </div>
      </section>

      <section aria-labelledby="locale-title" className="space-y-3">
        <h2 id="locale-title" className="font-semibold">Locale별 이탈</h2>
        <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground"><th className="px-4 py-3">Locale</th><th className="px-3 py-3">방문</th><th className="px-3 py-3">참여</th><th className="px-3 py-3">이탈률</th><th className="px-3 py-3">진단 선택률</th><th className="px-3 py-3">첫 질문률</th><th className="px-4 py-3">상담 전환</th></tr></thead><tbody>{(data?.locales || []).map((row) => <tr key={row.locale} className="border-b last:border-0"><td className="px-4 py-3 font-semibold uppercase">{row.locale}</td><td className="px-3 py-3">{row.visitors}</td><td className="px-3 py-3">{row.engaged}</td><td className="px-3 py-3"><Badge variant={row.dropoffRate >= 0.7 ? "destructive" : "outline"}>{percent(row.dropoffRate)}</Badge></td><td className="px-3 py-3">{percent(row.diagnosisSelectionRate)}</td><td className="px-3 py-3">{percent(row.firstQuestionRate)}</td><td className="px-4 py-3">{row.handoffUsers}</td></tr>)}</tbody></table>{!loading && (data?.locales.length || 0) === 0 && <p className="py-12 text-center text-sm text-muted-foreground">선택한 기간의 이벤트가 없습니다.</p>}</div></CardContent></Card>
        <p className="text-xs text-muted-foreground">이탈은 페이지 방문 후 진단 카드 선택, 챗봇 열기 또는 첫 질문 중 어떤 행동도 하지 않은 세션입니다.</p>
      </section>
    </div>
  );
}
