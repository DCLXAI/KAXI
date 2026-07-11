"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Headphones, Mail, MessageSquareText, Phone, RefreshCw, UserRoundCheck } from "lucide-react";
import { useAdminApi } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type HandoffAction = "assign" | "start" | "contacted" | "resolve" | "close" | "reopen";

type HandoffTask = {
  id: string;
  sessionId: string;
  status: string;
  riskLevel: string;
  leadStage: string;
  assignee: string | null;
  assigneeUserId: string | null;
  organizationId: string | null;
  assignedAt: string | null;
  slaPolicy: string | null;
  slaTier: string | null;
  slaMinutes: number | null;
  slaDueAt: string | null;
  slaStatus: string | null;
  question: string;
  answer: string;
  notes: string | null;
  source: string;
  locale: string;
  leadId: string | null;
  leadStatus: string | null;
  contactType: string | null;
  contactValue: string | null;
  contactName: string | null;
  hasContact: boolean;
  sources: Array<{ title?: string; source?: string; sourceUrl?: string; checkedAt?: string }>;
  contactReceivedAt: string | null;
  consentAcceptedAt: string | null;
  consentNoticeVersion: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
};

type HandoffResponse = {
  tasks: HandoffTask[];
  assignees: Array<{ id: string; email: string | null; organizationId: string; organizationName: string }>;
  counts: { total: number; active: number; urgent: number; unassigned: number; contactReady: number; overdue: number };
  error?: string;
};

const ACTIVE = new Set(["open", "review", "contact_requested", "contact_received", "assigned", "in_progress"]);

