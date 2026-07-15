"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageSquareText, PlayCircle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Lang } from "@/lib/i18n/translations";
import { tr } from "@/lib/i18n/translations";
import { workspaceCopy, workspaceDateLocale } from "@/lib/i18n/workspace";

// This is the whitelisted partner-safe shape returned by
// GET /api/partner/handoffs (see serializePartnerHandoffTask in
// src/lib/handoffs/partner.ts) -- it deliberately has no contact value/name
// and no RAG verdict/retrieval internals. hasContact is a plain boolean, not
// a PII value, so the "mark contacted" action can still be gated on it.
interface PartnerHandoffTask {
  id: string;
  question: string;
  riskLevel: string;
  status: string;
  slaDueAt: string | null;
  slaStatus: string | null;
  hasContact: boolean;
  createdAt: string;
}

function riskVariant(risk: string) {
  return risk === "high" ? ("destructive" as const) : risk === "medium" ? ("outline" as const) : ("secondary" as const);
}

export function PartnerHandoffInbox({ locale }: { locale: Lang }) {
  const copy = workspaceCopy[locale];
  const [tasks, setTasks] = useState<PartnerHandoffTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/partner/handoffs", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "handoff_load_failed");
      setTasks(data.tasks || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "handoff_load_failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (id: string, action: "start" | "contacted") => {
    setActionId(id);
    setError(null);
    try {
      const response = await fetch("/api/partner/handoffs", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "handoff_update_failed");
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "handoff_update_failed");
    } finally {
      setActionId(null);
    }
  };

  const slaLabel = (task: PartnerHandoffTask) => {
    if (!task.slaDueAt) return tr("handoff_sla_unset", locale);
    if (task.slaStatus === "overdue" || task.slaStatus === "breached") return tr("handoff_sla_overdue", locale);
    if (task.slaStatus === "met") return tr("handoff_sla_met", locale);
    return `${new Intl.DateTimeFormat(workspaceDateLocale[locale], { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(task.slaDueAt))} ${tr("handoff_sla_due_by", locale)}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{tr("partner_handoff_inbox", locale)}</CardTitle>
            <CardDescription>{tasks.length}</CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={() => void load()} disabled={loading} aria-label={copy.open}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
        {loading && tasks.length === 0 ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : tasks.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{copy.noNotifications}</p>
        ) : tasks.map((task) => (
          <div key={task.id} className="grid gap-3 rounded-md border p-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={riskVariant(task.riskLevel)}>{tr("handoff_risk_level", locale)}: {task.riskLevel}</Badge>
                <Badge variant={task.slaStatus === "overdue" || task.slaStatus === "breached" ? "destructive" : "outline"}>
                  {slaLabel(task)}
                </Badge>
              </div>
              {task.question && <p className="mt-2 whitespace-pre-wrap text-sm">{task.question}</p>}
              <p className="mt-2 text-xs text-muted-foreground">
                {new Intl.DateTimeFormat(workspaceDateLocale[locale]).format(new Date(task.createdAt))}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {task.hasContact ? tr("handoff_contact_on_file", locale) : tr("handoff_no_contact_yet", locale)}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Button size="sm" variant="outline" onClick={() => void act(task.id, "start")} disabled={actionId === task.id}>
                {actionId === task.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                {tr("handoff_start", locale)}
              </Button>
              <Button size="sm" variant="outline" onClick={() => void act(task.id, "contacted")} disabled={actionId === task.id || !task.hasContact}>
                {actionId === task.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquareText className="h-4 w-4" />}
                {tr("handoff_contacted", locale)}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
