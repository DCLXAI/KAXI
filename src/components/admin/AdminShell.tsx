"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Activity, AlertTriangle, BookMarked, ClipboardList, FileClock, FileSearch, Headphones, KeyRound, LogOut, Scale, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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

function AdminAuthGate({
  onUnlock,
  status,
}: {
  onUnlock: (key: string) => void;
  status: "loading" | "authenticated" | "unauthenticated";
}) {
  const [keyInput, setKeyInput] = useState("");

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-12">
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <KeyRound className="h-5 w-5" />
          </div>
          <CardTitle>행정사 Admin Dashboard</CardTitle>
          <CardDescription>
            세션 로그인 또는 임시 관리자 API 키로 접근합니다. 운영 데이터 API는 서버에서 다시 권한을 검증합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" asChild>
            <Link href="/login">관리자 로그인</Link>
          </Button>
          <div className="grid gap-2">
            <Input
              type="password"
              value={keyInput}
              onChange={(event) => setKeyInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && keyInput.trim()) onUnlock(keyInput.trim());
              }}
              placeholder="임시 관리자 API 키"
              autoComplete="off"
            />
            <Button variant="outline" onClick={() => keyInput.trim() && onUnlock(keyInput.trim())}>
              API 키로 접속
            </Button>
          </div>
          {status === "loading" && <p className="text-xs text-muted-foreground">세션 확인 중...</p>}
        </CardContent>
      </Card>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [adminKey, setAdminKey] = useState("");
  const role = session?.user?.role || "";
  const isSessionAdmin = ["owner", "admin", "viewer"].includes(role);
  const hasAdminAccess = isSessionAdmin || Boolean(adminKey);
  const canManageOps = Boolean(adminKey) || ["owner", "admin"].includes(role);

  const adminFetch = useCallback(
    (input: RequestInfo | URL, init: RequestInit = {}) => {
      const headers = new Headers(init.headers || {});
      if (adminKey) headers.set("x-admin-key", adminKey);
      if (!headers.has("content-type") && init.body) headers.set("content-type", "application/json");
      return fetch(input, { ...init, headers });
    },
    [adminKey]
  );

  const context = useMemo<AdminContextValue>(
    () => ({ hasAdminAccess, canManageOps, adminFetch }),
    [adminFetch, canManageOps, hasAdminAccess]
  );

  if (!hasAdminAccess) {
    return <AdminAuthGate onUnlock={setAdminKey} status={status} />;
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
              {isSessionAdmin ? (
                <Badge variant="outline" className="gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  {role}
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  API key
                </Badge>
              )}
              {isSessionAdmin && (
                <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              )}
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
