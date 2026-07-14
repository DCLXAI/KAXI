"use client";

import { Check, FileSearch, Loader2, Route, Sparkles } from "lucide-react";
import type { AgentLocale, AgentProgress } from "./types";

interface AgentProgressCardProps {
  locale: AgentLocale;
  progress: AgentProgress | null;
}

const STAGES = ["routing", "searching", "generating", "finalizing"] as const;

const COPY = {
  ko: {
    routing: "질문 경로를 확인하고 있어요",
    searching: "공식 자료와 필요한 도구를 찾고 있어요",
    generating: "근거를 확인해 답변을 작성하고 있어요",
    finalizing: "출처와 주의사항을 정리하고 있어요",
  },
  en: {
    routing: "Checking the best route for your question",
    searching: "Searching official sources and tools",
    generating: "Writing an evidence-grounded answer",
    finalizing: "Finalizing sources and cautions",
  },
  vi: {
    routing: "Đang xác định hướng xử lý câu hỏi",
    searching: "Đang tìm nguồn chính thức và công cụ",
    generating: "Đang soạn câu trả lời dựa trên căn cứ",
    finalizing: "Đang hoàn thiện nguồn và lưu ý",
  },
  mn: {
    routing: "Асуултын тохирох замыг шалгаж байна",
    searching: "Албан эх сурвалж, хэрэгсэл хайж байна",
    generating: "Нотолгоонд тулгуурласан хариу боловсруулж байна",
    finalizing: "Эх сурвалж, анхааруулгыг нэгтгэж байна",
  },
} satisfies Record<AgentLocale, Record<(typeof STAGES)[number], string>>;

const ICONS = {
  routing: Route,
  searching: FileSearch,
  generating: Sparkles,
  finalizing: Check,
};

export function AgentProgressCard({ locale, progress }: AgentProgressCardProps) {
  const stage = progress?.stage || "routing";
  const currentIndex = STAGES.indexOf(stage);
  const CurrentIcon = ICONS[stage];

  return (
    <div
      className="min-h-[88px] w-full max-w-[95%] rounded-lg border bg-card p-4"
      role="status"
      aria-live="polite"
      aria-label={COPY[locale][stage]}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <CurrentIcon className="h-4 w-4 text-icon-accent" />
        <span>{COPY[locale][stage]}</span>
        <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />
      </div>
      <div className="mt-4 grid grid-cols-4 gap-1.5" aria-hidden="true">
        {STAGES.map((item, index) => (
          <span
            key={item}
            className={`h-1.5 rounded-full transition-colors duration-300 ${
              index <= currentIndex ? "bg-icon-accent" : "bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
