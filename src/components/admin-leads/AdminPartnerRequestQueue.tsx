"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Loader2, RefreshCw, Users } from "lucide-react";
import { useAdminApi } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PartnerAgentOption {
  id: string;
  email: string | null;
}

interface PartnerOrganizationOption {
  id: string;
  name: string;
  users: PartnerAgentOption[];
}

interface PartnerRequestRow {
  id: string;
  createdAt: string;
  partnerType: string;
  question: string | null;
  status: string;
  lead: {
    nickname: string;
    nationality: string;
    contact: string | null;
    contactType: string | null;
  };
  organization: { id: string; name: string } | null;
  assignedUser: { id: string; email: string | null } | null;
}

interface QueuePayload {
  requests: PartnerRequestRow[];
  organizations: PartnerOrganizationOption[];
}

export function AdminPartnerRequestQueue() {
  const { adminFetch, canManageOps } = useAdminApi();
  const [payload, setPayload] = useState<QueuePayload>({ requests: [], organizations: [] });
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [organizationByRequest, setOrganizationByRequest] = useState<Record<string, string>>({});
  const [agentByRequest, setAgentByRequest] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminFetch("/api/admin/partner-requests", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "상담 요청을 불러오지 못했습니다.");
      setPayload(data as QueuePayload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "상담 요청을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  const openRequests = useMemo(
    () => payload.requests.filter((request) => request.status !== "closed"),
    [payload.requests],
  );

  const assign = async (requestId: string) => {
    const organizationId = organizationByRequest[requestId];
    if (!organizationId || !canManageOps) return;
    setSavingId(requestId);
    setError(null);
    try {
      const response = await adminFetch("/api/admin/partner-requests", {
        method: "PATCH",
        body: JSON.stringify({
          requestId,
          organizationId,
          assignedUserId: agentByRequest[requestId] || null,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "파트너 배정에 실패했습니다.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "파트너 배정에 실패했습니다.");
    } finally {
      setSavingId(null);
    }
  };

  const transition = async (requestId: string, status: "contacted" | "closed") => {
    if (!canManageOps) return;
    setSavingId(requestId);
    setError(null);
    try {
      const response = await adminFetch(`/api/partner-requests/${requestId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "상태 변경에 실패했습니다.");
      await load();
    } catch (transitionError) {
      setError(transitionError instanceof Error ? transitionError.message : "상태 변경에 실패했습니다.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-4 w-4" />
              상담 인입 큐
              <Badge variant="secondary">{openRequests.length}</Badge>
            </CardTitle>
            <CardDescription>진단·AI에서 접수된 동의 완료 상담 요청을 파트너 사무소에 배정합니다.</CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={() => void load()} disabled={loading} aria-label="상담 요청 새로고침">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
        {loading && payload.requests.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />불러오는 중</div>
        ) : openRequests.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">대기 중인 상담 요청이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {openRequests.map((request) => {
              const organizationId = organizationByRequest[request.id] || "";
              const organization = payload.organizations.find((item) => item.id === organizationId);
              return (
                <div key={request.id} className="grid gap-3 rounded-md border p-3 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,0.55fr)]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{request.lead.nickname}</p>
                      <Badge variant="outline">{request.partnerType}</Badge>
                      <Badge variant={request.status === "accepted" ? "default" : "secondary"}>{request.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{request.lead.nationality.toUpperCase()} · {new Date(request.createdAt).toLocaleString("ko-KR")}</p>
                    {request.question && <p className="mt-2 whitespace-pre-wrap text-sm">{request.question}</p>}
                    {request.lead.contact && <p className="mt-2 text-xs text-muted-foreground">연락처: {request.lead.contact}</p>}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {request.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void transition(request.id, "contacted")}
                          disabled={savingId === request.id || !canManageOps}
                        >
                          {savingId === request.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                          연락함
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void transition(request.id, "closed")}
                        disabled={savingId === request.id || !canManageOps}
                      >
                        {savingId === request.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        종결
                      </Button>
                    </div>
                  </div>
                  {request.organization ? (
                    <div className="rounded-md bg-muted/40 p-3 text-sm">
                      <p className="font-medium">{request.organization.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{request.assignedUser?.email || "사무소 공용 큐"}</p>
                    </div>
                  ) : (
                    <div className="grid content-start gap-2">
                      <Select value={organizationId} onValueChange={(value) => {
                        setOrganizationByRequest((current) => ({ ...current, [request.id]: value }));
                        setAgentByRequest((current) => ({ ...current, [request.id]: "" }));
                      }}>
                        <SelectTrigger><SelectValue placeholder="파트너 사무소 선택" /></SelectTrigger>
                        <SelectContent>
                          {payload.organizations.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select
                        value={agentByRequest[request.id] || "office"}
                        onValueChange={(value) => setAgentByRequest((current) => ({ ...current, [request.id]: value === "office" ? "" : value }))}
                        disabled={!organization}
                      >
                        <SelectTrigger><SelectValue placeholder="담당자 선택" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="office">사무소 공용 큐</SelectItem>
                          {(organization?.users || []).map((agent) => <SelectItem key={agent.id} value={agent.id}>{agent.email || agent.id}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button onClick={() => void assign(request.id)} disabled={!organizationId || savingId === request.id || !canManageOps}>
                        {savingId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                        배정
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
