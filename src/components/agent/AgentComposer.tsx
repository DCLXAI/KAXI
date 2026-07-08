"use client";

import { ArrowUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { AgentLocale } from "./types";

interface AgentComposerProps {
  input: string;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  loading: boolean;
  locale: AgentLocale;
  onInputChange: (value: string) => void;
  onSend: () => void;
}

export function AgentComposer({
  input,
  inputRef,
  loading,
  locale,
  onInputChange,
  onSend,
}: AgentComposerProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-6 pb-4">
      <div className="mx-auto max-w-3xl px-4">
        <Card className="p-3 shadow-lg border-2 focus-within:border-primary/50 transition-colors">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
            placeholder={locale === "ko" ? "추가 질문 또는 다음 작업..." : "Follow-up..."}
            className="border-0 resize-none focus-visible:ring-0 text-sm min-h-[40px] max-h-[120px]"
            rows={1}
            disabled={loading}
          />
          <div className="flex items-center justify-end mt-1.5 pt-1.5 border-t">
            <Button size="sm" onClick={onSend} disabled={!input.trim() || loading} className="gap-1.5 h-7">
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowUp className="h-3 w-3" />}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
