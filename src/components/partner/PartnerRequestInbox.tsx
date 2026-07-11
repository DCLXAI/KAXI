"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, RefreshCw, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Lang } from "@/lib/i18n/translations";
import { workspaceCopy, workspaceDateLocale, workspaceStatusLabel } from "@/lib/i18n/workspace";

interface InboxRequest {
  id: string;
  createdAt: string;
  matchedAt: string | null;
  partnerType: string;
  question: string | null;
  status: string;
  lead: {
    nickname: string;
    nationality: string;
    contact: string | null;
  };
  assignedUser: { email: string | null } | null;
}

export function PartnerRequestInbox({ locale }: { locale: Lang }) {
  const copy = workspaceCopy[locale];
  const [requests, setRequests] = useState<InboxRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/partner/requests", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "request_load_failed");
      setRequests(data.requests || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "request_load_failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (requestId: string, action: "accept" | "close") => {
    setActionId(requestId);
    setError(null);
    try {
      const response = await fetch("/api/partner/requests", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "request_update_failed");
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "request_update_failed");
    } finally {
      setActionId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{copy.consultationRequests}</CardTitle>
            <CardDescription>{requests.length}</CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={() => void load()} disabled={loading} aria-label={copy.open}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
        {loading && requests.length === 0 ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : requests.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{copy.noNotifications}</p>
        ) : requests.map((request) => (
          <div key={request.id} className="grid gap-3 rounded-md border p-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{request.lead.nickname}</p>
                <Badge variant="outline">{request.partnerType}</Badge>
                <Badge variant={request.status === "accepted" ? "default" : "secondary"}>{workspaceStatusLabel(request.status, locale)}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {request.lead.nationality.toUpperCase()} · {new Intl.DateTimeFormat(workspaceDateLocale[locale]).format(new Date(request.matchedAt || request.createdAt))}
              </p>
              {request.question && <p className="mt-2 whitespace-pre-wrap text-sm">{request.question}</p>}
              {request.lead.contact && <p className="mt-2 text-xs text-muted-foreground">{copy.contact}: {request.lead.contact}</p>}
            </div>
            <div className="flex items-start gap-2">
              {request.status === "matched" && (
                <Button size="sm" onClick={() => void act(request.id, "accept")} disabled={actionId === request.id}>
                  {actionId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {copy.accept}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => void act(request.id, "close")} disabled={actionId === request.id}>
                <X className="h-4 w-4" />{copy.close}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
