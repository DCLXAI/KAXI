"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useLangStore } from "@/store/kbridge";
import { LANGS, tr, type Lang } from "@/lib/i18n/translations";
import { viewToPath } from "@/lib/kbridge/views";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, LogOut, User } from "lucide-react";

export function LangSwitcher({
  currentView,
  locale,
}: {
  currentView?: string;
  locale?: Lang;
}) {
  const { lang, setLang } = useLangStore();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const activeLang = locale ?? lang;
  const current = LANGS.find((l) => l.code === activeLang) ?? LANGS[0];

  const switchTo = (nextLang: Lang) => {
    setLang(nextLang);
    setOpen(false);

    if (locale && currentView) {
      router.push(viewToPath(currentView, nextLang));
      return;
    }

    const [, maybeLocale, ...rest] = pathname.split("/");
    if (LANGS.some((item) => item.code === maybeLocale)) {
      router.push(`/${[nextLang, ...rest].join("/")}`);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="text-base">{current.flag}</span>
          <span className="hidden sm:inline">{current.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => {
              switchTo(l.code as Lang);
            }}
            className="gap-2"
          >
            <span className="text-base">{l.flag}</span>
            <span>{l.label}</span>
            {l.code === activeLang && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function NavItem({
  active,
  href,
  label,
}: {
  active: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`text-sm font-medium transition-colors hover:text-foreground ${
        active ? "text-foreground" : "text-muted-foreground"
      }`}
    >
      {label}
    </Link>
  );
}

export function Header({
  currentView,
  locale,
}: {
  currentView: string;
  locale?: Lang;
}) {
  const { lang } = useLangStore();
  const activeLang = locale ?? lang;
  const { data: session } = useSession();
  const isAdmin = ["owner", "admin", "viewer"].includes(session?.user?.role || "");

  const navItems = [
    { key: "home", label: tr("brand", activeLang) },
    { key: "agent", label: activeLang === "ko" ? "AI 에이전트" : "AI Agent" },
    { key: "consult", label: activeLang === "ko" ? "전문 상담" : activeLang === "vi" ? "Tư vấn" : activeLang === "mn" ? "Зөвлөгөө" : "Consult" },
    { key: "diagnose", label: tr("nav_diagnose", activeLang) },
    { key: "schools", label: tr("nav_schools", activeLang) },
    { key: "cost", label: tr("nav_cost", activeLang) },
    { key: "docs", label: tr("nav_docs", activeLang) },
    { key: "partners", label: tr("nav_partners", activeLang) },
    ...(isAdmin
      ? [
          { key: "admin", label: tr("nav_admin", activeLang) },
          { key: "synonyms", label: activeLang === "ko" ? "동의어" : "Synonyms" },
        ]
      : []),
  ];

  const hrefFor = (key: string) => {
    if (key === "admin") return "/admin";
    if (key === "synonyms") return "/admin/knowledge";
    return viewToPath(key, locale);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4">
        <Link
          href={viewToPath("home", locale)}
          className="flex items-center gap-2 font-bold"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-black">
            K
          </div>
          <span className="hidden sm:inline text-base">KAXI</span>
        </Link>
        <nav className="ml-4 hidden md:flex items-center gap-4 overflow-x-auto">
          {navItems.slice(1).map((item) => (
            <NavItem
              key={item.key}
              active={currentView === item.key}
              href={hrefFor(item.key)}
              label={item.label}
            />
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LangSwitcher currentView={currentView} locale={locale} />
          {isAdmin ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Admin</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-xs text-muted-foreground">
                  {session?.user?.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="text-destructive gap-1.5"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="sm" asChild className="gap-1.5">
              <a href="/login">
                <User className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">로그인</span>
              </a>
            </Button>
          )}
        </div>
      </div>
      {/* 모바일 네비 */}
      <div className="md:hidden border-t bg-muted/30">
        <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-x-auto px-4 py-2">
          {navItems.slice(1).map((item) => (
            <NavItem
              key={item.key}
              active={currentView === item.key}
              href={hrefFor(item.key)}
              label={item.label}
            />
          ))}
        </div>
      </div>
    </header>
  );
}
