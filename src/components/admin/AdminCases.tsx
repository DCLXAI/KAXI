"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, FileWarning, RefreshCw, ShieldAlert } from "lucide-react";
import { useAdminApi } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminCaseBucket, AdminCaseCounts, AdminCaseListItem } from "@/lib/admin/types";

const bucketLabels: Record<AdminCaseBucket, string> = {
  new: "신규 케이스",
  due_soon: "마감 임박",
  high_risk: "위험 케이스",
  needs_more_documents: "보완 요청",
  approved: "승인 완료",
};

const bucketIcons = {
  new: Clock,
  due_soon: FileWarning,
  high_risk: ShieldAlert,
  needs_more_documents: AlertTriangle,
  approved: CheckCircle2,
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(
    new Date(value)
  );
}

function statusBadge(status: string, risk: string) {
  if (status === "APPROVED" || status === "CLOSED") return <Badge className="bg-emerald-600">승인</Badge>;
  if (status === "STOPPED") return <Badge variant="destructive">중단</Badge>;
  if (risk === "HIGH" || status === "HIGH_RISK") return <Badge variant="destructive">고위험</Badge>;
  if (status === "NEEDS_MORE_DOCUMENTS") return <Badge className="bg-amber-600">보완</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

export function AdminCases() {
  const { adminFetch } = useAdminApi();
  const [bucket, setBucket] = useState<AdminCaseBucket>("new");
  const [cases, setCases] = useState<AdminCaseListItem[]>([]);
  const [counts, setCounts] = useState<AdminCaseCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/cases?bucket=${bucket}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "케이스를 불러오지 못했습니다.");
      setCases(data.cases || []);
      setCounts(data.counts || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [adminFetch, bucket]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">행정사 케이스</h1>
          <p className="text-sm text-muted-foreground">신규, 마감, 고위험, 보완, 승인 완료 상태를 한 화면에서 처리합니다.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadCases} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          새로고침
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {(Object.keys(bucketLabels) as AdminCaseBucket[]).map((key) => {
          const Icon = bucketIcons[key];
          const active = bucket === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setBucket(key)}
              className={`rounded-md border px-3 py-3 text-left transition-colors ${
                active ? "border-primary bg-primary/10" : "bg-card hover:bg-muted/60"
              }`}
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                {bucketLabels[key]}
              </div>
              <div className="mt-1 text-2xl font-semibold">{counts?.[key] ?? 0}</div>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {bucketLabels[bucket]} <span className="text-muted-foreground">({cases.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">불러오는 중...</div>
          ) : cases.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">현재 이 상태의 케이스가 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">상태</th>
                    <th className="py-2 pr-3 font-medium">학생</th>
                    <th className="py-2 pr-3 font-medium">요약</th>
                    <th className="py-2 pr-3 font-medium">학교/과정</th>
                    <th className="py-2 pr-3 font-medium">마감</th>
                    <th className="py-2 pr-3 font-medium">보완</th>
                    <th className="py-2 pr-3 font-medium">업데이트</th>
                    <th className="py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {cases.map((caseItem) => (
                    <tr key={caseItem.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-3 pr-3">{statusBadge(caseItem.status, caseItem.riskLevel)}</td>
                      <td className="py-3 pr-3">
                        <div className="font-medium">{caseItem.studentName}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {caseItem.nationality} · {caseItem.visaType || "visa?"}
                        </div>
                      </td>
                      <td className="max-w-sm py-3 pr-3">
                        <div className="line-clamp-2">{caseItem.summary}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{caseItem.category}</div>
                      </td>
                      <td className="py-3 pr-3 text-xs">
                        <div>{caseItem.schoolName || "-"}</div>
                        <div className="text-muted-foreground">{caseItem.programType || "-"}</div>
                      </td>
                      <td className="py-3 pr-3 font-mono text-xs">{formatDate(caseItem.dueAt)}</td>
                      <td className="py-3 pr-3">
                        <Badge variant={caseItem.missingDocumentCount > 0 ? "outline" : "secondary"}>
                          {caseItem.missingDocumentCount}
                        </Badge>
                      </td>
                      <td className="py-3 pr-3 font-mono text-xs text-muted-foreground">{formatDate(caseItem.updatedAt)}</td>
                      <td className="py-3 text-right">
                        <Button size="sm" asChild>
                          <Link href={`/admin/cases/${caseItem.id}`}>검토</Link>
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
    </div>
  );
}
