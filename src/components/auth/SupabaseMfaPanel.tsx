"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

interface Enrollment {
  factorId: string;
  qrCode: string;
  secret: string;
}

export function SupabaseMfaPanel({ onVerified }: { onVerified: () => Promise<unknown> }) {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState<"factors" | "enroll" | "verify" | null>("factors");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const client = await createSupabaseBrowserClient();
        const mfa = client.auth.mfa;
        if (!mfa) throw new Error("MFA unavailable");
        const result = await mfa.listFactors();
        if (!active) return;
        if (result.error) throw new Error(result.error.message || "MFA factor lookup failed");
        const verified = result.data?.totp.find((factor) => factor.status === "verified") || null;
        setFactorId(verified?.id || null);
      } catch {
        if (active) setError("MFA 정보를 불러오지 못했습니다.");
      } finally {
        if (active) setLoading(null);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function enroll() {
    setLoading("enroll");
    setError(null);
    try {
      const client = await createSupabaseBrowserClient();
      const mfa = client.auth.mfa;
      if (!mfa) throw new Error("MFA unavailable");
      const factors = await mfa.listFactors();
      const staleFactors = factors.data?.totp.filter((factor) => factor.status === "unverified") || [];
      await Promise.all(staleFactors.map((factor) => mfa.unenroll({ factorId: factor.id })));

      const result = await mfa.enroll({
        factorType: "totp",
        friendlyName: "KAXI Admin",
        issuer: "KAXI",
      });
      if (result.error || !result.data) throw new Error(result.error?.message || "MFA enrollment failed");
      setFactorId(result.data.id);
      setEnrollment({
        factorId: result.data.id,
        qrCode: result.data.totp.qr_code,
        secret: result.data.totp.secret,
      });
    } catch {
      setError("인증 앱을 등록하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(null);
    }
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    const targetFactorId = enrollment?.factorId || factorId;
    if (!targetFactorId || !/^\d{6}$/.test(code)) {
      setError("인증 앱의 6자리 코드를 입력해주세요.");
      return;
    }

    setLoading("verify");
    setError(null);
    try {
      const client = await createSupabaseBrowserClient();
      const mfa = client.auth.mfa;
      if (!mfa) throw new Error("MFA unavailable");
      const result = await mfa.challengeAndVerify({ factorId: targetFactorId, code });
      if (result.error) throw new Error(result.error.message || "MFA verification failed");
      await onVerified();
    } catch {
      setError("MFA 코드가 올바르지 않거나 만료되었습니다.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md rounded-lg">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <CardTitle>관리자 MFA</CardTitle>
          <CardDescription>인증 앱의 TOTP 코드로 관리자 세션을 확인합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading === "factors" ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : !factorId ? (
            <Button className="w-full" onClick={enroll} disabled={Boolean(loading)}>
              {loading === "enroll" ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              인증 앱 등록
            </Button>
          ) : (
            <form onSubmit={verify} className="space-y-4">
              {enrollment && (
                <div className="space-y-3">
                  <Image
                    src={`data:image/svg+xml;utf-8,${encodeURIComponent(enrollment.qrCode)}`}
                    alt="KAXI 관리자 MFA QR 코드"
                    width={192}
                    height={192}
                    unoptimized
                    className="mx-auto size-48 bg-white p-2"
                  />
                  <div className="space-y-1.5">
                    <Label htmlFor="mfa-secret">설정 키</Label>
                    <Input id="mfa-secret" value={enrollment.secret} readOnly className="font-mono text-xs" />
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="mfa-code">6자리 코드</Label>
                <Input
                  id="mfa-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  disabled={Boolean(loading)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={Boolean(loading) || code.length !== 6}>
                {loading === "verify" && <Loader2 className="h-4 w-4 animate-spin" />}
                MFA 인증
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
