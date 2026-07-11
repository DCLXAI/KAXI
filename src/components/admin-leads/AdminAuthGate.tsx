"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/i18n/routing";

interface AdminAuthGateProps {
  locale: Locale;
  sessionStatus: "authenticated" | "loading" | "unauthenticated";
}

export function AdminAuthGate({
  locale,
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
              : locale === "ko" ? "Supabase 관리자 계정과 MFA 인증이 필요합니다." : "A Supabase admin account with MFA is required."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full" asChild>
            <a href="/login?next=/admin/cases">{locale === "ko" ? "로그인" : "Sign in"}</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
