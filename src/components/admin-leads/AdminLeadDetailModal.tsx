"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/i18n/routing";
import { documentLabel, goalLabel, partnerLabel, pathLabel } from "./i18n";
import type { AdminLead } from "./types";

interface AdminLeadDetailModalProps {
  lead: AdminLead | undefined;
  locale: Locale;
  onClose: () => void;
}

export function AdminLeadDetailModal({ lead, locale, onClose }: AdminLeadDetailModalProps) {
  const t = useTranslations();
  if (!lead) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <Card className="w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(event) => event.stopPropagation()}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{lead.nickname}</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
          </div>
          <CardDescription>{new Date(lead.createdAt).toLocaleString()} · {lead.nationality.toUpperCase()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-muted-foreground">{t("diagnose_q_goal")}</div>
              <div className="font-medium">{goalLabel(t, lead.goal)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t("result_recommended")}</div>
              <div className="font-medium">{pathLabel(t, lead.pathKey)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t("diagnose_q_budget")}</div>
              <div className="font-medium font-mono">{lead.budget.toLocaleString()}₩</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t("diagnose_q_broker")}</div>
              <div className="font-medium">
                {lead.usingBroker ? `${t("yes")} (${lead.brokerCost.toLocaleString()}₩)` : t("no")}
              </div>
            </div>
          </div>

          {lead.requiredDocs && lead.requiredDocs.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t("result_required_docs")}</div>
              <div className="flex flex-wrap gap-1">
                {lead.requiredDocs.map((key) => (
                  <Badge key={key} variant="outline" className="text-xs">{documentLabel(t, key)}</Badge>
                ))}
              </div>
            </div>
          )}

          {lead.warnings && lead.warnings.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t("result_warnings")}</div>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                {lead.warnings.map((warning, index) => (
                  <li key={index}>{warning[locale]}</li>
                ))}
              </ul>
            </div>
          )}

          {lead.partnerRequests && lead.partnerRequests.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t("partners_title")}</div>
              <div className="flex flex-wrap gap-1">
                {lead.partnerRequests.map((request) => (
                  <Badge key={request.id} variant="outline" className="text-xs">
                    {partnerLabel(t, request.partnerType)} · {request.status}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
