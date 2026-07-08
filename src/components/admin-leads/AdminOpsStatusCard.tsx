"use client";

import { Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/i18n/routing";
import type { AdminBackendStatus, AdminOpsStatus } from "./types";

interface AdminOpsStatusCardProps {
  locale: Locale;
  opsStatus: AdminOpsStatus;
}

function BackendPanel({ item, label }: { item: AdminBackendStatus; label: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{label}</span>
        <Badge variant={item.ready ? "default" : "destructive"} className="text-[10px]">
          {item.ready ? "ready" : "check"}
        </Badge>
      </div>
      <div className="mt-2 space-y-1 text-muted-foreground">
        <div>backend: <span className="font-mono text-foreground">{item.backend}</span></div>
        <div>require LLM: {item.requireLlm ? "yes" : "no"}</div>
        <div>fallback: {item.fallbackAllowed ? "allowed" : "blocked"}</div>
        <div>decisions: {item.decisionTable.filter((step) => step.outcome === "selected").length}</div>
      </div>
    </div>
  );
}

export function AdminOpsStatusCard({ locale, opsStatus }: AdminOpsStatusCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Bot className="h-4 w-4" />
          {locale === "ko" ? "AI 백엔드 운영 상태" : "AI backend operations"}
        </CardTitle>
        <CardDescription>{opsStatus.readiness.environment} · {opsStatus.readiness.status}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-xs md:grid-cols-3">
        <BackendPanel label="Agent" item={opsStatus.aiBackend.agent} />
        <BackendPanel label="Consult" item={opsStatus.aiBackend.consult} />
        <div className="rounded-md border p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{locale === "ko" ? "정책 체크" : "Policy check"}</span>
            <Badge variant={opsStatus.aiBackend.issues.length > 0 ? "destructive" : "outline"} className="text-[10px]">
              {opsStatus.aiBackend.issues.length} issues
            </Badge>
          </div>
          <div className="mt-2 space-y-1 text-muted-foreground">
            <div>warnings: {opsStatus.aiBackend.warnings.length}</div>
            <div className="line-clamp-3">
              {opsStatus.readiness.aiBackendPolicyCheck?.detail || "AI backend policy check unavailable"}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
