"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useKaxiSession } from "@/hooks/useKaxiSession";
import { defaultLocale, isLocale } from "@/i18n/routing";
import { useLeadStore } from "@/store/kbridge";
import type { AdminLead, AdminOpsStatus, Stats } from "./types";

export function useAdminDashboard() {
  const activeLocale = useLocale();
  const locale = isLocale(activeLocale) ? activeLocale : defaultLocale;
  const { data: session, status } = useKaxiSession();
  const isSessionAdmin = session?.user?.role === "PLATFORM_ADMIN";
  const { leads, fetchLeads, loading } = useLeadStore();
  const [authError, setAuthError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [opsStatus, setOpsStatus] = useState<AdminOpsStatus | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const hasAdminAccess = isSessionAdmin;

  const loadAll = useCallback(async () => {
    if (!hasAdminAccess) return;
    setAuthError(null);
    await Promise.all([
      fetchLeads(),
      (async () => {
        setStatsLoading(true);
        try {
          const res = await fetch("/api/stats");
          if (res.status === 401 || res.status === 503) {
            setAuthError(locale === "ko" ? "관리자 키를 확인하세요." : "Check the admin key.");
            setStats(null);
            return;
          }
          if (res.ok) setStats(await res.json());
        } catch (error) {
          console.error("[stats]", error);
        } finally {
          setStatsLoading(false);
        }
      })(),
      (async () => {
        try {
          const res = await fetch("/api/admin/ops");
          if (res.ok) setOpsStatus(await res.json());
        } catch (error) {
          console.error("[admin ops]", error);
        }
      })(),
    ]);
  }, [fetchLeads, hasAdminAccess, locale]);

  useEffect(() => {
    if (hasAdminAccess) loadAll();
  }, [hasAdminAccess, loadAll]);

  const filteredLeads = leads.filter((lead) =>
    !query ||
    lead.nickname.toLowerCase().includes(query.toLowerCase()) ||
    lead.nationality.toLowerCase().includes(query.toLowerCase()),
  );
  const selectedLead: AdminLead | undefined = leads.find((lead) => lead.id === selectedId);

  return {
    authError,
    filteredLeads,
    hasAdminAccess,
    leads,
    loading,
    locale,
    opsStatus,
    query,
    selectedLead,
    sessionStatus: status,
    setQuery,
    setSelectedId,
    stats,
    statsLoading,
    loadAll,
  };
}
