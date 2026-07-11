"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useKaxiSession } from "@/hooks/useKaxiSession";
import { defaultLocale, isLocale } from "@/i18n/routing";
import type { ChatlogAnalysis, Suggestion, Synonym } from "./types";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Failed";
}

export function useSynonymsAdmin() {
  const activeLocale = useLocale();
  const locale = isLocale(activeLocale) ? activeLocale : defaultLocale;
  const { data: session, status } = useKaxiSession();
  const isSessionAdmin = session?.user?.role === "PLATFORM_ADMIN" && session.currentAal === "aal2";
  const [synonyms, setSynonyms] = useState<Synonym[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [origin, setOrigin] = useState("all");
  const [analysis, setAnalysis] = useState<ChatlogAnalysis | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newSource, setNewSource] = useState("");
  const [newTargets, setNewTargets] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const hasAdminAccess = isSessionAdmin;

  const fetchSynonyms = useCallback(async () => {
    if (!hasAdminAccess) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);
      if (origin !== "all") params.set("origin", origin);
      if (query) params.set("q", query);
      const res = await fetch(`/api/synonyms?${params}`);
      if (res.status === 401 || res.status === 503) throw new Error("관리자 키를 확인하세요");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setSynonyms(data.synonyms);
    } catch (error) {
      console.error(error);
      setError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [category, hasAdminAccess, origin, query]);

  const fetchAnalysis = useCallback(async () => {
    if (!hasAdminAccess) return;
    try {
      const res = await fetch("/api/chatlog/analyze?days=30");
      if (!res.ok) return;
      setAnalysis(await res.json());
    } catch (error) {
      console.error(error);
    }
  }, [hasAdminAccess]);

  useEffect(() => {
    fetchSynonyms();
    fetchAnalysis();
  }, [fetchSynonyms, fetchAnalysis]);

  const refresh = () => {
    fetchSynonyms();
    fetchAnalysis();
  };

  const toggleEnabled = async (id: string, current: boolean) => {
    try {
      await fetch(`/api/synonyms/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !current }),
      });
      fetchSynonyms();
    } catch (error) {
      console.error(error);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    try {
      await fetch(`/api/synonyms/${id}`, { method: "DELETE" });
      fetchSynonyms();
    } catch (error) {
      console.error(error);
    }
  };

  const add = async () => {
    setError(null);
    if (!newSource.trim() || !newTargets.trim()) {
      setError("source와 targets을 입력하세요");
      return;
    }
    try {
      const targets = newTargets.split(",").map((item) => item.trim()).filter(Boolean);
      const res = await fetch("/api/synonyms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: newSource.trim(), targets, category: newCategory, origin: "manual" }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed");
      }
      setSuccess(`"${newSource}" 동의어 추가됨`);
      setNewSource("");
      setNewTargets("");
      setShowAdd(false);
      setTimeout(() => setSuccess(null), 2500);
      fetchSynonyms();
    } catch (error) {
      setError(errorMessage(error));
    }
  };

  const suggestFromChatlog = async () => {
    setSuggesting(true);
    setError(null);
    try {
      const res = await fetch("/api/synonyms/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 30, topN: 15 }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setSuggestions(data.suggestions || []);
      if (!data.suggestions?.length) setError("추천할 동의어가 없습니다 (ChatLog 부족 또는 이미 등록됨)");
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setSuggesting(false);
    }
  };

  const acceptSuggestion = async (suggestion: Suggestion) => {
    try {
      const res = await fetch("/api/synonyms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: suggestion.source,
          targets: suggestion.targets,
          category: suggestion.category,
          origin: "auto",
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed");
      }
      setSuggestions((current) => current.filter((item) => item.source !== suggestion.source));
      fetchSynonyms();
    } catch (error) {
      setError(errorMessage(error));
    }
  };

  return {
    acceptSuggestion,
    add,
    analysis,
    category,
    error,
    hasAdminAccess,
    loading,
    locale,
    newCategory,
    newSource,
    newTargets,
    origin,
    query,
    refresh,
    remove,
    sessionStatus: status,
    setCategory,
    setNewCategory,
    setNewSource,
    setNewTargets,
    setOrigin,
    setQuery,
    setShowAdd,
    showAdd,
    success,
    suggestFromChatlog,
    suggesting,
    suggestions,
    synonyms,
    toggleEnabled,
  };
}
