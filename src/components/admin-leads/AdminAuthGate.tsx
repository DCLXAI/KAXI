"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Locale } from "@/i18n/routing";

interface AdminAuthGateProps {
  keyInput: string;
  locale: Locale;
  onKeyInputChange: (value: string) => void;
  onUnlock: () => void;
  sessionStatus: "authenticated" | "loading" | "unauthenticated";
}

export function AdminAuthGate({
  keyInput,
  locale,
  onKeyInputChange,
  onUnlock,
  sessionStatus,
}: AdminAuthGateProps) {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>{locale === "ko" ? "관리자 인증" : "Admin Access"}</CardTitle>
          <CardDescription>
            {sessionStatus === "loading"
              ? locale === "ko" ? "세션 확인 중..." : "Checking session..."
              : locale === "ko" ? "세션 로그인을 권장합니다. API 키는 현재 화면에서만 임시 사용됩니다." : "Session login is preferred. API key fallback is kept only for this tab."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full" asChild>
            <a href="/login">{locale === "ko" ? "관리자 로그인" : "Admin Login"}</a>
          </Button>
          <Input
            type="password"
            value={keyInput}
            onChange={(event) => onKeyInputChange(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && onUnlock()}
            placeholder={locale === "ko" ? "임시 관리자 API 키" : "Temporary admin API key"}
            autoComplete="off"
          />
          <Button className="w-full" onClick={onUnlock}>
            {locale === "ko" ? "접속" : "Unlock"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
