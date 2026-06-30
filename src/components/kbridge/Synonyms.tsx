"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useLangStore } from "@/store/kbridge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plus, Trash2, Power, Search, RefreshCw, Sparkles, Loader2, BookOpen, AlertCircle } from "lucide-react";

interface Synonym {
  id: string;
  source: string;
  targets: string[];
  category: string;
  origin: string;
  enabled: boolean;
  autoMeta: { frequency?: number; confidence?: number; chatLogIds?: string[] } | null;
  createdAt: string;
}

interface Suggestion {
  source: string;
  targets: string[];
  category: string;
  confidence: number;
  reason: string;
}

interface ChatlogAnalysis {
  summary: {
    total: number;
    recent: number;
    byLang: { lang: string; _count: number }[];
    bySource: { source: string; _count: number }[];
    failedCount: number;
  };
  topWords: { word: string; count: number }[];
  failedCases: {
    id: string;
    question: string;
    lang: string;
    topDocId?: string;
    topVecScore?: number;
    topKwScore?: number;
  }[];
}

export function Synonyms() {
  const { lang } = useLangStore();
  const { data: session, status } = useSession();
  const isSessionAdmin = session?.user?.role === "admin";
  const [adminKey, setAdminKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [synonyms, setSynonyms] = useState<Synonym[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
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
  const authHeaders = useMemo(
    () => (adminKey ? { "x-admin-key": adminKey } : undefined),
    [adminKey]
  );
  const hasAdminAccess = isSessionAdmin || Boolean(adminKey);

  const fetchSynonyms = useCallback(async () => {
    if (!hasAdminAccess) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);
      if (origin !== "all") params.set("origin", origin);
      if (q) params.set("q", q);
      const res = await fetch(`/api/synonyms?${params}`, { headers: authHeaders });
      if (res.status === 401 || res.status === 503) throw new Error("관리자 키를 확인하세요");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setSynonyms(data.synonyms);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [authHeaders, category, hasAdminAccess, origin, q]);

  const fetchAnalysis = useCallback(async () => {
    if (!hasAdminAccess) return;
    try {
      const res = await fetch("/api/chatlog/analyze?days=30", { headers: authHeaders });
      if (!res.ok) return;
      const data = await res.json();
      setAnalysis(data);
    } catch (e) {
      console.error(e);
    }
  }, [authHeaders, hasAdminAccess]);

  useEffect(() => {
    fetchSynonyms();
    fetchAnalysis();
  }, [fetchSynonyms, fetchAnalysis]);

  const unlock = () => {
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    setAdminKey(trimmed);
  };

  const toggleEnabled = async (id: string, current: boolean) => {
    try {
      await fetch(`/api/synonyms/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ enabled: !current }),
      });
      fetchSynonyms();
    } catch (e) {
      console.error(e);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    try {
      await fetch(`/api/synonyms/${id}`, { method: "DELETE", headers: authHeaders });
      fetchSynonyms();
    } catch (e) {
      console.error(e);
    }
  };

  const add = async () => {
    setError(null);
    if (!newSource.trim() || !newTargets.trim()) {
      setError("source와 targets을 입력하세요");
      return;
    }
    try {
      const targets = newTargets
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await fetch("/api/synonyms", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          source: newSource.trim(),
          targets,
          category: newCategory,
          origin: "manual",
        }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Failed");
      }
      setSuccess(`"${newSource}" 동의어 추가됨`);
      setNewSource("");
      setNewTargets("");
      setShowAdd(false);
      setTimeout(() => setSuccess(null), 2500);
      fetchSynonyms();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const suggestFromChatlog = async () => {
    setSuggesting(true);
    setError(null);
    try {
      const res = await fetch("/api/synonyms/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ days: 30, topN: 15 }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setSuggestions(data.suggestions || []);
      if (!data.suggestions?.length) {
        setError("추천할 동의어가 없습니다 (ChatLog 부족 또는 이미 등록됨)");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSuggesting(false);
    }
  };

  const acceptSuggestion = async (s: Suggestion) => {
    try {
      const res = await fetch("/api/synonyms", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          source: s.source,
          targets: s.targets,
          category: s.category,
          origin: "auto",
        }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Failed");
      }
      setSuggestions((prev) => prev.filter((x) => x.source !== s.source));
      fetchSynonyms();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    !hasAdminAccess ? (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>{lang === "ko" ? "관리자 인증" : "Admin Access"}</CardTitle>
            <CardDescription>
              {status === "loading"
                ? lang === "ko" ? "세션 확인 중..." : "Checking session..."
                : lang === "ko" ? "세션 로그인을 권장합니다. API 키는 현재 화면에서만 임시 사용됩니다." : "Session login is preferred. API key fallback is kept only for this tab."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full" asChild>
              <a href="/login">{lang === "ko" ? "관리자 로그인" : "Admin Login"}</a>
            </Button>
            <Input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && unlock()}
              placeholder={lang === "ko" ? "임시 관리자 API 키" : "Temporary admin API key"}
              autoComplete="off"
            />
            <Button className="w-full" onClick={unlock}>
              {lang === "ko" ? "접속" : "Unlock"}
            </Button>
          </CardContent>
        </Card>
      </div>
    ) : (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold">
            {lang === "ko" ? "동의어 사전 관리" : "Synonym Dictionary"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {lang === "ko"
              ? "ChatLog 기반 학습 + 수동 관리. 검색 품질 향상을 위한 다국어 동의어 매핑."
              : "ChatLog-based + manual management. Multilingual synonym mapping for search quality."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchSynonyms(); fetchAnalysis(); }} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          {lang === "ko" ? "새로고침" : "Refresh"}
        </Button>
      </div>

      {/* ChatLog 분석 대시보드 */}
      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              {lang === "ko" ? "ChatLog 분석 (최근 30일)" : "ChatLog Analysis (30d)"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="rounded-lg bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">{lang === "ko" ? "총 대화" : "Total"}</div>
                <div className="text-xl font-bold mt-1">{analysis.summary.total}</div>
              </div>
              <div className="rounded-lg bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">{lang === "ko" ? "최근 30일" : "Recent 30d"}</div>
                <div className="text-xl font-bold mt-1">{analysis.summary.recent}</div>
              </div>
              <div className="rounded-lg bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">{lang === "ko" ? "검색 실패 의심" : "Failed (low vec)"}</div>
                <div className="text-xl font-bold mt-1 text-amber-600">{analysis.summary.failedCount}</div>
              </div>
              <div className="rounded-lg bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">{lang === "ko" ? "언어" : "Languages"}</div>
                <div className="text-xl font-bold mt-1">{analysis.summary.byLang.length}</div>
              </div>
            </div>

            {analysis.topWords.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-2">
                  {lang === "ko" ? "빈도 높은 단어 (동의어 후보)" : "Top words (synonym candidates)"}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.topWords.slice(0, 20).map((w) => (
                    <Badge key={w.word} variant="outline" className="text-xs">
                      {w.word} ({w.count})
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {analysis.failedCases.length > 0 && (
              <div className="mt-4">
                <div className="text-xs text-amber-700 mb-2 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {lang === "ko" ? "검색 품질 낮은 케이스 (vec < 0.5, kw = 0)" : "Low quality cases"}
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {analysis.failedCases.slice(0, 10).map((c) => (
                    <div key={c.id} className="text-xs bg-amber-50 border border-amber-200 rounded p-2">
                      <span className="font-mono text-[10px] text-muted-foreground">[{c.lang}]</span>{" "}
                      <span>{c.question}</span>
                      {c.topDocId && (
                        <span className="text-muted-foreground"> → {c.topDocId} (vec: {c.topVecScore?.toFixed(2)})</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* LLM 동의어 추천 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                {lang === "ko" ? "LLM 동의어 자동 추천" : "LLM Auto-Suggest"}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {lang === "ko"
                  ? "ChatLog에서 빈도 높은 단어를 LLM이 분석하여 동의어 후보 추천"
                  : "LLM analyzes high-frequency words from ChatLog"}
              </CardDescription>
            </div>
            <Button size="sm" onClick={suggestFromChatlog} disabled={suggesting}>
              {suggesting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
              {lang === "ko" ? "추천 받기" : "Suggest"}
            </Button>
          </div>
        </CardHeader>
        {suggestions.length > 0 && (
          <CardContent className="space-y-2">
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge>{s.source}</Badge>
                    <span className="text-xs text-muted-foreground">→</span>
                    <div className="flex flex-wrap gap-1">
                      {s.targets.map((t, j) => (
                        <Badge key={j} variant="outline" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                    <Badge variant="secondary" className="text-xs">{s.category}</Badge>
                    <Badge variant="outline" className="text-xs">
                      conf: {(s.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{s.reason}</div>
                </div>
                <Button size="sm" variant="default" onClick={() => acceptSuggestion(s)}>
                  {lang === "ko" ? "추가" : "Add"}
                </Button>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* 동의어 추가 폼 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {lang === "ko" ? "수동 추가" : "Manual Add"}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowAdd(!showAdd)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              {showAdd ? (lang === "ko" ? "취소" : "Cancel") : (lang === "ko" ? "추가" : "Add")}
            </Button>
          </div>
        </CardHeader>
        {showAdd && (
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Source (원본)</Label>
                <Input
                  placeholder="예: 돈"
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">general</SelectItem>
                    <SelectItem value="cost">cost</SelectItem>
                    <SelectItem value="visa">visa</SelectItem>
                    <SelectItem value="documents">documents</SelectItem>
                    <SelectItem value="school">school</SelectItem>
                    <SelectItem value="warning">warning</SelectItem>
                    <SelectItem value="process">process</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Targets (쉼표로 구분)</Label>
              <Textarea
                rows={2}
                placeholder="예: 비용, cost, chi phí, зардал"
                value={newTargets}
                onChange={(e) => setNewTargets(e.target.value)}
              />
            </div>
            <Button onClick={add} className="w-full">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              {lang === "ko" ? "저장" : "Save"}
            </Button>
          </CardContent>
        )}
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* 동의어 목록 */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <CardTitle className="text-lg">
              {lang === "ko" ? "동의어 사전" : "Dictionary"} ({synonyms.length})
            </CardTitle>
            <div className="md:ml-auto flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="pl-8 h-9 w-full sm:w-48"
                />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger size="sm" className="w-full sm:w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="general">general</SelectItem>
                  <SelectItem value="cost">cost</SelectItem>
                  <SelectItem value="visa">visa</SelectItem>
                  <SelectItem value="documents">documents</SelectItem>
                  <SelectItem value="school">school</SelectItem>
                  <SelectItem value="warning">warning</SelectItem>
                  <SelectItem value="process">process</SelectItem>
                </SelectContent>
              </Select>
              <Select value={origin} onValueChange={setOrigin}>
                <SelectTrigger size="sm" className="w-full sm:w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All origins</SelectItem>
                  <SelectItem value="manual">manual</SelectItem>
                  <SelectItem value="auto">auto</SelectItem>
                  <SelectItem value="chatlog">chatlog</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {lang === "ko" ? "로딩 중..." : "Loading..."}
            </div>
          ) : synonyms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {lang === "ko" ? "동의어가 없습니다." : "No synonyms."}
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
              {synonyms.map((s) => (
                <div
                  key={s.id}
                  className={`flex items-start gap-3 rounded-md border p-2.5 ${!s.enabled ? "opacity-50" : ""}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="default" className="text-xs">{s.source}</Badge>
                      <span className="text-xs text-muted-foreground">→</span>
                      <div className="flex flex-wrap gap-1">
                        {s.targets.slice(0, 6).map((t, j) => (
                          <Badge key={j} variant="outline" className="text-[10px]">{t}</Badge>
                        ))}
                        {s.targets.length > 6 && (
                          <Badge variant="outline" className="text-[10px]">+{s.targets.length - 6}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge variant="secondary" className="text-[10px]">{s.category}</Badge>
                      <Badge variant="outline" className="text-[10px]">{s.origin}</Badge>
                      {s.autoMeta?.confidence && (
                        <span className="text-[10px] text-muted-foreground">
                          conf: {(s.autoMeta.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => toggleEnabled(s.id, s.enabled)}
                      title={s.enabled ? "비활성화" : "활성화"}
                    >
                      <Power className={`h-3.5 w-3.5 ${s.enabled ? "text-green-600" : "text-muted-foreground"}`} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => remove(s.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    )
  );
}
