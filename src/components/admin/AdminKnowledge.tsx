"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { useAdminApi } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminKnowledgeItem } from "@/lib/admin/types";

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

export function AdminKnowledge() {
  const { adminFetch } = useAdminApi();
  const [documents, setDocuments] = useState<AdminKnowledgeItem[]>([]);
  const [diffByDocId, setDiffByDocId] = useState<Record<string, NonNullable<AdminKnowledgeItem["diff"]>>>({});
  const [source, setSource] = useState<"db" | "static">("db");
  const [loading, setLoading] = useState(true);
  const [savingDocId, setSavingDocId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/knowledge");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "지식 문서를 불러오지 못했습니다.");
      setDocuments(data.documents || []);
      setSource(data.source || "db");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const updateDocument = async (docId: string, action: "approve" | "discard" | "recheck" | "diff") => {
    setSavingDocId(docId);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/knowledge", {
        method: "PATCH",
        body: JSON.stringify({ docId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "문서 상태를 변경하지 못했습니다.");
      if (data.diff) {
        setDiffByDocId((prev) => ({ ...prev, [docId]: data.diff }));
      }
      if (action !== "diff") await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingDocId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">출처 문서</h1>
          <p className="text-sm text-muted-foreground">RAG 문서의 확인일, 공식 출처, 승인/폐기 상태를 검수합니다.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadDocuments} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          새로고침
        </Button>
      </div>

      {source === "static" && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          운영 DB에 지식 문서가 없어 정적 RAG 메타데이터를 표시 중입니다. 승인/폐기 버튼을 누르면 DB 추적 레코드가 생성됩니다.
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">문서 {documents.length}개</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">문서를 불러오는 중...</div>
          ) : documents.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">등록된 문서가 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1220px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">문서</th>
                    <th className="py-2 pr-3 font-medium">출처</th>
                    <th className="py-2 pr-3 font-medium">주제</th>
                    <th className="py-2 pr-3 font-medium">확인일</th>
                    <th className="py-2 pr-3 font-medium">유효기간</th>
                    <th className="py-2 pr-3 font-medium">영향도</th>
                    <th className="py-2 pr-3 font-medium">상태</th>
                    <th className="py-2 font-medium">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => {
                    const diff = diffByDocId[doc.docId] || doc.diff;
                    return (
                      <tr key={doc.docId} className="border-b last:border-0 align-top hover:bg-muted/40">
                        <td className="max-w-xs py-3 pr-3">
                          <div className="font-medium">{doc.title}</div>
                          <div className="font-mono text-xs text-muted-foreground">{doc.docId}</div>
                          {!doc.persisted && <Badge variant="outline" className="mt-1">static</Badge>}
                          <div className="mt-1 text-xs text-muted-foreground">chunk {doc.chunkCount}</div>
                        </td>
                        <td className="max-w-xs py-3 pr-3">
                          <a
                            className="break-all text-xs text-primary underline-offset-2 hover:underline"
                            href={doc.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {doc.sourceUrl}
                          </a>
                          <div className="mt-1 text-xs text-muted-foreground">{doc.sourceType}</div>
                        </td>
                        <td className="py-3 pr-3">
                          <Badge variant="outline">{doc.topic}</Badge>
                        </td>
                        <td className="py-3 pr-3 text-xs">
                          <div>{formatDate(doc.lastCheckedAt)}</div>
                          <div className="text-muted-foreground">{doc.checkedBy}</div>
                        </td>
                        <td className="py-3 pr-3 font-mono text-xs">
                          {formatDate(doc.validFrom)} - {formatDate(doc.validTo)}
                        </td>
                        <td className="py-3 pr-3 text-xs">
                          <div>룰 {doc.impact?.ruleCount ?? 0}개</div>
                          <div className="text-muted-foreground">대화 {doc.impact?.userCount ?? 0}개</div>
                          {diff && (
                            <div className={diff.changed ? "mt-1 text-amber-700" : "mt-1 text-emerald-700"}>
                              {diff.changed ? `변경 +${diff.addedChunks}/-${diff.removedChunks}` : "변경 없음"}
                            </div>
                          )}
                        </td>
                        <td className="py-3 pr-3">
                          <Badge variant={doc.reviewStatus === "APPROVED" || doc.reviewStatus === "approved" ? "default" : "outline"}>
                            {doc.reviewStatus}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-1">
                            <Button size="sm" variant="outline" disabled={savingDocId === doc.docId} onClick={() => updateDocument(doc.docId, "approve")}>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              승인
                            </Button>
                            <Button size="sm" variant="outline" disabled={savingDocId === doc.docId} onClick={() => updateDocument(doc.docId, "diff")}>
                              <RefreshCw className="h-3.5 w-3.5" />
                              차이
                            </Button>
                            <Button size="sm" variant="outline" disabled={savingDocId === doc.docId} onClick={() => updateDocument(doc.docId, "recheck")}>
                              <RotateCcw className="h-3.5 w-3.5" />
                              재확인
                            </Button>
                            <Button size="sm" variant="destructive" disabled={savingDocId === doc.docId} onClick={() => updateDocument(doc.docId, "discard")}>
                              <Trash2 className="h-3.5 w-3.5" />
                              폐기
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
