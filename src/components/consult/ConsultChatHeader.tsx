"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KaxiCat } from "@/components/brand/KaxiCat";
import { MODE_LABELS } from "./consult-config";
import type { ConsultLocale, ConsultMode } from "./types";

interface ConsultChatHeaderProps {
  locale: ConsultLocale;
  mode: ConsultMode;
  onReset: () => void;
}

export function ConsultChatHeader({ locale, mode, onReset }: ConsultChatHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6 pb-4 border-b">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <KaxiCat state="breath" size={28} inverted />
        </div>
        <div>
          <div className="font-semibold text-sm">
            {locale === "ko" ? "행정사 AI 에이전트" : "Admin Lawyer AI"}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            {MODE_LABELS[mode][locale]} · {locale === "ko" ? "온라인" : "online"}
          </div>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={onReset} className="gap-1.5">
        <RefreshCw className="h-3.5 w-3.5" />
        {locale === "ko" ? "새 대화" : locale === "vi" ? "Mới" : locale === "mn" ? "Шинэ" : "New"}
      </Button>
    </div>
  );
}
