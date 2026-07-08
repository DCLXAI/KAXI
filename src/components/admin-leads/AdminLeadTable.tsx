"use client";

import { useTranslations } from "next-intl";
import { Eye, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Locale } from "@/i18n/routing";
import { goalLabel, pathLabel } from "./i18n";
import type { AdminLead } from "./types";

interface AdminLeadTableProps {
  leads: AdminLead[];
  loading: boolean;
  locale: Locale;
  onQueryChange: (value: string) => void;
  onSelect: (id: string) => void;
  query: string;
  totalLeads: number;
}

export function AdminLeadTable({
  leads,
  loading,
  locale,
  onQueryChange,
  onSelect,
  query,
  totalLeads,
}: AdminLeadTableProps) {
  const t = useTranslations();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">Leads ({totalLeads})</CardTitle>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search" value={query} onChange={(event) => onQueryChange(event.target.value)} className="pl-8 h-9" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && totalLeads === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {locale === "ko" ? "로딩 중..." : "Loading..."}
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">{t("admin_empty")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-2 font-medium">{t("admin_col_name")}</th>
                  <th className="py-2 pr-2 font-medium">{t("admin_col_nationality")}</th>
                  <th className="py-2 pr-2 font-medium">{t("admin_col_goal")}</th>
                  <th className="py-2 pr-2 font-medium">{t("admin_col_path")}</th>
                  <th className="py-2 pr-2 font-medium">{t("admin_col_budget")}</th>
                  <th className="py-2 pr-2 font-medium">{t("admin_col_broker")}</th>
                  <th className="py-2 pr-2 font-medium">{t("admin_col_created")}</th>
                  <th className="py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2 pr-2 font-medium">{lead.nickname}</td>
                    <td className="py-2 pr-2"><Badge variant="outline">{lead.nationality.toUpperCase()}</Badge></td>
                    <td className="py-2 pr-2 text-xs">{goalLabel(t, lead.goal)}</td>
                    <td className="py-2 pr-2 text-xs">{pathLabel(t, lead.pathKey)}</td>
                    <td className="py-2 pr-2 font-mono text-xs">{lead.budget.toLocaleString()}₩</td>
                    <td className="py-2 pr-2">
                      {lead.usingBroker ? (
                        <Badge variant="destructive" className="text-xs">
                          {lead.brokerCost > 0 ? `${lead.brokerCost.toLocaleString()}₩` : t("yes")}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-xs text-muted-foreground">{new Date(lead.createdAt).toLocaleDateString()}</td>
                    <td className="py-2 text-right">
                      <Button size="sm" variant="ghost" onClick={() => onSelect(lead.id)}>
                        <Eye className="h-3.5 w-3.5" />
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
  );
}
