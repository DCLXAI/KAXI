"use client";

import { Bot, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { statusDotClass, statusText } from "./agent-config";
import type { AgentLocale, AgentStatus } from "./types";

interface AgentChatHeaderProps {
  agentStatus: AgentStatus | null;
  locale: AgentLocale;
  onReset: () => void;
}

export function AgentChatHeader({ agentStatus, locale, onReset }: AgentChatHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6 pb-4 border-b">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Bot className="h-4 w-4" />
        </div>
        <div>
          <div className="font-semibold text-sm flex items-center gap-1.5">
            {locale === "ko" ? "AI 에이전트" : "AI Agent"}
            <Badge variant="outline" className="text-[10px] py-0 h-4">ReAct</Badge>
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass(agentStatus)}`} />
            {statusText(locale, agentStatus)}
          </div>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={onReset} className="gap-1.5">
        <RefreshCw className="h-3.5 w-3.5" />
        {locale === "ko" ? "새 대화" : "New"}
      </Button>
    </div>
  );
}
