"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Check, RefreshCw, ShieldAlert } from "lucide-react";
import { useAdminApi } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ReadinessCheck = {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
  severity: "required" | "warning";
};

type HealthCheck = {
  key: string;
  ok: boolean;
  detail: string;
  required: boolean;
  latencyMs: number;
};

type HealthRun = {
  id: string;
  status: string;
  checkedAt?: string;
  created_at?: string;
  durationMs?: number;
  duration_ms?: number;
  checks: HealthCheck[];
};

type OpenEvent = {
  id: string;
  source: string;
  severity: "warning" | "error" | "critical";
  eventType: string;
  message: string;
  createdAt: string;
};

type OpsResponse = {
  readiness: { status: string; checkedAt: string; checks: ReadinessCheck[] };
  systemHealth: HealthRun | null;
  openEvents: OpenEvent[];
  error?: string;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusBadge(status: string) {
  return status === "healthy" || status === "ready" || status === "ok" ? "secondary" : "destructive";
}

export function AdminOps() {
  const { adminFetch, canManageOps } = useAdminApi();
  const [data, setData] = useState<OpsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminFetch("/api/admin/ops", { cache: "no-store" });
      const payload = await response.json() as OpsResponse;
      if (!response.ok) throw new Error(payload.error || "운영 상태를 불러오지 못했습니다.");
      setData(payload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  const runHealth = async () => {
    setRunning(true);
    setError(null);
    try {
      const response = await adminFetch("/api/admin/ops", { method: "POST" });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Health check 실행에 실패했습니다.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setRunning(false);
    }
  };

  const acknowledge = async (eventId: string) => {
    setAcknowledgingId(eventId);
    setError(null);
    try {
      const response = await adminFetch("/api/admin/ops", {
        method: "PATCH",
        body: JSON.stringify({ eventId }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "이벤트 확인 처리에 실패했습니다.");
      setData((current) => current ? {
        ...current,
        openEvents: current.openEvents.filter((event) => event.id !== eventId),
      } : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setAcknowledgingId(null);
    }
  };

  const health = data?.systemHealth;
  const healthDate = health?.checkedAt || health?.created_at;
  const readinessFailures = data?.readiness.checks.filter((check) => !check.ok) || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">운영 상태</h1>
          <p className="text-sm text-muted-foreground">프로덕션 readiness, 통합 health check와 미확인 경보를 관리합니다.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            새로고침
          </Button>
          {canManageOps && (
            <Button size="sm" onClick={() => void runHealth()} disabled={running}>
              <Activity className={`h-3.5 w-3.5 ${running ? "animate-pulse" : ""}`} />
              Health check 실행
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Readiness</CardTitle></CardHeader>
          <CardContent className="flex items-end justify-between gap-3">
            <Badge variant={statusBadge(data?.readiness.status || "loading")}>{data?.readiness.status || "loading"}</Badge>
            <span className="text-xs text-muted-foreground">실패 {readinessFailures.length}개</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">System health</CardTitle></CardHeader>
          <CardContent className="flex items-end justify-between gap-3">
            <Badge variant={statusBadge(health?.status || "unknown")}>{health?.status || "unknown"}</Badge>
            <span className="text-xs text-muted-foreground">{formatDate(healthDate)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">미확인 이벤트</CardTitle></CardHeader>
          <CardContent className="flex items-end justify-between gap-3">
            <span className="text-2xl font-semibold">{data?.openEvents.length ?? 0}</span>
            <ShieldAlert className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Health checks</CardTitle></CardHeader>
        <CardContent>
          {!health ? (
            <p className="py-8 text-center text-sm text-muted-foreground">실행된 health check가 없습니다.</p>
          ) : (
            <div className="divide-y">
              {health.checks.map((check) => (
                <div key={check.key} className="flex items-start gap-3 py-3">
                  <Badge variant={check.ok ? "secondary" : "destructive"}>{check.ok ? "pass" : "fail"}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs font-medium">{check.key}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{check.detail}</p>
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground">{check.latencyMs}ms</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">미확인 이벤트</CardTitle></CardHeader>
        <CardContent>
          {loading && !data ? (
            <p className="py-8 text-center text-sm text-muted-foreground">운영 이벤트를 불러오는 중...</p>
          ) : !data?.openEvents.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">미확인 이벤트가 없습니다.</p>
          ) : (
            <div className="divide-y">
              {data.openEvents.map((event) => (
                <div key={event.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start">
                  <Badge variant={event.severity === "warning" ? "outline" : "destructive"}>{event.severity}</Badge>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{event.message}</p>
                      <span className="font-mono text-xs text-muted-foreground">{event.eventType}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{event.source} · {formatDate(event.createdAt)}</p>
                  </div>
                  {canManageOps && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void acknowledge(event.id)}
                      disabled={acknowledgingId === event.id}
                    >
                      <Check className="h-3.5 w-3.5" />
                      확인 완료
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
