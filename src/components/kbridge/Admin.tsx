"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useLangStore, useLeadStore } from "@/store/kbridge";
import { tr } from "@/lib/i18n/translations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Eye, RefreshCw, Users, AlertTriangle, Clock, TrendingUp } from "lucide-react";
import { AdminSchools } from "./AdminSchools";

interface Stats {
  totalLeads: number;
  totalRequests: number;
  pendingRequests: number;
  brokerUsers: number;
  recentLeads: number;
  byNationality: { nationality: string; _count: number }[];
  byPath: { pathKey: string; _count: number }[];
}

export function Admin() {
  const { lang } = useLangStore();
  const { data: session, status } = useSession();
  const isSessionAdmin = ["owner", "admin", "viewer"].includes(session?.user?.role || "");
  const { leads, fetchLeads, loading } = useLeadStore();
  const [adminKey, setAdminKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const hasAdminAccess = isSessionAdmin || Boolean(adminKey);

  const loadAll = useCallback(async () => {
    if (!hasAdminAccess) return;
    setAuthError(null);
    const headers = adminKey ? { "x-admin-key": adminKey } : undefined;
    await Promise.all([
      fetchLeads(adminKey || undefined),
      (async () => {
        setStatsLoading(true);
        try {
          const res = await fetch("/api/stats", { headers });
          if (res.status === 401 || res.status === 503) {
            setAuthError(lang === "ko" ? "관리자 키를 확인하세요." : "Check the admin key.");
            setStats(null);
            return;
          }
          if (res.ok) {
            const s = await res.json();
            setStats(s);
          }
        } catch (e) {
          console.error("[stats]", e);
        } finally {
          setStatsLoading(false);
        }
      })(),
    ]);
  }, [adminKey, fetchLeads, hasAdminAccess, lang]);

  useEffect(() => {
    if (hasAdminAccess) loadAll();
  }, [loadAll]);

  const unlock = () => {
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    setAdminKey(trimmed);
  };

  if (!hasAdminAccess) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>{lang === "ko" ? "관리자 인증" : "Admin Access"}</CardTitle>
            <CardDescription>
              {status === "loading"
                ? lang === "ko" ? "세션 확인 중..." : "Checking session..."
                : lang === "ko" ? "세션 로그인을 권장합니다. API 키는 현재 화면에서만 임시 사용됩니다." : "Session login is preferred. API key fallback is kept only for this tab."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full" asChild>
              <a href="/login">{lang === "ko" ? "관리자 로그인" : "Admin Login"}</a>
            </Button>
            <Input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && unlock()}
              placeholder={lang === "ko" ? "임시 관리자 API 키" : "Temporary admin API key"}
              autoComplete="off"
            />
            <Button className="w-full" onClick={unlock}>
              {lang === "ko" ? "접속" : "Unlock"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filtered = leads.filter((l) =>
    !q ||
    l.nickname.toLowerCase().includes(q.toLowerCase()) ||
    l.nationality.toLowerCase().includes(q.toLowerCase())
  );

  const sel = leads.find((l) => l.id === selected);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold">{tr("admin_title", lang)}</h1>
          <p className="text-muted-foreground mt-2">{tr("admin_subtitle", lang)}</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          {lang === "ko" ? "새로고침" : lang === "vi" ? "Tải lại" : lang === "mn" ? "Шинэчлэх" : "Refresh"}
        </Button>
      </div>
      {authError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {authError}
        </div>
      )}

      {/* 통계 대시보드 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Users className="h-3.5 w-3.5" />
                {lang === "ko" ? "총 리드" : lang === "vi" ? "Tổng lead" : lang === "mn" ? "Нийт лид" : "Total leads"}
              </div>
              <div className="text-2xl font-bold mt-1">{stats.totalLeads}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {lang === "ko" ? `최근 7일 ${stats.recentLeads}건` : `Last 7d: ${stats.recentLeads}`}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Clock className="h-3.5 w-3.5" />
                {lang === "ko" ? "상담 대기" : lang === "vi" ? "Chờ tư vấn" : lang === "mn" ? "Хүлээж буй" : "Pending"}
              </div>
              <div className="text-2xl font-bold mt-1">{stats.pendingRequests}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {lang === "ko" ? `총 요청 ${stats.totalRequests}건` : `Total: ${stats.totalRequests}`}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <AlertTriangle className="h-3.5 w-3.5" />
                {lang === "ko" ? "브로커 이용자" : lang === "vi" ? "Dùng môi giới" : lang === "mn" ? "Зуучлагчтай" : "Broker users"}
              </div>
              <div className="text-2xl font-bold mt-1">{stats.brokerUsers}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {stats.totalLeads > 0 ? `${Math.round((stats.brokerUsers / stats.totalLeads) * 100)}%` : "—"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <TrendingUp className="h-3.5 w-3.5" />
                {lang === "ko" ? "주요 경로" : lang === "vi" ? "Lộ trình chính" : lang === "mn" ? "Гол маршрут" : "Top path"}
              </div>
              <div className="text-base font-bold mt-1 truncate">
                {stats.byPath.length > 0 ? tr(stats.byPath[0].pathKey as any, lang) : "—"}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {stats.byPath.length > 0 ? `${stats.byPath[0]._count} ${lang === "ko" ? "건" : "leads"}` : ""}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 국적별 분포 */}
      {stats && stats.byNationality.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {lang === "ko" ? "국적별 분포" : lang === "vi" ? "Theo quốc tịch" : lang === "mn" ? "Үндэслэлээр" : "By nationality"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.byNationality.map((n) => (
                <Badge key={n.nationality} variant="outline" className="gap-1">
                  {n.nationality.toUpperCase()}: {n._count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <AdminSchools adminKey={adminKey} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg">
              Leads ({leads.length})
            </CardTitle>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && leads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {lang === "ko" ? "로딩 중..." : "Loading..."}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {tr("admin_empty", lang)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-2 font-medium">{tr("admin_col_name", lang)}</th>
                    <th className="py-2 pr-2 font-medium">{tr("admin_col_nationality", lang)}</th>
                    <th className="py-2 pr-2 font-medium">{tr("admin_col_goal", lang)}</th>
                    <th className="py-2 pr-2 font-medium">{tr("admin_col_path", lang)}</th>
                    <th className="py-2 pr-2 font-medium">{tr("admin_col_budget", lang)}</th>
                    <th className="py-2 pr-2 font-medium">{tr("admin_col_broker", lang)}</th>
                    <th className="py-2 pr-2 font-medium">{tr("admin_col_created", lang)}</th>
                    <th className="py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => (
                    <tr key={l.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 pr-2 font-medium">{l.nickname}</td>
                      <td className="py-2 pr-2">
                        <Badge variant="outline">{l.nationality.toUpperCase()}</Badge>
                      </td>
                      <td className="py-2 pr-2 text-xs">{tr(`goal_${l.goal}` as any, lang)}</td>
                      <td className="py-2 pr-2 text-xs">{tr(l.pathKey as any, lang)}</td>
                      <td className="py-2 pr-2 font-mono text-xs">{l.budget.toLocaleString()}₩</td>
                      <td className="py-2 pr-2">
                        {l.usingBroker ? (
                          <Badge variant="destructive" className="text-xs">
                            {l.brokerCost > 0 ? `${l.brokerCost.toLocaleString()}₩` : tr("yes", lang)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-2 text-xs text-muted-foreground">
                        {new Date(l.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2 text-right">
                        <Button size="sm" variant="ghost" onClick={() => setSelected(l.id)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 상세 모달 */}
      {sel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelected(null)}>
          <Card className="w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{sel.nickname}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>×</Button>
              </div>
              <CardDescription>
                {new Date(sel.createdAt).toLocaleString()} · {sel.nationality.toUpperCase()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">{tr("diagnose_q_goal", lang)}</div>
                  <div className="font-medium">{tr(`goal_${sel.goal}` as any, lang)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{tr("result_recommended", lang)}</div>
                  <div className="font-medium">{tr(sel.pathKey as any, lang)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{tr("diagnose_q_budget", lang)}</div>
                  <div className="font-medium font-mono">{sel.budget.toLocaleString()}₩</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{tr("diagnose_q_broker", lang)}</div>
                  <div className="font-medium">
                    {sel.usingBroker ? `${tr("yes", lang)} (${sel.brokerCost.toLocaleString()}₩)` : tr("no", lang)}
                  </div>
                </div>
              </div>

              {sel.requiredDocs && sel.requiredDocs.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">{tr("result_required_docs", lang)}</div>
                  <div className="flex flex-wrap gap-1">
                    {sel.requiredDocs.map((k) => (
                      <Badge key={k} variant="outline" className="text-xs">{tr(k as any, lang)}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {sel.warnings && sel.warnings.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">{tr("result_warnings", lang)}</div>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    {sel.warnings.map((w, i) => (
                      <li key={i}>{w[lang]}</li>
                    ))}
                  </ul>
                </div>
              )}

              {sel.partnerRequests && sel.partnerRequests.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">{tr("partners_title", lang)}</div>
                  <div className="flex flex-wrap gap-1">
                    {sel.partnerRequests.map((p) => (
                      <Badge key={p.id} variant="outline" className="text-xs">
                        {tr(`partner_${p.partnerType}` as any, lang)} · {p.status}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
