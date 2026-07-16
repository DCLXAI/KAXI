"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, RefreshCw, RotateCcw, Satellite, Trash2 } from "lucide-react";
import { useAdminApi } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminKnowledgeItem, AdminKnowledgeReadiness } from "@/lib/admin/types";

interface MonitorResult {
  checkedAt: string;
  persistCandidates: boolean;
  total: number;
  changed: number;
  unchanged: number;
  failed: number;
  candidatesCreated: number;
  candidateWritesEnabled?: boolean;
  candidateWritePaused?: boolean;
  alert?: {
    attempted: boolean;
    sent: boolean;
    skippedReason?: "not_configured" | "no_change";
    status?: number;
    error?: string;
  };
  results: Array<{
    docId: string;
    title: string;
    sourceUrl: string;
    status: "changed" | "unchanged" | "failed";
    candidateDocId?: string;
    candidatePersisted?: boolean;
    error?: string;
    diff?: NonNullable<AdminKnowledgeItem["diff"]>;
  }>;
}

interface KnowledgePagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function AdminKnowledge() {
  const { adminFetch } = useAdminApi();
  const [documents, setDocuments] = useState<AdminKnowledgeItem[]>([]);
  const [readiness, setReadiness] = useState<AdminKnowledgeReadiness | null>(null);
  const [diffByDocId, setDiffByDocId] = useState<Record<string, NonNullable<AdminKnowledgeItem["diff"]>>>({});
  const [source, setSource] = useState<"db" | "static">("db");
  const [loading, setLoading] = useState(true);
  const [savingDocId, setSavingDocId] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<"approve" | "discard" | null>(null);
  const [monitoringMode, setMonitoringMode] = useState<"preview" | "persist" | null>(null);
  const [monitorResult, setMonitorResult] = useState<MonitorResult | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [pagination, setPagination] = useState<KnowledgePagination>({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 0,
    hasPrevious: false,
    hasNext: false,
  });
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/knowledge?page=${page}&pageSize=${pageSize}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "지식 문서를 불러오지 못했습니다.");
      setDocuments(data.documents || []);
      setSource(data.source || "db");
      setReadiness(data.readiness || null);
      setPagination(data.pagination || {
        page,
        pageSize,
        total: data.documents?.length || 0,
        totalPages: data.documents?.length ? 1 : 0,
        hasPrevious: false,
        hasNext: false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [adminFetch, page, pageSize]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const requestCandidateReview = () => {
    const checkedBy = window.prompt("행정사 검수자 성명/자격번호를 입력하세요.");
    if (!checkedBy?.trim()) return null;
    const checkedAt = window.prompt("검수 확인일을 입력하세요. (YYYY-MM-DD)", todayDateInputValue());
    if (!checkedAt?.trim()) return null;
    return { checkedBy: checkedBy.trim(), checkedAt: checkedAt.trim() };
  };

  const updateDocument = async (docId: string, action: "approve" | "discard" | "recheck" | "diff") => {
    const review = action === "approve" && docId.includes("__candidate__") ? requestCandidateReview() : null;
    if (action === "approve" && docId.includes("__candidate__") && !review) return;
    setSavingDocId(docId);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/knowledge", {
        method: "PATCH",
        body: JSON.stringify({ docId, action, ...review }),
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

  const runMonitor = async (persistCandidates: boolean) => {
    setMonitoringMode(persistCandidates ? "persist" : "preview");
    setError(null);
    try {
      const res = await adminFetch("/api/knowledge/monitor", {
        method: "POST",
        body: JSON.stringify({ persistCandidates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "공식 출처 감시를 실행하지 못했습니다.");
      setMonitorResult(data);
      const diffEntries = Object.fromEntries(
        (data.results || [])
          .filter((item: MonitorResult["results"][number]) => item.diff)
          .map((item: MonitorResult["results"][number]) => [item.docId, item.diff])
      );
      if (Object.keys(diffEntries).length > 0) {
        setDiffByDocId((prev) => ({ ...prev, ...diffEntries }));
      }
      if (persistCandidates) await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setMonitoringMode(null);
    }
  };

  const bulkUpdateCandidates = async (action: "approve" | "discard") => {
    const pendingCandidateCount = readiness?.candidateApproval.pendingCandidates || 0;
    if (pendingCandidateCount === 0) return;
    const review = action === "approve" ? requestCandidateReview() : null;
    if (action === "approve" && !review) return;
    const candidateReadiness = readiness?.candidateApproval;
    const message = action === "approve"
      ? [
          `검수 대기 후보 ${pendingCandidateCount}개를 production RAG에 승인 반영할까요?`,
          "",
          `후보 청크: ${candidateReadiness?.pendingCandidateEmbeddedChunks ?? "?"}/${candidateReadiness?.pendingCandidateChunks ?? "?"} embedded`,
          `공식 후보 청크: ${candidateReadiness?.pendingOfficialCandidateEmbeddedChunks ?? "?"}/${candidateReadiness?.pendingOfficialCandidateChunks ?? "?"} embedded`,
          `승인 후 예상 production 공식 청크: ${candidateReadiness?.projectedApprovedOfficialEmbeddedChunks ?? "?"}/${candidateReadiness?.minProjectedApprovedChunks ?? 500}`,
          "",
          "서버가 pending 후보 전체 포함, 실제 pgvector 임베딩, 500+ 공식 후보 청크 기준을 다시 검증합니다.",
        ].join("\n")
      : `검수 대기 후보 ${pendingCandidateCount}개를 폐기할까요?`;
    if (!window.confirm(message)) return;

    setBulkAction(action);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/knowledge", {
        method: "PATCH",
        body: JSON.stringify({
          action: action === "approve" ? "bulkApproveCandidates" : "bulkDiscardCandidates",
          allPendingCandidates: true,
          ...review,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "후보 문서를 일괄 처리하지 못했습니다.");
      if (data.failed > 0) throw new Error(`후보 ${data.failed}개 처리 실패`);
      if (page === 1) await loadDocuments();
      else setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBulkAction(null);
    }
  };

  const changedResults = monitorResult?.results.filter((item) => item.status === "changed") || [];
  const failedResults = monitorResult?.results.filter((item) => item.status === "failed") || [];
  const pendingCandidatesOnPage = documents.filter((doc) => doc.reviewStatus === "PENDING" && doc.docId.includes("__candidate__"));
  const candidateReadiness = readiness?.candidateApproval;
  const pendingCandidateCount = candidateReadiness?.pendingCandidates ?? pendingCandidatesOnPage.length;
  const corpusReadiness = readiness?.corpus;
  const candidateReadyForBulkApproval = Boolean(candidateReadiness?.ok);
  const productionCorpusReady = Boolean(corpusReadiness?.ok);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">출처 문서</h1>
          <p className="text-sm text-muted-foreground">RAG 문서의 확인일, 공식 출처, 승인/폐기 상태를 검수합니다.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => runMonitor(false)} disabled={Boolean(monitoringMode)}>
            <Satellite className={`h-3.5 w-3.5 ${monitoringMode === "preview" ? "animate-pulse" : ""}`} />
            실시간 감시
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => runMonitor(true)}
            disabled={Boolean(monitoringMode) || monitorResult?.candidateWritesEnabled === false}
            title={monitorResult?.candidateWritesEnabled === false ? "공식 출처 후보 저장이 일시 중단되었습니다." : undefined}
          >
            <AlertTriangle className={`h-3.5 w-3.5 ${monitoringMode === "persist" ? "animate-pulse" : ""}`} />
            후보 생성
          </Button>
          <Button variant="outline" size="sm" onClick={loadDocuments} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            새로고침
          </Button>
        </div>
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

      {pendingCandidateCount > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-medium">검수 대기 공식 후보 {pendingCandidateCount}개</div>
              <div className="mt-1 text-xs">승인하면 기존 문서를 supersede하고 production RAG에 반영됩니다. 폐기하면 검색 대상에서 제외됩니다.</div>
              {candidateReadiness && (
                <div className="mt-2 grid gap-1 text-xs sm:grid-cols-2 lg:grid-cols-5">
                  <div>
                    후보 청크 <span className="font-medium">{candidateReadiness.pendingCandidateChunks}</span>
                  </div>
                  <div>
                    후보 임베딩 <span className={candidateReadiness.allPendingCandidateChunksEmbedded ? "font-medium text-emerald-700" : "font-medium text-destructive"}>
                      {candidateReadiness.pendingCandidateEmbeddedChunks}/{candidateReadiness.pendingCandidateChunks}
                    </span>
                  </div>
                  <div>
                    공식 후보 <span className={candidateReadiness.allPendingOfficialCandidateChunksEmbedded ? "font-medium text-emerald-700" : "font-medium text-destructive"}>
                      {candidateReadiness.pendingOfficialCandidateEmbeddedChunks}/{candidateReadiness.pendingOfficialCandidateChunks}
                    </span>
                  </div>
                  <div>
                    승인 후 공식 RAG <span className={candidateReadiness.projectedApprovedOfficialEmbeddedChunks >= candidateReadiness.minProjectedApprovedChunks ? "font-medium text-emerald-700" : "font-medium text-destructive"}>
                      {candidateReadiness.projectedApprovedOfficialEmbeddedChunks}/{candidateReadiness.minProjectedApprovedChunks}
                    </span>
                  </div>
                  <div>
                    supersede <span className="font-medium">{candidateReadiness.projectedSupersededApprovedDocuments}</span>개
                  </div>
                </div>
              )}
              {candidateReadiness && !candidateReadiness.ok && (
                <div className="mt-2 text-xs text-destructive">
                  후보 승인 readiness 미충족: {candidateReadiness.reasons.join(", ")}
                </div>
              )}
              {corpusReadiness && (
                <div className={productionCorpusReady ? "mt-2 text-xs text-emerald-700" : "mt-2 text-xs text-amber-800"}>
                  현재 production RAG: 공식 승인 임베딩 {corpusReadiness.approvedOfficialEmbeddedChunks}/{corpusReadiness.minApprovedOfficialEmbeddedChunks}
                  <span className="ml-2 text-muted-foreground">(전체 {corpusReadiness.approvedEmbeddedChunks}/{corpusReadiness.minApprovedEmbeddedChunks})</span>
                  {productionCorpusReady ? " 충족" : " 미충족"}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => bulkUpdateCandidates("approve")}
                disabled={Boolean(bulkAction) || !candidateReadyForBulkApproval}
              >
                <CheckCircle2 className={`h-3.5 w-3.5 ${bulkAction === "approve" ? "animate-pulse" : ""}`} />
                후보 전체 승인
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => bulkUpdateCandidates("discard")}
                disabled={Boolean(bulkAction)}
              >
                <Trash2 className={`h-3.5 w-3.5 ${bulkAction === "discard" ? "animate-pulse" : ""}`} />
                후보 전체 폐기
              </Button>
            </div>
          </div>
        </div>
      )}

      {monitorResult && (
        <div className="rounded-md border bg-card px-4 py-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium">
              공식 출처 감시 결과: 변경 {monitorResult.changed}개, 실패 {monitorResult.failed}개, 후보 생성 {monitorResult.candidatesCreated}개
            </div>
            <div className="text-xs text-muted-foreground">{formatDate(monitorResult.checkedAt)}</div>
          </div>
          {monitorResult.candidateWritePaused && (
            <div className="mt-2 text-xs text-amber-700">
              공식 출처 후보 저장은 일시 중단되어 변경 감지만 기록했습니다.
            </div>
          )}
          {monitorResult.alert && (
            <div className="mt-2 text-xs text-muted-foreground">
              운영 알림: {monitorResult.alert.sent
                ? `전송됨${monitorResult.alert.status ? ` (${monitorResult.alert.status})` : ""}`
                : monitorResult.alert.attempted
                  ? `실패${monitorResult.alert.error ? ` · ${monitorResult.alert.error}` : ""}`
                  : monitorResult.alert.skippedReason === "not_configured"
                    ? "웹훅 미설정"
                    : "변경 없음"}
            </div>
          )}
          {(changedResults.length > 0 || failedResults.length > 0) && (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {changedResults.slice(0, 6).map((item) => (
                <div key={item.docId} className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-950">
                  <div className="font-medium">{item.title}</div>
                  <div className="mt-1 text-xs">
                    {item.candidatePersisted ? "PENDING 후보 생성" : "변경 감지"}
                    {item.diff ? ` · 영향 룰 ${item.diff.impact.ruleCount}개 · 대화 ${item.diff.impact.userCount}개` : ""}
                  </div>
                </div>
              ))}
              {failedResults.slice(0, 4).map((item) => (
                <div key={item.docId} className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive">
                  <div className="font-medium">{item.title}</div>
                  <div className="mt-1 text-xs">{item.error || "감시 실패"}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">문서 {pagination.total}개</CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <select
                aria-label="페이지당 문서 수"
                className="h-8 rounded-md border bg-background px-2 text-xs text-foreground"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
              >
                <option value={25}>25개</option>
                <option value={50}>50개</option>
                <option value={100}>100개</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                aria-label="이전 페이지"
                title="이전 페이지"
                disabled={loading || !pagination.hasPrevious}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-16 text-center tabular-nums">
                {pagination.totalPages === 0 ? 0 : pagination.page}/{pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                aria-label="다음 페이지"
                title="다음 페이지"
                disabled={loading || !pagination.hasNext}
                onClick={() => setPage((current) => current + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
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
                            className="break-all text-xs text-primary-strong underline-offset-2 hover:underline"
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
                          {doc.impact?.sourceDocIds.length ? (
                            <div className="mt-1 max-w-[180px] truncate font-mono text-[11px] text-muted-foreground">
                              {doc.impact.sourceDocIds.join(", ")}
                            </div>
                          ) : null}
                          {doc.impact?.rules.length ? (
                            <div className="mt-1 max-w-[180px] truncate text-[11px] text-muted-foreground">
                              {doc.impact.rules.slice(0, 3).map((rule) => `${rule.code}@v${rule.version}`).join(", ")}
                            </div>
                          ) : null}
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
