"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useKaxiSession } from "@/hooks/useKaxiSession";
import { defaultLocale, isLocale } from "@/i18n/routing";
import { useLeadStore } from "@/store/kbridge";
import type { AdminLead, Stats } from "./types";

export function useAdminDashboard(initialData?: { leads: AdminLead[]; stats: Stats } | null) {
  const activeLocale = useLocale();
  const locale = isLocale(activeLocale) ? activeLocale : defaultLocale;
  const { data: session, status } = useKaxiSession();
  const isSessionAdmin = session?.user?.role === "PLATFORM_ADMIN";
  const { leads: fetchedLeads, fetchLeads, loading } = useLeadStore();
  const leads = fetchedLeads.length > 0 ? fetchedLeads : initialData?.leads || [];
  const [authError, setAuthError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(initialData?.stats || null);
  const [statsLoading, setStatsLoading] = useState(false);
  const initialPending = useRef(Boolean(initialData));
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
    ]);
  }, [fetchLeads, hasAdminAccess, locale]);

  useEffect(() => {
    if (!hasAdminAccess) return;
    if (initialPending.current) {
      initialPending.current = false;
      return;
    }
    void loadAll();
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
