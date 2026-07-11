"use client";

import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminAuthGate } from "./AdminAuthGate";
import { AdminLeadDetailModal } from "./AdminLeadDetailModal";
import { AdminLeadTable } from "./AdminLeadTable";
import { AdminNationalityCard } from "./AdminNationalityCard";
import { AdminPartnerRequestQueue } from "./AdminPartnerRequestQueue";
import { AdminStatsCards } from "./AdminStatsCards";
import { useAdminDashboard } from "./useAdminDashboard";

export function AdminDashboard() {
  const t = useTranslations();
  const dashboard = useAdminDashboard();

  if (!dashboard.hasAdminAccess) {
    return (
      <AdminAuthGate
        locale={dashboard.locale}
        sessionStatus={dashboard.sessionStatus}
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold">{t("admin_title")}</h1>
          <p className="text-muted-foreground mt-2">{t("admin_subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={dashboard.loadAll} disabled={dashboard.loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${dashboard.loading ? "animate-spin" : ""}`} />
          {dashboard.locale === "ko" ? "새로고침" : dashboard.locale === "vi" ? "Tải lại" : dashboard.locale === "mn" ? "Шинэчлэх" : "Refresh"}
        </Button>
      </div>

      {dashboard.authError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {dashboard.authError}
        </div>
      )}

      {dashboard.stats && <AdminStatsCards locale={dashboard.locale} stats={dashboard.stats} />}
      {dashboard.stats && <AdminNationalityCard locale={dashboard.locale} stats={dashboard.stats} />}

      <AdminPartnerRequestQueue />

      <AdminLeadTable
        leads={dashboard.filteredLeads}
        loading={dashboard.loading}
        locale={dashboard.locale}
        onQueryChange={dashboard.setQuery}
        onSelect={dashboard.setSelectedId}
        query={dashboard.query}
        totalLeads={dashboard.leads.length}
      />

      <AdminLeadDetailModal
        lead={dashboard.selectedLead}
        locale={dashboard.locale}
        onClose={() => dashboard.setSelectedId(null)}
      />
    </div>
  );
}
