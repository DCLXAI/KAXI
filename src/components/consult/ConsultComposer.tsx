"use client";

import { ArrowUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MODE_LABELS } from "./consult-config";
import type { ConsultLocale, ConsultMode } from "./types";

interface ConsultComposerProps {
  input: string;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  loading: boolean;
  locale: ConsultLocale;
  mode: ConsultMode;
  onInputChange: (value: string) => void;
  onModeChange: (value: ConsultMode) => void;
  onSend: () => void;
}

export function ConsultComposer({
  input,
  inputRef,
  loading,
  locale,
  mode,
  onInputChange,
  onModeChange,
  onSend,
}: ConsultComposerProps) {
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
            placeholder={locale === "ko" ? "추가 질문을 입력하세요..." : "Type follow-up..."}
            className="border-0 resize-none focus-visible:ring-0 text-sm min-h-[40px] max-h-[120px]"
            rows={1}
            disabled={loading}
          />
          <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t">
            <div className="flex items-center gap-2">
              <Select value={mode} onValueChange={(value) => onModeChange(value as ConsultMode)}>
                <SelectTrigger size="sm" className="h-7 w-[130px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(MODE_LABELS) as ConsultMode[]).map((item) => (
                    <SelectItem key={item} value={item} className="text-xs">
                      {MODE_LABELS[item][locale]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={onSend} disabled={!input.trim() || loading} className="gap-1.5 h-7">
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowUp className="h-3 w-3" />}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
