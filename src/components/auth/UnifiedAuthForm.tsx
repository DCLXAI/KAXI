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
import { isLocale } from "@/i18n/routing";
import type { Lang } from "@/lib/i18n/translations";

type AuthMode = "sign_in" | "sign_up";

interface SyncResponse {
  error?: string;
  redirectTo?: string;
}

const AUTH_COPY: Record<Lang, Record<string, string>> = {
  ko: { title: "KAXI 통합 계정", subtitle: "학생 · 파트너 · 관리자", signIn: "로그인", signUp: "회원가입", email: "이메일", password: "비밀번호", invalidCredentials: "이메일과 비밀번호를 확인해주세요.", signInError: "로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", passwordLength: "비밀번호는 8자 이상이어야 합니다.", signUpError: "가입할 수 없습니다. 이메일과 비밀번호를 확인해주세요.", verifyEmail: "인증 메일을 확인해 가입을 완료해주세요.", loginLink: "이메일 링크", loginLinkSent: "이메일로 보낸 로그인 링크를 확인해주세요.", loginLinkError: "로그인 링크를 보낼 수 없습니다. 가입된 이메일인지 확인해주세요.", reset: "비밀번호 재설정", resetSent: "비밀번호 재설정 링크를 이메일로 보냈습니다.", resetError: "비밀번호 재설정 링크를 보낼 수 없습니다.", invite: "파트너 초대가 적용되었습니다.", fallbackError: "로그인 정보를 확인해주세요." },
  vi: { title: "Tài khoản KAXI", subtitle: "Học sinh · Đối tác · Quản trị", signIn: "Đăng nhập", signUp: "Đăng ký", email: "Email", password: "Mật khẩu", invalidCredentials: "Kiểm tra email và mật khẩu.", signInError: "Có lỗi khi đăng nhập. Vui lòng thử lại.", passwordLength: "Mật khẩu phải có ít nhất 8 ký tự.", signUpError: "Không thể đăng ký. Kiểm tra email và mật khẩu.", verifyEmail: "Kiểm tra email để hoàn tất đăng ký.", loginLink: "Liên kết email", loginLinkSent: "Kiểm tra liên kết đăng nhập trong email.", loginLinkError: "Không thể gửi liên kết. Hãy kiểm tra email đã đăng ký.", reset: "Đặt lại mật khẩu", resetSent: "Đã gửi liên kết đặt lại mật khẩu.", resetError: "Không thể gửi liên kết đặt lại mật khẩu.", invite: "Lời mời đối tác đã được áp dụng.", fallbackError: "Kiểm tra thông tin đăng nhập." },
  mn: { title: "KAXI нэгдсэн бүртгэл", subtitle: "Оюутан · Түнш · Админ", signIn: "Нэвтрэх", signUp: "Бүртгүүлэх", email: "И-мэйл", password: "Нууц үг", invalidCredentials: "И-мэйл болон нууц үгээ шалгана уу.", signInError: "Нэвтрэхэд алдаа гарлаа. Дахин оролдоно уу.", passwordLength: "Нууц үг дор хаяж 8 тэмдэгт байна.", signUpError: "Бүртгүүлэх боломжгүй. Мэдээллээ шалгана уу.", verifyEmail: "Бүртгэлээ дуусгахын тулд и-мэйлээ шалгана уу.", loginLink: "И-мэйл холбоос", loginLinkSent: "И-мэйл дэх нэвтрэх холбоосыг шалгана уу.", loginLinkError: "Холбоос илгээж чадсангүй. И-мэйлээ шалгана уу.", reset: "Нууц үг шинэчлэх", resetSent: "Нууц үг шинэчлэх холбоос илгээлээ.", resetError: "Шинэчлэх холбоос илгээж чадсангүй.", invite: "Түншийн урилга идэвхжлээ.", fallbackError: "Нэвтрэх мэдээллээ шалгана уу." },
  en: { title: "KAXI account", subtitle: "Student · Partner · Admin", signIn: "Sign in", signUp: "Sign up", email: "Email", password: "Password", invalidCredentials: "Check your email and password.", signInError: "An error occurred while signing in. Please retry.", passwordLength: "Password must be at least 8 characters.", signUpError: "Could not sign up. Check your email and password.", verifyEmail: "Check your email to complete sign-up.", loginLink: "Email link", loginLinkSent: "Check your email for the sign-in link.", loginLinkError: "Could not send the link. Check that the email is registered.", reset: "Reset password", resetSent: "A password reset link was sent.", resetError: "Could not send the password reset link.", invite: "Partner invitation applied.", fallbackError: "Check your sign-in information." },
};

