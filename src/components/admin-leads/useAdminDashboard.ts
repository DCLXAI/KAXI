"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { defaultLocale, isLocale } from "@/i18n/routing";
import { useLeadStore } from "@/store/kbridge";
import type { AdminLead, AdminOpsStatus, Stats } from "./types";

export function useAdminDashboard() {
  const activeLocale = useLocale();
  const locale = isLocale(activeLocale) ? activeLocale : defaultLocale;
  const { data: session, status } = useSession();
  const isSessionAdmin = ["owner", "admin", "viewer"].includes(session?.user?.role || "");
  const { leads, fetchLeads, loading } = useLeadStore();
  const [adminKey, setAdminKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [opsStatus, setOpsStatus] = useState<AdminOpsStatus | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const hasAdminAccess = isSessionAdmin || Boolean(adminKey);

  const loadAll = useCallback(async () => {
    if (!hasAdminAccess) return;
    setAuthError(null);
    const headers = adminKey ? { "x-admin-key": adminKey } : undefined;
    await Promise.all([
      fetchLeads(adminKey || undefined),
      (async () => {
        setStatsLoading(true);
        try {
          const res = await fetch("/api/stats", { headers });
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
          const res = await fetch("/api/admin/ops", { headers });
          if (res.ok) setOpsStatus(await res.json());
        } catch (error) {
          console.error("[admin ops]", error);
        }
      })(),
    ]);
  }, [adminKey, fetchLeads, hasAdminAccess, locale]);

  useEffect(() => {
    if (hasAdminAccess) loadAll();
  }, [hasAdminAccess, loadAll]);

  const unlock = () => {
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    setAdminKey(trimmed);
  };

  const filteredLeads = leads.filter((lead) =>
    !query ||
    lead.nickname.toLowerCase().includes(query.toLowerCase()) ||
    lead.nationality.toLowerCase().includes(query.toLowerCase()),
  );
  const selectedLead: AdminLead | undefined = leads.find((lead) => lead.id === selectedId);

  return {
    adminKey,
    authError,
    filteredLeads,
    hasAdminAccess,
    keyInput,
    leads,
    loading,
    locale,
    opsStatus,
    query,
    selectedLead,
    sessionStatus: status,
    setKeyInput,
    setQuery,
    setSelectedId,
    stats,
    statsLoading,
    unlock,
    loadAll,
  };
}
