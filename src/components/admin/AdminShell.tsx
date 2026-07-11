"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { Activity, BookMarked, ClipboardList, FileClock, FileSearch, Headphones, Loader2, LogOut, Scale, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useKaxiSession } from "@/hooks/useKaxiSession";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

interface AdminContextValue {
  hasAdminAccess: boolean;
  canManageOps: boolean;
  adminFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdminApi() {
  const context = useContext(AdminContext);
  if (!context) throw new Error("useAdminApi must be used inside AdminShell");
  return context;
}

const navItems = [
  { href: "/admin/cases", label: "케이스", icon: ClipboardList },
  { href: "/admin/documents", label: "서류검증", icon: FileSearch },
  { href: "/admin/rules", label: "룰", icon: Scale },
  { href: "/admin/knowledge", label: "지식", icon: BookMarked },
  { href: "/admin/handoffs", label: "상담전환", icon: Headphones },
  { href: "/admin/ops", label: "운영", icon: Activity },
  { href: "/admin/audit", label: "감사", icon: FileClock },
];

function AdminAuthGate({ authenticated, available, onSignOut }: { authenticated: boolean; available: boolean; onSignOut: () => void }) {
  return (
    <div className="min-h-screen bg-muted/30 px-4 py-12">
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle>관리자 인증</CardTitle>
          <CardDescription>
            {!available
              ? "Supabase Auth 설정이 필요합니다."
              : authenticated
                ? "현재 계정에는 관리자 권한이 없습니다."
                : "Supabase 관리자 계정으로 로그인해주세요."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!available ? null : authenticated ? (
            <Button className="w-full" onClick={onSignOut}>다른 계정으로 로그인</Button>
          ) : (
            <Button className="w-full" asChild>
              <Link href="/login?next=/admin/cases">로그인</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: session, status, mutate } = useKaxiSession();
  const isSessionAdmin = session?.user?.role === "PLATFORM_ADMIN";
  const hasAdminAccess = isSessionAdmin;
  const canManageOps = hasAdminAccess;

  const adminFetch = useCallback(
    (input: RequestInfo | URL, init: RequestInit = {}) => {
      const headers = new Headers(init.headers || {});
      if (!headers.has("content-type") && init.body) headers.set("content-type", "application/json");
      return fetch(input, { ...init, headers });
    },
    []
  );

  const context = useMemo<AdminContextValue>(
    () => ({ hasAdminAccess, canManageOps, adminFetch }),
    [adminFetch, canManageOps, hasAdminAccess]
  );

  const signOut = useCallback(async () => {
    const client = await createSupabaseBrowserClient();
    await client.auth.signOut?.();
    await mutate();
    window.location.assign("/login?next=/admin/cases");
  }, [mutate]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!hasAdminAccess) {
    return (
      <AdminAuthGate
        authenticated={Boolean(session?.authenticated)}
        available={session?.available !== false}
        onSignOut={signOut}
      />
    );
  }

  return (
    <AdminContext.Provider value={context}>
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
            <Link href="/admin/cases" className="flex items-center gap-2 font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-black text-primary-foreground">
                K
              </span>
              <span>KAXI Admin</span>
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Button key={item.href} variant={active ? "secondary" : "ghost"} size="sm" asChild>
                    <Link href={item.href} className="gap-1.5">
                      <Icon className="h-3.5 w-3.5" />
                      {item.label}
                    </Link>
                  </Button>
                );
              })}
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <ShieldCheck className="h-3 w-3" />
                Supabase Auth
              </Badge>
              <Button variant="outline" size="sm" onClick={signOut} aria-label="로그아웃">
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="border-t bg-muted/30 md:hidden">
            <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-2">
              {navItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Button key={item.href} variant={active ? "secondary" : "ghost"} size="sm" asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </Button>
                );
              })}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </div>
    </AdminContext.Provider>
  );
}
