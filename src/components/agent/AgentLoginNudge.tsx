"use client";

import { useKaxiSession } from "@/hooks/useKaxiSession";
import type { AgentLocale } from "./types";

const NUDGE_COPY: Record<AgentLocale, string> = {
  ko: "로그인하면 이 상담이 계정에 저장됩니다.",
  vi: "Đăng nhập để lưu cuộc tư vấn này vào tài khoản.",
  mn: "Нэвтэрвэл энэ зөвлөгөө таны бүртгэлд хадгалагдана.",
  en: "Log in to save this conversation to your account.",
};

export function AgentLoginNudge({
  locale,
  hasAssistantMessage,
}: {
  locale: AgentLocale;
  hasAssistantMessage: boolean;
}) {
  const { status } = useKaxiSession();

  // Only nudge once the assistant has answered, and only while signed out.
  // "loading" and "authenticated" both suppress the line.
  if (!hasAssistantMessage || status !== "unauthenticated") return null;

  return (
    <p className="px-1 text-center text-xs text-muted-foreground">
      <a href="/login" className="underline underline-offset-2 hover:text-foreground">
        {NUDGE_COPY[locale]}
      </a>
    </p>
  );
}
