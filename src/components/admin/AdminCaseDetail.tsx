"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertOctagon,
  ArrowLeft,
  Building2,
  CheckCircle2,
  FileWarning,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldAlert,
  UserCheck,
} from "lucide-react";
import { useAdminApi } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { AdminCaseAction, AdminCaseDetail as AdminCaseDetailType } from "@/lib/admin/types";

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

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs leading-relaxed">
      {JSON.stringify(value ?? {}, null, 2)}
    </pre>
  );
}

function statusBadge(status: string, risk: string) {
  if (status === "CLOSED") return <Badge className="bg-slate-700">종결</Badge>;
  if (status === "APPROVED") return <Badge className="bg-emerald-600">수임/승인</Badge>;
  if (status === "STOPPED") return <Badge variant="destructive">처리 중단</Badge>;
  if (risk === "HIGH" || status === "HIGH_RISK") return <Badge variant="destructive">고위험</Badge>;
  if (status === "NEEDS_MORE_DOCUMENTS") return <Badge className="bg-amber-600">보완 요청</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

const actions: Array<{
  action: AdminCaseAction;
  label: string;
  icon: typeof Send;
  variant: "default" | "secondary" | "destructive" | "outline";
}> = [
  { action: "approve_send", label: "승인 후 학생에게 전송", icon: Send, variant: "default" },
  { action: "request_more_documents", label: "반려: 추가서류 요청", icon: FileWarning, variant: "secondary" },
  { action: "mark_high_risk", label: "고위험: 직접 상담 필요", icon: ShieldAlert, variant: "outline" },
  { action: "stop_suspected_fraud", label: "허위/위조 의심: 처리 중단", icon: AlertOctagon, variant: "destructive" },
];

export function AdminCaseDetail({ caseId }: { caseId: string }) {
  const { adminFetch } = useAdminApi();
  const [caseItem, setCaseItem] = useState<AdminCaseDetailType | null>(null);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState<AdminCaseAction | null>(null);
  const [savingDocumentId, setSavingDocumentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [partnerOfficeId, setPartnerOfficeId] = useState("");
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);

  const loadCase = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/cases/${caseId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "케이스를 불러오지 못했습니다.");
      setCaseItem(data.case);
      setDraft(data.case?.aiDraft || "");
      setPartnerOfficeId(data.case?.organizationId || data.case?.partnerOffices?.[0]?.id || "");
      setSelectedDocumentIds(data.case?.caseDocumentLinks?.filter((link: { requested: boolean }) => link.requested).map((link: { documentItemId: string }) => link.documentItemId) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [adminFetch, caseId]);

  useEffect(() => {
    loadCase();
  }, [loadCase]);

  const submitAction = async (action: AdminCaseAction, extra: Record<string, unknown> = {}) => {
    setSavingAction(action);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/cases/${caseId}/actions`, {
        method: "POST",
        body: JSON.stringify({ action, note, responseDraft: draft, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "처리하지 못했습니다.");
      setNote("");
      await loadCase();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingAction(null);
    }
  };

  const toggleDocumentSelection = (documentId: string) => {
    setSelectedDocumentIds((current) =>
      current.includes(documentId) ? current.filter((id) => id !== documentId) : [...current, documentId]
    );
  };

  const reviewDocument = async (
    documentId: string,
    status: "OCR_PROCESSING" | "OCR_DONE" | "NEEDS_REVIEW" | "APPROVED" | "REJECTED",
    reviewStatus: "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_HUMAN_REVIEW",
    reviewNote: string
  ) => {
    setSavingDocumentId(documentId);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/documents/${documentId}/review`, {
        method: "PATCH",
        body: JSON.stringify({ status, reviewStatus, reviewNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "서류 상태를 변경하지 못했습니다.");
      await loadCase();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingDocumentId(null);
    }
  };

  if (loading && !caseItem) {
    return <div className="py-16 text-center text-sm text-muted-foreground">케이스를 불러오는 중...</div>;
  }

  if (error && !caseItem) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/cases">
            <ArrowLeft className="h-3.5 w-3.5" />
            목록
          </Link>
        </Button>
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      </div>
    );
  }

  if (!caseItem) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/cases">
              <ArrowLeft className="h-3.5 w-3.5" />
              케이스 목록
            </Link>
          </Button>
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {statusBadge(caseItem.status, caseItem.riskLevel)}
              <Badge variant="outline">{caseItem.category}</Badge>
              <Badge variant="outline">{caseItem.nationality}</Badge>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{caseItem.summary}</h1>
            <p className="text-sm text-muted-foreground">
              {caseItem.studentName} · {caseItem.visaType || "비자 미정"} · 업데이트 {formatDate(caseItem.updatedAt)}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadCase} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          새로고침
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">학생 프로필</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <div className="text-xs text-muted-foreground">연락처</div>
                  <div className="font-medium">{caseItem.student.email || caseItem.student.phone || caseItem.student.zaloUid || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">학교</div>
                  <div className="font-medium">{caseItem.schoolName || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">과정</div>
                  <div className="font-medium">{caseItem.programType || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">TOPIK</div>
                  <div className="font-medium">{caseItem.student.topikLevel ?? "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">학기 상태</div>
                  <div className="font-medium">{caseItem.student.semesterStatus || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">비자 만료</div>
                  <div className="font-medium">{formatDate(caseItem.student.visaExpiryDate)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">배정 사무소</div>
                  <div className="font-medium">{caseItem.organizationName || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">수임/종결</div>
                  <div className="font-medium">{formatDate(caseItem.acceptedAt)} / {formatDate(caseItem.closedAt)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">대화 요약</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed">
              {caseItem.conversationSummary || "요약이 아직 없습니다."}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">업로드 서류</CardTitle>
            </CardHeader>
            <CardContent>
              {caseItem.documents.length === 0 ? (
                <div className="py-6 text-sm text-muted-foreground">등록된 서류가 없습니다.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">서류</th>
                        <th className="py-2 pr-3 font-medium">업로드</th>
                        <th className="py-2 pr-3 font-medium">검토</th>
                        <th className="py-2 pr-3 font-medium">만료</th>
                        <th className="py-2 pr-3 font-medium">파일</th>
                        <th className="py-2 font-medium">검수</th>
                      </tr>
                    </thead>
                    <tbody>
                      {caseItem.documents.map((doc) => (
                        <tr key={doc.id} className="border-b last:border-0">
                          <td className="py-2 pr-3 font-medium">{doc.documentType}</td>
                          <td className="py-2 pr-3"><Badge variant="outline">{doc.status}</Badge></td>
                          <td className="py-2 pr-3"><Badge variant="secondary">{doc.reviewStatus}</Badge></td>
                          <td className="py-2 pr-3 font-mono text-xs">{formatDate(doc.expiresAt)}</td>
                          <td className="py-2 pr-3 text-xs text-muted-foreground">{doc.file?.originalName || "-"}</td>
                          <td className="py-2">
                            <div className="flex flex-wrap gap-1">
                              <Button
                                size="sm"
                                variant={selectedDocumentIds.includes(doc.id) ? "secondary" : "outline"}
                                disabled={savingDocumentId === doc.id}
                                onClick={() => toggleDocumentSelection(doc.id)}
                              >
                                선택
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={savingDocumentId === doc.id}
                                onClick={() => reviewDocument(doc.id, "OCR_PROCESSING", "PENDING", "OCR 비동기 처리 대기")}
                              >
                                OCR
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={savingDocumentId === doc.id}
                                onClick={() => reviewDocument(doc.id, "OCR_DONE", "PENDING", "OCR 처리 완료")}
                              >
                                완료
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={savingDocumentId === doc.id}
                                onClick={() => reviewDocument(doc.id, "NEEDS_REVIEW", "NEEDS_HUMAN_REVIEW", "추가 검토 필요")}
                              >
                                보완
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={savingDocumentId === doc.id}
                                onClick={() => reviewDocument(doc.id, "APPROVED", "APPROVED", "행정사 검수 승인")}
                              >
                                승인
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={savingDocumentId === doc.id}
                                onClick={() => reviewDocument(doc.id, "REJECTED", "REJECTED", "서류 반려")}
                              >
                                반려
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">룰엔진 결과</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {caseItem.evaluations.length === 0 ? (
                <div className="text-sm text-muted-foreground">저장된 평가 결과가 없습니다.</div>
              ) : (
                <div className="grid gap-2">
                  {caseItem.evaluations.map((evaluation) => (
                    <div key={evaluation.id} className="rounded-md border px-3 py-2 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-medium">{evaluation.ruleCode}@v{evaluation.ruleVersion}</div>
                        <div className="flex items-center gap-1">
                          <Badge variant={evaluation.riskLevel === "HIGH" ? "destructive" : "outline"}>
                            {evaluation.riskLevel}
                          </Badge>
                          <Badge variant="secondary">{evaluation.ruleReviewStatus}</Badge>
                        </div>
                      </div>
                      <div className="mt-1 font-mono text-xs text-muted-foreground">{formatDate(evaluation.evaluatedAt)}</div>
                    </div>
                  ))}
                </div>
              )}
              <JsonBlock value={caseItem.ruleSnapshot} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">케이스 수명주기</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">파트너 사무소</label>
                <select
                  value={partnerOfficeId}
                  onChange={(event) => setPartnerOfficeId(event.target.value)}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                >
                  {caseItem.partnerOffices.length === 0 ? (
                    <option value="">등록된 파트너 없음</option>
                  ) : (
                    caseItem.partnerOffices.map((office) => (
                      <option key={office.id} value={office.id}>
                        {office.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={4}
                placeholder="배정/수임/보완/코멘트/종결 메모"
              />
              <div className="grid gap-2">
                <Button
                  variant="outline"
                  onClick={() => submitAction("assign_partner", { organizationId: partnerOfficeId })}
                  disabled={Boolean(savingAction) || !partnerOfficeId}
                  className="justify-start"
                >
                  {savingAction === "assign_partner" ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Building2 className="h-3.5 w-3.5" />
                  )}
                  파트너 사무소 배정
                </Button>
                <Button
                  variant="default"
                  onClick={() => submitAction("accept_case", { organizationId: partnerOfficeId })}
                  disabled={Boolean(savingAction) || !partnerOfficeId}
                  className="justify-start"
                >
                  {savingAction === "accept_case" ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserCheck className="h-3.5 w-3.5" />
                  )}
                  수임 처리
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    submitAction("request_supplement", {
                      organizationId: partnerOfficeId || undefined,
                      documentItemIds: selectedDocumentIds,
                    })
                  }
                  disabled={Boolean(savingAction)}
                  className="justify-start"
                >
                  {savingAction === "request_supplement" ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileWarning className="h-3.5 w-3.5" />
                  )}
                  선택 서류 보완 요청
                </Button>
                <Button
                  variant="outline"
                  onClick={() => submitAction("add_comment", { organizationId: partnerOfficeId || undefined })}
                  disabled={Boolean(savingAction)}
                  className="justify-start"
                >
                  {savingAction === "add_comment" ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <MessageSquare className="h-3.5 w-3.5" />
                  )}
                  협업 코멘트 추가
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => submitAction("close_case", { organizationId: partnerOfficeId || undefined })}
                  disabled={Boolean(savingAction)}
                  className="justify-start"
                >
                  {savingAction === "close_case" ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  케이스 종결
                </Button>
              </div>
              {caseItem.caseDocumentLinks.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="text-xs font-medium text-muted-foreground">케이스 연결 서류</div>
                  {caseItem.caseDocumentLinks.map((link) => (
                    <div key={link.id} className="rounded-md border px-3 py-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{link.documentType}</span>
                        <Badge variant={link.requested ? "secondary" : "outline"}>{link.purpose}</Badge>
                      </div>
                      {link.note && <div className="mt-1 text-muted-foreground">{link.note}</div>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">AI 답변 초안</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={12} />
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={4}
                placeholder="행정사 검토 메모 또는 학생에게 보낼 보완 요청 사유"
              />
              <div className="grid gap-2">
                {actions.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.action}
                      variant={item.variant}
                      onClick={() => submitAction(item.action)}
                      disabled={Boolean(savingAction)}
                      className="justify-start"
                    >
                      {savingAction === item.action ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Icon className="h-3.5 w-3.5" />
                      )}
                      {item.label}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">승인/반려 이력</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {caseItem.reviews.length === 0 ? (
                <div className="text-sm text-muted-foreground">검토 이력이 없습니다.</div>
              ) : (
                caseItem.reviews.map((review) => (
                  <div key={review.id} className="rounded-md border px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline">{review.decision}</Badge>
                      <span className="font-mono text-xs text-muted-foreground">{formatDate(review.reviewedAt)}</span>
                    </div>
                    {review.note && <div className="mt-2 text-muted-foreground">{review.note}</div>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">협업 타임라인</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {caseItem.timelineEvents.length === 0 ? (
                <div className="text-sm text-muted-foreground">타임라인이 없습니다.</div>
              ) : (
                caseItem.timelineEvents.slice(0, 12).map((event) => (
                  <div key={event.id} className="rounded-md border px-3 py-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{event.eventType}</span>
                      <span className="font-mono text-muted-foreground">{formatDate(event.createdAt)}</span>
                    </div>
                    <div className="mt-1 text-muted-foreground">{event.actorRole || "-"} · {event.message || "-"}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">감사 로그</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {caseItem.auditEvents.length === 0 ? (
                <div className="text-sm text-muted-foreground">이벤트가 없습니다.</div>
              ) : (
                caseItem.auditEvents.slice(0, 12).map((event) => (
                  <div key={`${event.source}-${event.id}`} className="rounded-md border px-3 py-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{event.action}</span>
                      <span className="font-mono text-muted-foreground">{formatDate(event.createdAt)}</span>
                    </div>
                    <div className="mt-1 text-muted-foreground">{event.source} · {event.actorRole || "-"}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
