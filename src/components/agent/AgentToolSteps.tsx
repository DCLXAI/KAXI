"use client";

import { CheckCircle2, Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  FALLBACK_TOOL_ICON,
  TOOL_ICONS,
  TOOL_LABELS,
} from "./agent-config";
import type { AgentLocale, AgentStep } from "./types";

interface AgentToolStepsProps {
  iterations?: number;
  locale: AgentLocale;
  steps: AgentStep[];
}

export function AgentToolSteps({ iterations, locale, steps }: AgentToolStepsProps) {
  const visibleSteps = steps.filter((step) => step.type === "tool_call" || step.type === "tool_result");
  if (visibleSteps.length === 0) return null;

  return (
    <Card className="p-3 bg-muted/30 border-dashed">
      <div className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
        <Wrench className="h-2.5 w-2.5" />
        {locale === "ko" ? `에이전트 도구 호출 (${iterations}단계)` : `Agent steps (${iterations})`}
      </div>
      <div className="space-y-1.5">
        {steps.map((step, index) => {
          if (step.type === "tool_call" && step.toolCall) {
            const Icon = TOOL_ICONS[step.toolCall.tool] || FALLBACK_TOOL_ICON;
            return (
              <div key={`${step.type}-${index}`} className="flex items-center gap-2 text-xs">
                <Icon className="h-3 w-3 text-icon-accent" />
                <span className="font-medium">{TOOL_LABELS[step.toolCall.tool]?.[locale] || step.toolCall.tool}</span>
                <span className="text-muted-foreground truncate">
                  {Object.entries(step.toolCall.args)
                    .slice(0, 2)
                    .map(([key, value]) => `${key}: ${String(value).substring(0, 30)}`)
                    .join(", ")}
                </span>
              </div>
            );
          }

          if (step.type === "tool_result" && step.toolResult) {
            return (
              <div key={`${step.type}-${index}`} className="flex items-center gap-2 text-xs pl-5">
                <CheckCircle2 className={`h-3 w-3 ${step.toolResult.success ? "text-green-500" : "text-red-500"}`} />
                <span className="text-muted-foreground">{step.toolResult.summary}</span>
              </div>
            );
          }

          return null;
        })}
      </div>
    </Card>
  );
}
