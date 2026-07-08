"use client";

import { RefreshCw } from "lucide-react";
import { AdminAuthGate } from "@/components/admin-leads/AdminAuthGate";
import { Button } from "@/components/ui/button";
import { ChatlogAnalysisCard } from "./ChatlogAnalysisCard";
import { SynonymAddCard } from "./SynonymAddCard";
import { SynonymAlerts } from "./SynonymAlerts";
import { SynonymListCard } from "./SynonymListCard";
import { SynonymSuggestionsCard } from "./SynonymSuggestionsCard";
import { useSynonymsAdmin } from "./useSynonymsAdmin";

export function SynonymsDashboard() {
  const state = useSynonymsAdmin();

  if (!state.hasAdminAccess) {
    return (
      <AdminAuthGate
        keyInput={state.keyInput}
        locale={state.locale}
        onKeyInputChange={state.setKeyInput}
        onUnlock={state.unlock}
        sessionStatus={state.sessionStatus}
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold">{state.locale === "ko" ? "동의어 사전 관리" : "Synonym Dictionary"}</h1>
          <p className="text-muted-foreground mt-2">
            {state.locale === "ko"
              ? "ChatLog 기반 학습 + 수동 관리. 검색 품질 향상을 위한 다국어 동의어 매핑."
              : "ChatLog-based + manual management. Multilingual synonym mapping for search quality."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={state.refresh} disabled={state.loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${state.loading ? "animate-spin" : ""}`} />
          {state.locale === "ko" ? "새로고침" : "Refresh"}
        </Button>
      </div>

      <ChatlogAnalysisCard analysis={state.analysis} locale={state.locale} />
      <SynonymSuggestionsCard
        locale={state.locale}
        onAccept={state.acceptSuggestion}
        onSuggest={state.suggestFromChatlog}
        suggestions={state.suggestions}
        suggesting={state.suggesting}
      />
      <SynonymAddCard
        locale={state.locale}
        newCategory={state.newCategory}
        newSource={state.newSource}
        newTargets={state.newTargets}
        onAdd={state.add}
        onCategoryChange={state.setNewCategory}
        onSourceChange={state.setNewSource}
        onTargetsChange={state.setNewTargets}
        onToggle={() => state.setShowAdd(!state.showAdd)}
        showAdd={state.showAdd}
      />
      <SynonymAlerts error={state.error} success={state.success} />
      <SynonymListCard
        category={state.category}
        loading={state.loading}
        locale={state.locale}
        onCategoryChange={state.setCategory}
        onOriginChange={state.setOrigin}
        onQueryChange={state.setQuery}
        onRemove={state.remove}
        onToggleEnabled={state.toggleEnabled}
        origin={state.origin}
        query={state.query}
        synonyms={state.synonyms}
      />
    </div>
  );
}