const CALLBACK_ERRORS: Record<string, Record<Lang, string>> = {
  missing_code: { ko: "로그인 링크가 올바르지 않습니다. 새 링크를 요청해주세요.", vi: "Liên kết không hợp lệ. Hãy yêu cầu liên kết mới.", mn: "Нэвтрэх холбоос буруу байна. Шинэ холбоос авна уу.", en: "The sign-in link is invalid. Request a new link." },
  callback_failed: { ko: "로그인 링크가 만료되었거나 이미 사용되었습니다.", vi: "Liên kết đã hết hạn hoặc đã được sử dụng.", mn: "Холбоосын хугацаа дууссан эсвэл ашиглагдсан.", en: "The link expired or was already used." },
  invite_not_valid: { ko: "파트너 초대가 만료되었거나 올바르지 않습니다.", vi: "Lời mời đối tác không hợp lệ hoặc đã hết hạn.", mn: "Түншийн урилга буруу эсвэл хугацаа дууссан.", en: "The partner invite is invalid or expired." },
  invite_email_mismatch: { ko: "초대받은 이메일과 로그인 이메일이 다릅니다.", vi: "Email đăng nhập không khớp lời mời.", mn: "Нэвтрэх и-мэйл урилгатай таарахгүй.", en: "The sign-in email does not match the invite." },
  admin_link_required: { ko: "관리자 계정 연결이 필요합니다. 운영자에게 문의해주세요.", vi: "Cần liên kết tài khoản quản trị. Hãy liên hệ vận hành.", mn: "Админ бүртгэл холбох шаардлагатай.", en: "Admin account linking is required. Contact operations." },
  auth_identity_conflict: { ko: "이미 다른 로그인 계정에 연결된 이메일입니다.", vi: "Email đã được liên kết với tài khoản khác.", mn: "И-мэйл өөр бүртгэлтэй холбогдсон.", en: "This email is linked to another account." },
  supabase_unavailable: { ko: "회원 인증 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.", vi: "Không thể kết nối máy chủ xác thực. Hãy thử lại sau.", mn: "Нэвтрэх сервертэй холбогдож чадсангүй.", en: "The authentication service is unavailable. Please retry." },
  internal: { ko: "로그인 처리 중 오류가 발생했습니다.", vi: "Có lỗi khi xử lý đăng nhập.", mn: "Нэвтрэх үед алдаа гарлаа.", en: "An error occurred during sign-in." },
};

export function UnifiedAuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite") || searchParams.get("inviteToken") || "";
  const requestedPath = searchParams.get("next") || searchParams.get("callbackUrl") || "";
  const requestedLocale = searchParams.get("lang") || "ko";
  const lang: Lang = isLocale(requestedLocale) ? requestedLocale : "ko";
  const copy = AUTH_COPY[lang];
  const [mode, setMode] = useState<AuthMode>(inviteToken ? "sign_up" : "sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"password" | "otp" | "reset" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const callbackError = searchParams.get("error");
  const [error, setError] = useState<string | null>(
    callbackError ? CALLBACK_ERRORS[callbackError]?.[lang] || copy.fallbackError : null
  );

  async function syncUser(client: Awaited<ReturnType<typeof createSupabaseBrowserClient>>) {
    const response = await fetch("/api/auth/supabase/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        inviteToken: inviteToken || undefined,
        locale: lang,
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
      if (!signedIn) setError(copy.invalidCredentials);
    } catch {
      setError(copy.signInError);
    } finally {
      setLoading(null);
    }
  }

  async function submitSignUp(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      setError(copy.passwordLength);
      return;
    }

    setLoading("password");
    setError(null);
    setMessage(null);
    try {
      const client = await createSupabaseBrowserClient();
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("locale", lang);
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
      setMessage(copy.verifyEmail);
    } catch {
      setError(copy.signUpError);
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
          locale: lang,
          next: requestedPath || undefined,
        }),
      });
      if (!response.ok) throw new Error("otp_failed");
      setMessage(copy.loginLinkSent);
    } catch {
      setError(copy.loginLinkError);
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
      setMessage(copy.resetSent);
    } catch {
      setError(copy.resetError);
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
          <CardTitle className="text-2xl">{copy.title}</CardTitle>
          <CardDescription>{copy.subtitle}</CardDescription>
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
              <AlertDescription>{copy.invite}</AlertDescription>
            </Alert>
          )}

          <Tabs value={mode} onValueChange={(value) => setMode(value as AuthMode)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sign_in">{copy.signIn}</TabsTrigger>
              <TabsTrigger value="sign_up">{copy.signUp}</TabsTrigger>
            </TabsList>

            <TabsContent value="sign_in" className="pt-4">
              <form onSubmit={submitSignIn} className="space-y-3">
                <AuthFields
                  email={email}
                  password={password}
                  loading={Boolean(loading)}
                  onEmailChange={setEmail}
                  onPasswordChange={setPassword}
                  copy={copy}
                />
                <Button type="submit" className="w-full" disabled={Boolean(loading) || !email || !password}>
                  {loading === "password" && <Loader2 className="h-4 w-4 animate-spin" />}
                  {copy.signIn}
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" onClick={sendEmailLink} disabled={Boolean(loading) || !email}>
                    {loading === "otp" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    {copy.loginLink}
                  </Button>
                  <Button type="button" variant="outline" onClick={sendPasswordReset} disabled={Boolean(loading) || !email}>
                    {loading === "reset" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    {copy.reset}
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
                  copy={copy}
                />
                <Button type="submit" className="w-full" disabled={Boolean(loading) || !email || !password}>
                  {loading === "password" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  {copy.signUp}
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
  copy,
}: {
  email: string;
  password: string;
  loading: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  newPassword?: boolean;
  copy: Record<string, string>;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={`${newPassword ? "signup" : "login"}-email`}>{copy.email}</Label>
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
        <Label htmlFor={`${newPassword ? "signup" : "login"}-password`}>{copy.password}</Label>
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
