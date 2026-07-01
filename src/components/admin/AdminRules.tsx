"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { useAdminApi } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminRuleItem } from "@/lib/admin/types";

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

function JsonInline({ value }: { value: unknown }) {
  return <code className="break-all rounded bg-muted px-1.5 py-0.5 text-[11px]">{JSON.stringify(value)}</code>;
}

export function AdminRules() {
  const { adminFetch } = useAdminApi();
  const [rules, setRules] = useState<AdminRuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/rules");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "룰 목록을 불러오지 못했습니다.");
      setRules(data.rules || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const updateReviewStatus = async (versionId: string, reviewStatus: "APPROVED" | "REJECTED" | "PENDING") => {
    setSavingId(versionId);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/rules", {
        method: "PATCH",
        body: JSON.stringify({ versionId, reviewStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "승인 상태를 변경하지 못했습니다.");
      await loadRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">룰 관리</h1>
          <p className="text-sm text-muted-foreground">룰 목록, 버전, 테스트 케이스, 행정사 승인 상태를 확인합니다.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadRules} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          새로고침
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">룰을 불러오는 중...</div>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">등록된 룰이 없습니다.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{rule.code}</CardTitle>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant="outline">{rule.domain}</Badge>
                      <Badge variant="outline">{rule.visaType}</Badge>
                      <Badge variant="secondary">{rule.ruleType}</Badge>
                      <Badge>{rule.status}</Badge>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">updated {formatDate(rule.updatedAt)}</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">버전</th>
                        <th className="py-2 pr-3 font-medium">유효기간</th>
                        <th className="py-2 pr-3 font-medium">승인 상태</th>
                        <th className="py-2 pr-3 font-medium">테스트</th>
                        <th className="py-2 pr-3 font-medium">필수 입력</th>
                        <th className="py-2 pr-3 font-medium">출처</th>
                        <th className="py-2 font-medium">액션</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rule.versions.map((version) => (
                        <tr key={version.id} className="border-b last:border-0 align-top">
                          <td className="py-3 pr-3 font-mono">v{version.version}</td>
                          <td className="py-3 pr-3 text-xs">
                            {formatDate(version.effectiveFrom)} - {formatDate(version.effectiveTo)}
                          </td>
                          <td className="py-3 pr-3">
                            <Badge variant={version.reviewStatus === "APPROVED" ? "default" : "outline"}>
                              {version.reviewStatus}
                            </Badge>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {version.reviewedBy || "-"} · {formatDate(version.reviewedAt)}
                            </div>
                          </td>
                          <td className="py-3 pr-3">
                            <Badge variant={version.testCount === version.passedTestCount ? "secondary" : "destructive"}>
                              {version.passedTestCount}/{version.testCount}
                            </Badge>
                          </td>
                          <td className="max-w-[220px] py-3 pr-3"><JsonInline value={version.requiredInputs} /></td>
                          <td className="max-w-[220px] py-3 pr-3"><JsonInline value={version.sourceRefs} /></td>
                          <td className="py-3">
                            <div className="flex flex-wrap gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateReviewStatus(version.id, "APPROVED")}
                                disabled={savingId === version.id}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                승인
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateReviewStatus(version.id, "REJECTED")}
                                disabled={savingId === version.id}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                반려
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
