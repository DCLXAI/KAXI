"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Loader2, Mail, RotateCcw, UserPlus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthMode = "sign_in" | "sign_up";

interface SyncResponse {
  error?: string;
  redirectTo?: string;
}

const CALLBACK_ERRORS: Record<string, string> = {
  missing_code: "로그인 링크가 올바르지 않습니다. 새 링크를 요청해주세요.",
  callback_failed: "로그인 링크가 만료되었거나 이미 사용되었습니다.",
  invite_not_valid: "파트너 초대가 만료되었거나 올바르지 않습니다.",
  invite_email_mismatch: "초대받은 이메일과 로그인 이메일이 다릅니다.",
  admin_link_required: "관리자 계정 연결이 필요합니다. 운영자에게 문의해주세요.",
  auth_identity_conflict: "이미 다른 로그인 계정에 연결된 이메일입니다.",
  supabase_unavailable: "회원 인증 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.",
  internal: "로그인 처리 중 오류가 발생했습니다.",
};

export function UnifiedAuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite") || searchParams.get("inviteToken") || "";
  const requestedPath = searchParams.get("next") || searchParams.get("callbackUrl") || "";
  const [mode, setMode] = useState<AuthMode>(inviteToken ? "sign_up" : "sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"password" | "otp" | "reset" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const callbackError = searchParams.get("error");
  const [error, setError] = useState<string | null>(
    callbackError ? CALLBACK_ERRORS[callbackError] || "로그인 정보를 확인해주세요." : null
  );

  async function syncUser(client: Awaited<ReturnType<typeof createSupabaseBrowserClient>>) {
    const response = await fetch("/api/auth/supabase/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        inviteToken: inviteToken || undefined,
        locale: "ko",
        next: requestedPath || undefined,
      }),
    });
    const data = (await response.json().catch(() => ({}))) as SyncResponse;
    if (!response.ok) {
      await client.auth.signOut?.();
      throw new Error(data.error || "Account sync failed");
    }
    router.replace(data.redirectTo || "/student");
    router.refresh();
  }

  async function trySignIn(): Promise<boolean> {
    try {
      const client = await createSupabaseBrowserClient();
      const result = await client.auth.signInWithPassword?.({ email, password });
      if (!result || result.error || !result.data?.session) return false;
      await syncUser(client);
      return true;
    } catch {
      return false;
    }
  }

  async function submitSignIn(event: React.FormEvent) {
    event.preventDefault();
    setLoading("password");
    setError(null);
    setMessage(null);
    try {
      const signedIn = await trySignIn();
      if (!signedIn) setError("이메일과 비밀번호를 확인해주세요.");
    } catch {
      setError("로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(null);
    }
  }

  async function submitSignUp(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    setLoading("password");
    setError(null);
    setMessage(null);
    try {
      const client = await createSupabaseBrowserClient();
      const callback = new URL("/auth/callback", window.location.origin);
      if (inviteToken) callback.searchParams.set("inviteToken", inviteToken);
      if (requestedPath.startsWith("/") && !requestedPath.startsWith("//")) {
        callback.searchParams.set("next", requestedPath);
      }
      const result = await client.auth.signUp?.({
        email,
        password,
        options: { emailRedirectTo: callback.toString() },
      });
      if (!result || result.error) throw new Error("signup_failed");
      if (result.data?.session) {
        await syncUser(client);
        return;
      }
      setMessage("인증 메일을 확인해 가입을 완료해주세요.");
    } catch {
      setError("가입할 수 없습니다. 이메일과 비밀번호를 확인해주세요.");
    } finally {
      setLoading(null);
    }
  }

  async function sendEmailLink() {
    setLoading("otp");
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/supabase/otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          inviteToken: inviteToken || undefined,
          locale: "ko",
          next: requestedPath || undefined,
        }),
      });
      if (!response.ok) throw new Error("otp_failed");
      setMessage("이메일로 보낸 로그인 링크를 확인해주세요.");
    } catch {
      setError("로그인 링크를 보낼 수 없습니다. 가입된 이메일인지 확인해주세요.");
    } finally {
      setLoading(null);
    }
  }

  async function sendPasswordReset() {
    setLoading("reset");
    setError(null);
    setMessage(null);
    try {
      const client = await createSupabaseBrowserClient();
      const result = await client.auth.resetPasswordForEmail?.(email, {
        redirectTo: new URL("/auth/callback?next=/account/reset-password", window.location.origin).toString(),
      });
      if (!result || result.error) throw new Error("reset_failed");
      setMessage("비밀번호 재설정 링크를 이메일로 보냈습니다.");
    } catch {
      setError("비밀번호 재설정 링크를 보낼 수 없습니다.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md rounded-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-md bg-primary text-lg font-black text-primary-foreground">
            K
          </div>
          <CardTitle className="text-2xl">KAXI 통합 계정</CardTitle>
          <CardDescription>학생 · 파트너 · 관리자</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {message && (
            <Alert className="mb-4">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          {inviteToken && (
            <Alert className="mb-4">
              <KeyRound className="h-4 w-4" />
              <AlertDescription>파트너 초대가 적용되었습니다.</AlertDescription>
            </Alert>
          )}

          <Tabs value={mode} onValueChange={(value) => setMode(value as AuthMode)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sign_in">로그인</TabsTrigger>
              <TabsTrigger value="sign_up">회원가입</TabsTrigger>
            </TabsList>

            <TabsContent value="sign_in" className="pt-4">
              <form onSubmit={submitSignIn} className="space-y-3">
                <AuthFields
                  email={email}
                  password={password}
                  loading={Boolean(loading)}
                  onEmailChange={setEmail}
                  onPasswordChange={setPassword}
                />
                <Button type="submit" className="w-full" disabled={Boolean(loading) || !email || !password}>
                  {loading === "password" && <Loader2 className="h-4 w-4 animate-spin" />}
                  로그인
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" onClick={sendEmailLink} disabled={Boolean(loading) || !email}>
                    {loading === "otp" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    이메일 링크
                  </Button>
                  <Button type="button" variant="outline" onClick={sendPasswordReset} disabled={Boolean(loading) || !email}>
                    {loading === "reset" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    비밀번호 재설정
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="sign_up" className="pt-4">
              <form onSubmit={submitSignUp} className="space-y-3">
                <AuthFields
                  email={email}
                  password={password}
                  loading={Boolean(loading)}
                  onEmailChange={setEmail}
                  onPasswordChange={setPassword}
                  newPassword
                />
                <Button type="submit" className="w-full" disabled={Boolean(loading) || !email || !password}>
                  {loading === "password" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  회원가입
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
}

function AuthFields({
  email,
  password,
  loading,
  onEmailChange,
  onPasswordChange,
  newPassword = false,
}: {
  email: string;
  password: string;
  loading: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  newPassword?: boolean;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={`${newPassword ? "signup" : "login"}-email`}>이메일</Label>
        <Input
          id={`${newPassword ? "signup" : "login"}-email`}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          disabled={loading}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${newPassword ? "signup" : "login"}-password`}>비밀번호</Label>
        <Input
          id={`${newPassword ? "signup" : "login"}-password`}
          type="password"
          autoComplete={newPassword ? "new-password" : "current-password"}
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          disabled={loading}
          minLength={newPassword ? 8 : undefined}
          required
        />
      </div>
    </>
  );
}
