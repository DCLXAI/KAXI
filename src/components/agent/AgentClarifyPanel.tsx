"use client";

import { AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  clarifyFieldText,
  EMPTY_CLARIFY_DRAFT,
  hasClarifyDraftValue,
  SLOT_TO_DRAFT_KEY,
} from "./agent-config";
import { CLARIFY_OPTIONS } from "./clarify-options";
import type { AgentLocale, AgentMessage, ClarifyDraft } from "./types";

interface AgentClarifyPanelProps {
  draft?: ClarifyDraft;
  loading: boolean;
  locale: AgentLocale;
  message: AgentMessage;
  messageIndex: number;
  originalRequest: string;
  onDraftChange: (messageIndex: number, patch: Partial<ClarifyDraft>) => void;
  onSend: (text: string) => void;
  onSendDraft: (messageIndex: number, originalRequest: string) => void;
}

function shouldShowSchoolFields(message: AgentMessage): boolean {
  const slots = new Set(message.meta?.clarifyingQuestions.map((item) => item.slot));
  return Boolean(
    slots.has("region") ||
      slots.has("program") ||
      slots.has("budget") ||
      message.toolResults?.some((item) => item.tool === "search_schools" || item.tool === "calculate_cost") ||
      message.meta?.plan.some((step) => /학교|school|trường|сургууль/i.test(step)),
  );
}

export function AgentClarifyPanel({
  draft = EMPTY_CLARIFY_DRAFT,
  loading,
  locale,
  message,
  messageIndex,
  originalRequest,
  onDraftChange,
  onSend,
  onSendDraft,
}: AgentClarifyPanelProps) {
  if (!message.meta?.clarifyingQuestions?.length) return null;

  const labels = clarifyFieldText(locale);
  const showSchoolFields = shouldShowSchoolFields(message);

  return (
    <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-3 dark:border-amber-800/70 dark:bg-amber-950/30">
      <div className="mb-3 flex items-center gap-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-200">
        <AlertCircle className="h-3 w-3" />
        {locale === "ko" ? "정확도를 높이려면" : "To improve accuracy"}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {showSchoolFields && (
          <>
            <label className="space-y-1 text-[11px] font-medium text-amber-900 dark:text-amber-100">
              <span>{labels.budget}</span>
              <Input
                value={draft.budget}
                inputMode="numeric"
                placeholder={labels.budgetPlaceholder}
                disabled={loading}
                onChange={(event) => onDraftChange(messageIndex, { budget: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onSendDraft(messageIndex, originalRequest);
                  }
                }}
                className="h-8 bg-background text-xs"
              />
            </label>
            <label className="space-y-1 text-[11px] font-medium text-amber-900 dark:text-amber-100">
              <span>{labels.schoolName}</span>
              <Input
                value={draft.schoolName}
                placeholder={labels.schoolPlaceholder}
                disabled={loading}
                onChange={(event) => onDraftChange(messageIndex, { schoolName: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onSendDraft(messageIndex, originalRequest);
                  }
                }}
                className="h-8 bg-background text-xs"
              />
            </label>
          </>
        )}

        {message.meta.clarifyingQuestions.map((item) => {
          if (item.slot === "budget" && showSchoolFields) return null;
          const draftKey = SLOT_TO_DRAFT_KEY[item.slot];
          if (!draftKey) return null;
          const options = CLARIFY_OPTIONS[draftKey][locale];

          return (
            <label key={`${item.slot}-${item.label}-field`} className="space-y-1 text-[11px] font-medium text-amber-900 dark:text-amber-100">
              <span>{item.label}</span>
              <Select
                value={draft[draftKey]}
                disabled={loading}
                onValueChange={(nextValue) => onDraftChange(messageIndex, { [draftKey]: nextValue } as Partial<ClarifyDraft>)}
              >
                <SelectTrigger className="h-8 w-full bg-background text-xs">
                  <SelectValue placeholder={item.prompt} />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={loading || !hasClarifyDraftValue(draft)}
          onClick={() => onSendDraft(messageIndex, originalRequest)}
          className="h-8 gap-1.5 text-xs"
        >
          <ArrowRight className="h-3 w-3" />
          {labels.apply}
        </Button>
        {message.meta.clarifyingQuestions.map((item) => (
          <button
            key={`${item.slot}-${item.label}`}
            type="button"
            disabled={loading}
            onClick={() => onSend(item.prompt)}
            className="inline-flex max-w-full items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-left text-xs hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="font-medium">{labels.quickAsk}: {item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
