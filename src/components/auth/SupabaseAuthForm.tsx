"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Loader2, Mail, UserPlus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { tr, type Lang } from "@/lib/i18n/translations";

type AuthRole = "STUDENT" | "PARTNER_AGENT";

export function SupabaseAuthForm({ role, lang = "ko" }: { role: AuthRole; lang?: Lang }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialInvite = searchParams.get("invite") || "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteToken, setInviteToken] = useState(initialInvite);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(searchParams.get("error"));

  const isPartner = role === "PARTNER_AGENT";
  const home = isPartner ? "/partner" : "/student";

  async function syncUser() {
    const res = await fetch("/api/auth/supabase/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role, inviteToken: inviteToken || undefined, locale: lang }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Account sync failed");
  }

  async function passwordAuth(mode: "sign_up" | "sign_in") {
    setLoading(mode);
    setError(null);
    setMessage(null);
    try {
      const client = await createSupabaseBrowserClient();
      const result =
        mode === "sign_in"
          ? await client.auth.signInWithPassword?.({ email, password })
          : await client.auth.signUp?.({ email, password });
      if (!result || result.error) throw new Error(result?.error?.message || "Supabase password auth failed");
      if (result.data.session) {
        await syncUser();
        router.push(home);
        router.refresh();
      } else {
        setMessage(tr("auth_check_email", lang));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(null);
    }
  }

  async function otpAuth() {
    setLoading("otp");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/supabase/otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, role, inviteToken: inviteToken || undefined, locale: lang }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "OTP request failed");
      setMessage(tr("auth_check_email", lang));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <Card>
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              {isPartner ? <KeyRound className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            </div>
            <CardTitle>{isPartner ? tr("auth_partner_title", lang) : tr("auth_student_title", lang)}</CardTitle>
            <CardDescription>
              {isPartner ? tr("auth_partner_subtitle", lang) : tr("auth_student_subtitle", lang)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {message && (
              <Alert>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{tr("auth_email", lang)}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                disabled={Boolean(loading)}
              />
            </div>
            {isPartner && (
              <div className="space-y-2">
                <Label htmlFor="invite">{tr("auth_invite_token", lang)}</Label>
                <Input
                  id="invite"
                  value={inviteToken}
                  onChange={(event) => setInviteToken(event.target.value)}
                  disabled={Boolean(loading)}
                />
              </div>
            )}
            <Tabs defaultValue="password">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="password">{tr("auth_password_tab", lang)}</TabsTrigger>
                <TabsTrigger value="otp">{tr("auth_otp_tab", lang)}</TabsTrigger>
              </TabsList>
              <TabsContent value="password" className="space-y-3 pt-3">
                <div className="space-y-2">
                  <Label htmlFor="password">{tr("auth_password", lang)}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={isPartner ? "new-password" : "current-password"}
                    disabled={Boolean(loading)}
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button onClick={() => passwordAuth("sign_in")} disabled={Boolean(loading) || !email || !password}>
                    {loading === "sign_in" && <Loader2 className="h-4 w-4 animate-spin" />}
                    {tr("auth_sign_in", lang)}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => passwordAuth("sign_up")}
                    disabled={Boolean(loading) || !email || !password}
                  >
                    {loading === "sign_up" && <Loader2 className="h-4 w-4 animate-spin" />}
                    {tr("auth_sign_up", lang)}
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="otp" className="space-y-3 pt-3">
                <Button onClick={otpAuth} disabled={Boolean(loading) || !email} className="w-full">
                  {loading === "otp" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  {tr("auth_send_otp", lang)}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
