"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { useAdminApi } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AdminAuditItem } from "@/lib/admin/types";

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

export function AdminAudit() {
  const { adminFetch } = useAdminApi();
  const [caseId, setCaseId] = useState("");
  const [activeCaseId, setActiveCaseId] = useState("");
  const [events, setEvents] = useState<AdminAuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = activeCaseId.trim() ? `?caseId=${encodeURIComponent(activeCaseId.trim())}` : "";
      const res = await adminFetch(`/api/admin/audit${query}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "감사 로그를 불러오지 못했습니다.");
      setEvents(data.events || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [adminFetch, activeCaseId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">감사 로그</h1>
          <p className="text-sm text-muted-foreground">케이스별 이벤트 로그와 관리자 액션 로그를 확인합니다.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadEvents} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          새로고침
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-2 py-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={caseId}
              onChange={(event) => setCaseId(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") setActiveCaseId(caseId.trim());
              }}
              placeholder="caseId로 필터"
              className="pl-8"
            />
          </div>
          <Button onClick={() => setActiveCaseId(caseId.trim())}>조회</Button>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">이벤트 {events.length}개</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">감사 로그를 불러오는 중...</div>
          ) : events.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">표시할 이벤트가 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">시간</th>
                    <th className="py-2 pr-3 font-medium">액션</th>
                    <th className="py-2 pr-3 font-medium">대상</th>
                    <th className="py-2 pr-3 font-medium">행위자</th>
                    <th className="py-2 pr-3 font-medium">결과</th>
                    <th className="py-2 font-medium">메타데이터</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={`${event.source}-${event.id}`} className="border-b last:border-0 align-top hover:bg-muted/40">
                      <td className="py-3 pr-3 font-mono text-xs">{formatDate(event.createdAt)}</td>
                      <td className="py-3 pr-3">
                        <div className="font-medium">{event.action}</div>
                        <div className="text-xs text-muted-foreground">{event.source}</div>
                      </td>
                      <td className="py-3 pr-3 text-xs">
                        <div>{event.targetType}</div>
                        <div className="font-mono text-muted-foreground">{event.targetId || event.caseId || "-"}</div>
                      </td>
                      <td className="py-3 pr-3 text-xs">
                        <div>{event.actor || "-"}</div>
                        <Badge variant="outline" className="mt-1">{event.actorRole || "-"}</Badge>
                      </td>
                      <td className="py-3 pr-3">
                        <Badge variant={event.success ? "secondary" : "destructive"}>{event.success ? "success" : "failed"}</Badge>
                      </td>
                      <td className="max-w-sm py-3">
                        <pre className="max-h-24 overflow-auto rounded bg-muted p-2 text-[11px]">
                          {JSON.stringify(event.metadata, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
