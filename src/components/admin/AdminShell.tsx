"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import {
  Activity,
  BookMarked,
  ChevronDown,
  ClipboardList,
  FileClock,
  FileSearch,
  Headphones,
  Loader2,
  LogOut,
  Menu,
  Scale,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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

interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface AdminNavGroup {
  key: string;
  label: string;
  items: AdminNavItem[];
}

const navGroups: AdminNavGroup[] = [
  {
    key: "work",
    label: "업무",
    items: [
      { href: "/admin/leads", label: "진단 리드", icon: Users },
      { href: "/admin/cases", label: "케이스", icon: ClipboardList },
      { href: "/admin/documents", label: "서류검증", icon: FileSearch },
      { href: "/admin/handoffs", label: "상담전환", icon: Headphones },
    ],
  },
  {
    key: "content",
    label: "정책·지식",
    items: [
      { href: "/admin/rules", label: "룰", icon: Scale },
      { href: "/admin/knowledge", label: "지식", icon: BookMarked },
    ],
  },
  {
    key: "system",
    label: "시스템",
    items: [
      { href: "/admin/ops", label: "운영", icon: Activity },
      { href: "/admin/audit", label: "감사", icon: FileClock },
    ],
  },
];

function isAdminNavItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AdminNavDropdown({ group, pathname }: { group: AdminNavGroup; pathname: string }) {
  const active = group.items.some((item) => isAdminNavItemActive(pathname, item.href));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={active ? "secondary" : "ghost"} size="sm" className="gap-1">
          {group.label}
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        {group.items.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem key={item.href} asChild>
              <Link href={item.href} className="gap-2">
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AdminMobileNav({ pathname }: { pathname: string }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="관리 메뉴 열기">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(88vw,22rem)]">
        <SheetHeader className="border-b">
          <SheetTitle>KAXI Admin</SheetTitle>
          <SheetDescription className="sr-only">관리 메뉴</SheetDescription>
        </SheetHeader>
        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pb-6" aria-label="관리 메뉴">
          {navGroups.map((group) => (
            <div key={group.key} className="space-y-1">
              <p className="px-2 text-xs font-medium text-muted-foreground">{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isAdminNavItemActive(pathname, item.href);
                return (
                  <SheetClose key={item.href} asChild>
                    <Link
                      href={item.href}
                      className={`flex h-10 items-center gap-3 rounded-md px-2 text-sm font-medium transition-colors hover:bg-accent ${
                        active ? "bg-accent text-accent-foreground" : "text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {item.label}
                    </Link>
                  </SheetClose>
                );
              })}
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function AdminAuthGate({ authenticated, available, nextPath, onSignOut }: { authenticated: boolean; available: boolean; nextPath: string; onSignOut: () => void }) {
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
              <Link href={`/login?next=${encodeURIComponent(nextPath)}`}>로그인</Link>
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
    window.location.assign(`/login?next=${encodeURIComponent(pathname)}`);
  }, [mutate, pathname]);

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
        nextPath={pathname}
        onSignOut={signOut}
      />
    );
  }

  return (
    <AdminContext.Provider value={context}>
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
            <Link href="/" className="flex items-center gap-2 font-semibold" aria-label="KAXI 홈으로 이동">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-black text-primary-foreground">
                K
              </span>
              <span>KAXI Admin</span>
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {navGroups.map((group) => (
                <AdminNavDropdown key={group.key} group={group} pathname={pathname} />
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <AdminMobileNav pathname={pathname} />
              <Badge variant="outline" className="hidden gap-1 sm:inline-flex">
                <ShieldCheck className="h-3 w-3" />
                Supabase Auth
              </Badge>
              <Button variant="outline" size="sm" onClick={signOut} aria-label="로그아웃">
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </div>
    </AdminContext.Provider>
  );
}
