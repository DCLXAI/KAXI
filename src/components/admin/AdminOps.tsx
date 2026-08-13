"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Check, CheckCheck, RefreshCw, RotateCcw, ShieldAlert } from "lucide-react";
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

type DeadLetterItem = {
  kind: "worker" | "outbox" | "attachment";
  id: string;
  tenantId: string;
  queue: string;
  status: "dead_letter" | "failed";
  attempts: number;
  maxAttempts: number;
  traceId: string | null;
  createdAt: string;
  completedAt: string | null;
  failureCode: string;
};

export type OpsResponse = {
  readiness: { status: string; checkedAt: string; checks: ReadinessCheck[] };
  systemHealth: HealthRun | null;
  openEvents: OpenEvent[];
  openEventCount: number;
  workerQueues: Array<{
    queue: string;
    depth: number;
    retryCount: number;
    deadLetterCount: number;
    oldestAgeSeconds: number | null;
  }>;
  deadLetters: DeadLetterItem[];
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

export function AdminOps({ initialData = null }: { initialData?: OpsResponse | null }) {
  const { adminFetch, canManageOps } = useAdminApi();
  const [data, setData] = useState<OpsResponse | null>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [running, setRunning] = useState(false);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [acknowledgingMany, setAcknowledgingMany] = useState(false);
  const [replayingId, setReplayingId] = useState<string | null>(null);
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
    if (!initialData) void load();
  }, [initialData, load]);

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

  const acknowledgeMany = async (allBeforeNow: boolean) => {
    if (!data?.openEvents.length) return;
    const message = allBeforeNow
      ? `현재 시각 이전의 미확인 이벤트 ${data.openEventCount}건을 모두 확인 처리할까요?`
      : `현재 표시된 이벤트 ${data.openEvents.length}건을 확인 처리할까요?`;
    if (!window.confirm(message)) return;
    setAcknowledgingMany(true);
    setError(null);
    try {
      const response = await adminFetch("/api/admin/ops", {
        method: "PATCH",
        body: JSON.stringify(allBeforeNow
          ? { acknowledgeBefore: new Date().toISOString() }
          : { eventIds: data.openEvents.map((event) => event.id) }),
      });
      const payload = await response.json() as { error?: string; bulk?: { acknowledged: number } };
      if (!response.ok) throw new Error(payload.error || "이벤트 일괄 확인 처리에 실패했습니다.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setAcknowledgingMany(false);
    }
  };

  const replayDeadLetter = async (item: DeadLetterItem) => {
    if (!window.confirm(`${item.queue} 작업을 재실행할까요? 외부 전송은 기존 idempotency key를 재사용합니다.`)) return;
    const reason = window.prompt("재실행 사유를 8자 이상 입력하세요. 개인정보는 입력하지 마세요.", "장애 원인 확인 후 운영 재실행");
    if (!reason) return;
    setReplayingId(item.id);
    setError(null);
    try {
      const response = await adminFetch(`/api/admin/ops/dead-letters/${item.id}/replay`, {
        method: "POST",
        body: JSON.stringify({ kind: item.kind, reason, confirmation: "REPLAY" }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Dead-letter 재실행에 실패했습니다.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setReplayingId(null);
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
            <span className="text-2xl font-semibold">{data?.openEventCount ?? 0}</span>
            <ShieldAlert className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Worker queues</CardTitle></CardHeader>
        <CardContent>
          {!data?.workerQueues?.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Queue 지표가 없습니다.</p>
          ) : (
            <div className="divide-y">
              {data.workerQueues.map((queue) => (
                <div key={queue.queue} className="grid grid-cols-[minmax(0,1fr)_repeat(4,auto)] items-center gap-4 py-3 text-sm">
                  <span className="truncate font-mono text-xs">{queue.queue}</span>
                  <span className="tabular-nums" title="active depth">{queue.depth}</span>
                  <span className="tabular-nums text-amber-700" title="retry">{queue.retryCount}</span>
                  <span className="tabular-nums text-destructive" title="dead letter">{queue.deadLetterCount}</span>
                  <span className="tabular-nums text-muted-foreground" title="oldest age">
                    {queue.oldestAgeSeconds === null ? "-" : `${Math.round(queue.oldestAgeSeconds)}s`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dead-letter replay</CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.deadLetters?.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">재실행이 필요한 dead-letter가 없습니다.</p>
          ) : (
            <div className="divide-y">
              {data.deadLetters.map((item) => (
                <div key={`${item.kind}:${item.id}`} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="destructive">{item.kind}</Badge>
                      <span className="truncate font-mono text-xs">{item.queue}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">{item.attempts}/{item.maxAttempts}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      tenant {item.tenantId} · {item.failureCode} · {formatDate(item.completedAt)}
                    </p>
                  </div>
                  {canManageOps && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void replayDeadLetter(item)}
                      disabled={replayingId === item.id}
                    >
                      <RotateCcw className={`h-3.5 w-3.5 ${replayingId === item.id ? "animate-spin" : ""}`} />
                      재실행
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">미확인 이벤트</CardTitle>
          {canManageOps && Boolean(data?.openEvents.length) && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => void acknowledgeMany(false)} disabled={acknowledgingMany}>
                <CheckCheck className="h-3.5 w-3.5" />
                표시된 항목 확인
              </Button>
              <Button size="sm" onClick={() => void acknowledgeMany(true)} disabled={acknowledgingMany}>
                <CheckCheck className="h-3.5 w-3.5" />
                전체 확인
              </Button>
            </div>
          )}
        </CardHeader>
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
                      disabled={acknowledgingMany || acknowledgingId === event.id}
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
