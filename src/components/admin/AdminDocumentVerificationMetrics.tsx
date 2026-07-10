"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, BarChart3, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { useAdminApi } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type FeedbackLabel = "ACCURATE" | "FALSE_POSITIVE" | "FALSE_NEGATIVE" | "NEEDS_REVIEW";

interface DocumentVerificationMetrics {
  window: {
    since: string;
    until: string;
  };
  totals: {
    verifiedDocuments: number;
    documentsWithFeedback: number;
    feedbackCount: number;
    feedbackCoverage: number;
    needsHumanReviewDocuments: number;
  };
  labels: Record<FeedbackLabel, number>;
  rates: {
    accuracy: number;
    falsePositive: number;
    falseNegative: number;
    needsReview: number;
  };
  issueCodes: Array<{ code: string; count: number }>;
  layerStatuses: Array<{ layer: string; status: string; count: number }>;
  recentFeedback: Array<{
    id: string;
    documentItemId: string;
    documentType: string | null;
    label: string;
    issueCodes: string[];
    reviewerActor: string;
    reviewerRole: string;
    note: string | null;
    createdAt: string;
  }>;
}

function dateInputValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

function defaultSince() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return dateInputValue(date);
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatPercent(value: number) {
  return `${Math.round(value * 1000) / 10}%`;
}

function labelBadge(label: string) {
  if (label === "ACCURATE") return <Badge className="bg-emerald-600">정확</Badge>;
  if (label === "FALSE_POSITIVE") return <Badge className="bg-amber-600">오탐</Badge>;
  if (label === "FALSE_NEGATIVE") return <Badge variant="destructive">과탐</Badge>;
  return <Badge variant="outline">재검토</Badge>;
}

function layerName(layer: string) {
  if (layer === "rule") return "Rule";
  if (layer === "rag") return "RAG";
  if (layer === "cross_document") return "Cross";
  return layer;
}

function MetricTile({
  icon: Icon,
  label,
  value,
  detail,
  tone = "neutral",
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const toneClass = {
    neutral: "text-muted-foreground",
    good: "text-emerald-700",
    warn: "text-amber-700",
    bad: "text-destructive",
  }[tone];
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className={`h-3.5 w-3.5 ${toneClass}`} />
          {label}
        </div>
        <div className="mt-2 text-2xl font-semibold">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
      </CardContent>
    </Card>
  );
}

export function AdminDocumentVerificationMetrics() {
  const { adminFetch } = useAdminApi();
  const [since, setSince] = useState(defaultSince);
  const [until, setUntil] = useState(() => dateInputValue(new Date()));
  const [metrics, setMetrics] = useState<DocumentVerificationMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        since,
        until,
        limit: "20",
      });
      const res = await adminFetch(`/api/admin/documents/verification-metrics?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "서류 검증 메트릭을 불러오지 못했습니다.");
      setMetrics(data.metrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [adminFetch, since, until]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">서류 AI 검증</h1>
          <p className="text-sm text-muted-foreground">Layer 1/2/3 검증 결과와 행정사 피드백 품질 지표를 추적합니다.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadMetrics} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          새로고침
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-3 py-4 sm:grid-cols-[1fr_1fr_auto]">
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            시작일
            <Input type="date" value={since} onChange={(event) => setSince(event.target.value)} />
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            종료일
            <Input type="date" value={until} onChange={(event) => setUntil(event.target.value)} />
          </label>
          <Button className="self-end" onClick={loadMetrics} disabled={loading}>
            조회
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && !metrics ? (
        <div className="py-16 text-center text-sm text-muted-foreground">서류 검증 메트릭을 불러오는 중...</div>
      ) : metrics ? (
        <>
          <div className="grid gap-3 md:grid-cols-5">
            <MetricTile
              icon={BarChart3}
              label="검증 서류"
              value={String(metrics.totals.verifiedDocuments)}
              detail={`${formatDate(metrics.window.since)} - ${formatDate(metrics.window.until)}`}
            />
            <MetricTile
              icon={CheckCircle2}
              label="피드백 커버리지"
              value={formatPercent(metrics.totals.feedbackCoverage)}
              detail={`${metrics.totals.documentsWithFeedback}/${metrics.totals.verifiedDocuments} documents`}
              tone="good"
            />
            <MetricTile
              icon={CheckCircle2}
              label="정확"
              value={formatPercent(metrics.rates.accuracy)}
              detail={`${metrics.labels.ACCURATE}/${metrics.totals.feedbackCount} feedback`}
              tone="good"
            />
            <MetricTile
              icon={AlertTriangle}
              label="오탐"
              value={formatPercent(metrics.rates.falsePositive)}
              detail={`${metrics.labels.FALSE_POSITIVE}/${metrics.totals.feedbackCount} feedback`}
              tone="warn"
            />
            <MetricTile
              icon={XCircle}
              label="과탐"
              value={formatPercent(metrics.rates.falseNegative)}
              detail={`${metrics.labels.FALSE_NEGATIVE}/${metrics.totals.feedbackCount} feedback`}
              tone="bad"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">이슈 코드 순위</CardTitle>
              </CardHeader>
              <CardContent>
                {metrics.issueCodes.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">집계된 이슈 코드가 없습니다.</div>
                ) : (
                  <div className="space-y-2">
                    {metrics.issueCodes.map((item) => (
                      <div key={item.code} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                        <span className="font-mono text-xs">{item.code}</span>
                        <Badge variant="secondary">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Layer 상태</CardTitle>
              </CardHeader>
              <CardContent>
                {metrics.layerStatuses.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">집계된 layer 상태가 없습니다.</div>
                ) : (
                  <div className="space-y-2">
                    {metrics.layerStatuses.map((item) => (
                      <div key={`${item.layer}-${item.status}`} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{layerName(item.layer)}</Badge>
                          <span className="font-mono text-xs">{item.status}</span>
                        </div>
                        <Badge variant="secondary">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">최근 행정사 피드백</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.recentFeedback.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">아직 피드백이 없습니다.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">시간</th>
                        <th className="py-2 pr-3 font-medium">서류</th>
                        <th className="py-2 pr-3 font-medium">판정</th>
                        <th className="py-2 pr-3 font-medium">이슈</th>
                        <th className="py-2 pr-3 font-medium">검수자</th>
                        <th className="py-2 font-medium">메모</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.recentFeedback.map((item) => (
                        <tr key={item.id} className="border-b last:border-0 align-top">
                          <td className="py-3 pr-3 font-mono text-xs">{formatDate(item.createdAt)}</td>
                          <td className="py-3 pr-3">
                            <div className="font-medium">{item.documentType || "-"}</div>
                            <div className="font-mono text-xs text-muted-foreground">{item.documentItemId}</div>
                          </td>
                          <td className="py-3 pr-3">{labelBadge(item.label)}</td>
                          <td className="max-w-[280px] py-3 pr-3">
                            <div className="flex flex-wrap gap-1">
                              {item.issueCodes.length === 0 ? (
                                <span className="text-xs text-muted-foreground">-</span>
                              ) : (
                                item.issueCodes.slice(0, 6).map((code) => (
                                  <Badge key={code} variant="outline" className="font-mono text-[11px]">
                                    {code}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </td>
                          <td className="py-3 pr-3 text-xs">
                            <div>{item.reviewerActor}</div>
                            <Badge variant="outline" className="mt-1">{item.reviewerRole}</Badge>
                          </td>
                          <td className="max-w-sm py-3 text-xs text-muted-foreground">{item.note || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