const STATUS_LABELS: Record<string, string> = {
  open: "신규",
  review: "검토",
  contact_requested: "연락처 요청",
  contact_received: "연락처 수신",
  assigned: "배정",
  in_progress: "처리 중",
  contacted: "연락 완료",
  resolved: "해결",
  closed: "종료",
  duplicate: "중복",
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function riskVariant(risk: string) {
  return risk === "high" ? "destructive" as const : risk === "medium" ? "outline" as const : "secondary" as const;
}

function slaLabel(task: HandoffTask) {
  if (!task.slaDueAt) return "미지정";
  if (task.slaStatus === "overdue" || task.slaStatus === "breached") return "SLA 초과";
  if (task.slaStatus === "met") return "응답 완료";
  return `${formatDate(task.slaDueAt)}까지`;
}

function contactHref(task: HandoffTask) {
  if (!task.contactValue || task.contactValue.includes("***")) return undefined;
  if (task.contactType === "email" || task.contactValue.includes("@")) return `mailto:${task.contactValue}`;
  if (task.contactType === "phone") return `tel:${task.contactValue.replace(/[^+\d]/g, "")}`;
  return undefined;
}

export function AdminHandoffs() {
  const { adminFetch, canManageOps } = useAdminApi();
  const [data, setData] = useState<HandoffResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("active");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [slaMinutes, setSlaMinutes] = useState("1440");
  const [note, setNote] = useState("");
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminFetch("/api/admin/handoffs", { cache: "no-store" });
      const payload = await response.json() as HandoffResponse;
      if (!response.ok) throw new Error(payload.error || "상담전환 큐를 불러오지 못했습니다.");
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

  const selected = data?.tasks.find((task) => task.id === selectedId) || null;
  useEffect(() => {
    setAssigneeUserId(selected?.assigneeUserId || "");
    setSlaMinutes(String(selected?.slaMinutes || (selected?.riskLevel === "high" || selected?.leadStage === "urgent" ? 120 : 1440)));
    setNote("");
  }, [selected?.assigneeUserId, selected?.id, selected?.leadStage, selected?.riskLevel, selected?.slaMinutes]);

  const selectedAssignee = data?.assignees.find((item) => item.id === assigneeUserId) || null;

  const filtered = useMemo(() => {
    const tasks = data?.tasks || [];
    if (tab === "active") return tasks.filter((task) => ACTIVE.has(task.status));
    if (tab === "urgent") return tasks.filter((task) => ACTIVE.has(task.status) && (task.riskLevel === "high" || task.leadStage === "urgent"));
    if (tab === "unassigned") return tasks.filter((task) => ACTIVE.has(task.status) && !task.assignee);
    if (tab === "closed") return tasks.filter((task) => ["resolved", "closed", "duplicate"].includes(task.status));
    return tasks;
  }, [data?.tasks, tab]);

  const updateTask = async (action: HandoffAction) => {
    if (!selected) return;
    setUpdating(true);
    setError(null);
    try {
      const response = await adminFetch("/api/admin/handoffs", {
        method: "PATCH",
        body: JSON.stringify({
          id: selected.id,
          action,
          assignee: selected.assignee,
          assigneeUserId: action === "assign" ? assigneeUserId : undefined,
          organizationId: action === "assign" ? selectedAssignee?.organizationId : undefined,
          slaMinutes: action === "assign" ? Number(slaMinutes) : undefined,
          slaPolicy: action === "assign" ? "kaxi-handoff-v1" : undefined,
          note,
        }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "상담전환 상태 변경에 실패했습니다.");
      await load();
      setNote("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">상담전환</h1>
          <p className="text-sm text-muted-foreground">AI가 분류한 고위험·추가확인 요청을 담당자에게 배정하고 처리 상태를 기록합니다.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          새로고침
        </Button>
      </div>

      {error && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">처리 대기</CardTitle></CardHeader><CardContent className="flex items-end justify-between"><span className="text-2xl font-semibold">{data?.counts.active ?? 0}</span><Clock3 className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">긴급</CardTitle></CardHeader><CardContent className="flex items-end justify-between"><span className="text-2xl font-semibold">{data?.counts.urgent ?? 0}</span><Headphones className="h-5 w-5 text-destructive" /></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">미배정</CardTitle></CardHeader><CardContent className="flex items-end justify-between"><span className="text-2xl font-semibold">{data?.counts.unassigned ?? 0}</span><UserRoundCheck className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">연락 가능</CardTitle></CardHeader><CardContent className="flex items-end justify-between"><span className="text-2xl font-semibold">{data?.counts.contactReady ?? 0}</span><Phone className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">SLA 초과</CardTitle></CardHeader><CardContent className="flex items-end justify-between"><span className="text-2xl font-semibold">{data?.counts.overdue ?? 0}</span><Clock3 className="h-5 w-5 text-destructive" /></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="active">처리 대기</TabsTrigger>
          <TabsTrigger value="urgent">긴급</TabsTrigger>
          <TabsTrigger value="unassigned">미배정</TabsTrigger>
          <TabsTrigger value="closed">완료</TabsTrigger>
          <TabsTrigger value="all">전체</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          {loading && !data ? (
            <p className="py-14 text-center text-sm text-muted-foreground">상담전환 큐를 불러오는 중...</p>
          ) : filtered.length === 0 ? (
            <p className="py-14 text-center text-sm text-muted-foreground">이 상태의 상담전환 요청이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] text-sm">
                <thead><tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground"><th className="px-4 py-3 font-medium">위험</th><th className="px-3 py-3 font-medium">상태</th><th className="px-3 py-3 font-medium">질문</th><th className="px-3 py-3 font-medium">연락처</th><th className="px-3 py-3 font-medium">담당자</th><th className="px-3 py-3 font-medium">SLA</th><th className="px-3 py-3 font-medium">접수</th><th className="px-4 py-3 font-medium"><span className="sr-only">상세</span></th></tr></thead>
                <tbody>
                  {filtered.map((task) => (
                    <tr key={task.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3"><Badge variant={riskVariant(task.riskLevel)}>{task.riskLevel}</Badge></td>
                      <td className="px-3 py-3"><Badge variant="outline">{STATUS_LABELS[task.status] || task.status}</Badge></td>
                      <td className="max-w-md px-3 py-3"><p className="truncate font-medium">{task.question || "질문 없음"}</p><p className="mt-1 text-xs text-muted-foreground">{task.source} · {task.locale} · #{task.id}</p></td>
                      <td className="px-3 py-3 text-xs">{task.hasContact ? <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />수신</span> : <span className="text-muted-foreground">대기</span>}</td>
                      <td className="px-3 py-3 text-xs">{task.assignee || "미배정"}</td>
                      <td className="px-3 py-3 text-xs"><Badge variant={task.slaStatus === "overdue" || task.slaStatus === "breached" ? "destructive" : "outline"}>{slaLabel(task)}</Badge></td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">{formatDate(task.createdAt)}</td>
                      <td className="px-4 py-3 text-right"><Button variant="ghost" size="sm" onClick={() => setSelectedId(task.id)}>자세히</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader className="border-b">
                <div className="flex flex-wrap items-center gap-2 pr-8"><Badge variant={riskVariant(selected.riskLevel)}>{selected.riskLevel}</Badge><Badge variant="outline">{STATUS_LABELS[selected.status] || selected.status}</Badge></div>
                <SheetTitle>상담전환 #{selected.id}</SheetTitle>
                <SheetDescription>{selected.source} · {selected.locale} · {formatDate(selected.createdAt)}</SheetDescription>
              </SheetHeader>

              <div className="space-y-5 px-4 pb-6">
                <section><h2 className="mb-2 text-sm font-semibold">사용자 질문</h2><p className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm leading-relaxed">{selected.question || "질문 없음"}</p></section>
                <section><h2 className="mb-2 text-sm font-semibold">AI 답변</h2><p className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-sm leading-relaxed">{selected.answer || "답변 없음"}</p></section>
                {selected.sources.length > 0 && <section><h2 className="mb-2 text-sm font-semibold">근거 출처</h2><div className="space-y-1">{selected.sources.map((source, index) => source.sourceUrl ? <a key={`${source.sourceUrl}-${index}`} href={source.sourceUrl} target="_blank" rel="noreferrer" className="block truncate text-sm text-primary underline underline-offset-2">{source.title || source.source || source.sourceUrl}</a> : null)}</div></section>}
                <section><h2 className="mb-2 text-sm font-semibold">연락 정보</h2>{selected.hasContact ? <div className="rounded-md border p-3 text-sm"><p className="font-medium">{selected.contactName || "이름 미입력"}</p>{contactHref(selected) ? <a href={contactHref(selected)} className="mt-1 inline-flex items-center gap-1.5 text-primary underline underline-offset-2">{selected.contactType === "email" ? <Mail className="h-4 w-4" /> : <Phone className="h-4 w-4" />}{selected.contactValue}</a> : <p className="mt-1 text-muted-foreground">{selected.contactValue}</p>}<div className="mt-3 border-t pt-3 text-xs text-muted-foreground">{selected.consentAcceptedAt ? <><p className="font-medium text-emerald-700">상담 연락처 수집 동의 확인</p><p className="mt-1">{selected.consentNoticeVersion} · {formatDate(selected.consentAcceptedAt)}</p></> : <p className="text-amber-700">동의 증거를 확인할 수 없습니다.</p>}</div></div> : <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">아직 연락처를 받지 않았습니다.</p>}</section>
                {selected.notes && <section><h2 className="mb-2 text-sm font-semibold">기존 메모</h2><p className="whitespace-pre-wrap text-sm text-muted-foreground">{selected.notes}</p></section>}
                <section><h2 className="mb-2 text-sm font-semibold">담당 및 SLA</h2><div className="grid gap-2 rounded-md border p-3 text-sm sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">담당자</p><p className="mt-1 font-medium">{selected.assignee || "미배정"}</p></div><div><p className="text-xs text-muted-foreground">응답 기한</p><p className="mt-1 font-medium">{slaLabel(selected)}</p></div></div></section>

                {canManageOps && (
                  <section className="space-y-3 border-t pt-4">
                    <div><label htmlFor="handoff-assignee" className="mb-1.5 block text-sm font-medium">담당자</label><Select value={assigneeUserId} onValueChange={setAssigneeUserId}><SelectTrigger id="handoff-assignee"><SelectValue placeholder="파트너 담당자를 선택하세요" /></SelectTrigger><SelectContent>{data?.assignees.map((item) => <SelectItem key={item.id} value={item.id}>{item.email || item.id} · {item.organizationName}</SelectItem>)}</SelectContent></Select></div>
                    <div><label htmlFor="handoff-sla" className="mb-1.5 block text-sm font-medium">첫 응답 SLA</label><Select value={slaMinutes} onValueChange={setSlaMinutes}><SelectTrigger id="handoff-sla"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="120">긴급 · 2시간</SelectItem><SelectItem value="1440">표준 · 24시간</SelectItem></SelectContent></Select></div>
                    <div><label htmlFor="handoff-note" className="mb-1.5 block text-sm font-medium">처리 메모</label><Textarea id="handoff-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="처리 결과나 후속 조치를 기록하세요." rows={3} /></div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => void updateTask("assign")} disabled={updating || !assigneeUserId}>배정</Button>
                      <Button variant="outline" onClick={() => void updateTask("start")} disabled={updating}>처리 시작</Button>
                      <Button variant="outline" onClick={() => void updateTask("contacted")} disabled={updating || !selected.hasContact}><MessageSquareText className="h-4 w-4" />연락 완료</Button>
                      {ACTIVE.has(selected.status) ? <Button onClick={() => void updateTask("resolve")} disabled={updating}><CheckCircle2 className="h-4 w-4" />해결</Button> : <Button onClick={() => void updateTask("reopen")} disabled={updating}>다시 열기</Button>}
                      <Button variant="ghost" onClick={() => void updateTask("close")} disabled={updating}>종료</Button>
                    </div>
                  </section>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
