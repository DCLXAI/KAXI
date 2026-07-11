"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { SupabaseClientLike } from "@/lib/supabase/dynamic";

function passwordUpdateError(error: unknown): string {
  const message = error instanceof Error
    ? error.message.toLowerCase()
    : error && typeof error === "object" && "message" in error
      ? String(error.message).toLowerCase()
      : "";

  if (message.includes("same password") || message.includes("different from the old")) {
    return "기존 비밀번호와 다른 비밀번호를 입력해주세요.";
  }
  if (message.includes("weak") || message.includes("password should")) {
    return "8자 이상의 더 안전한 비밀번호를 입력해주세요.";
  }
  if (message.includes("session") || message.includes("expired") || message.includes("jwt")) {
    return "재설정 세션이 만료되었습니다. 새 링크를 요청해주세요.";
  }
  return "비밀번호를 변경할 수 없습니다. 잠시 후 다시 시도해주세요.";
}

export function PasswordResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientRef = useRef<SupabaseClientLike | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function initializeRecoverySession() {
      try {
        const client = await createSupabaseBrowserClient();
        const authResult = await client.auth.getUser();
        if (authResult.error || !authResult.data?.user) {
          throw authResult.error || new Error("recovery_session_missing");
        }
        if (!active) return;
        clientRef.current = client;
        setSessionReady(true);
      } catch (err) {
        if (active) setError(passwordUpdateError(err));
      } finally {
        if (active) setInitializing(false);
      }
    }

    void initializeRecoverySession();
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (password !== confirmation) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const client = clientRef.current;
      if (!client || !sessionReady) throw new Error("recovery_session_missing");
      const result = await client.auth.updateUser?.({ password });
      if (!result || result.error) throw result?.error || new Error("password_update_failed");
      await client.auth.signOut?.();
      const requestedPath = searchParams.get("next") || "";
      const loginPath = requestedPath.startsWith("/") && !requestedPath.startsWith("//")
        ? `/login?next=${encodeURIComponent(requestedPath)}`
        : "/login";
      router.replace(loginPath);
      router.refresh();
    } catch (err) {
      setError(passwordUpdateError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md rounded-lg">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <KeyRound className="h-5 w-5" />
          </div>
          <CardTitle>비밀번호 재설정</CardTitle>
          <CardDescription>
            {initializing ? "재설정 세션을 확인하고 있습니다." : "새 비밀번호를 입력하세요."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="new-password">새 비밀번호</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={loading || initializing || !sessionReady}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">비밀번호 확인</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                disabled={loading || initializing || !sessionReady}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || initializing || !sessionReady || !password || !confirmation}
            >
              {(loading || initializing) && <Loader2 className="h-4 w-4 animate-spin" />}
              비밀번호 변경
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
