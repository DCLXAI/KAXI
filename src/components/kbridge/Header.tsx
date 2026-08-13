"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLangStore } from "@/store/kbridge";
import { useKaxiSession } from "@/hooks/useKaxiSession";
import { LANGS, tr, type Lang } from "@/lib/i18n/translations";
import { viewToPath } from "@/lib/kbridge/views";
import { Button } from "@/components/ui/button";
import { KaxiPawMark } from "@/components/brand/KaxiPawMark";
import { KaxiRunningCat } from "@/components/brand/KaxiRunningCat";
import { KarxyWordmark } from "@/components/brand/KarxyWordmark";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import {
  Calculator,
  ChevronDown,
  Compass,
  FileText,
  Gamepad2,
  Globe,
  Handshake,
  LayoutDashboard,
  LogOut,
  Menu,
  School,
  User,
  type LucideIcon,
} from "lucide-react";

// The VISA QUEST game is a separate app (a fun funnel into the diagnosis flow).
const GAME_URL = "https://mirror-rouge-sigma.vercel.app";

// Active desktop-nav treatment: lavender tint + a primary-strong underline bar
// that sits exactly on the header's bottom hairline (h-8 button in h-16 header).
const ACTIVE_NAV =
  "relative bg-primary/25 text-primary-foreground hover:bg-primary/35 hover:text-primary-foreground dark:bg-primary/15 dark:text-primary-strong dark:hover:bg-primary/25 after:absolute after:inset-x-3 after:-bottom-4 after:h-[2px] after:rounded-full after:bg-primary-strong";

// Active mobile-sheet treatment: same lavender tint with a left indicator bar.
function mobileItemClass(active: boolean): string {
  return `relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors hover:bg-accent ${
    active
      ? "bg-primary/20 text-primary-foreground hover:bg-primary/30 dark:bg-primary/15 dark:text-primary-strong before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-primary-strong"
      : "text-foreground"
  }`;
}

// The game supports EN/KO/VI/RU; KARXY's Mongolian has no game equivalent, so it opens in English.
const GAME_LANG: Record<Lang, string> = { ko: "KO", vi: "VI", mn: "EN", en: "EN" };

function gameHref(activeLang: Lang): string {
  return `${GAME_URL}/?lang=${GAME_LANG[activeLang] ?? "EN"}`;
}

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

interface HeaderNavItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon | typeof KaxiPawMark;
  /** External destination (opens in a new tab); rendered as a plain anchor, never "active". */
  external?: boolean;
}

interface HeaderNavGroup {
  key: string;
  label: string;
  items: HeaderNavItem[];
}

function DesktopNavGroup({
  currentView,
  group,
}: {
  currentView: string;
  group: HeaderNavGroup;
}) {
  const active = group.items.some((item) => item.key === currentView);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={active ? `gap-1 ${ACTIVE_NAV}` : "gap-1"}>
          {group.label}
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52">
        {group.items.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem key={item.key} asChild>
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

function DesktopNavLink({ currentView, item }: { currentView: string; item: HeaderNavItem }) {
  const Icon = item.icon;

  if (item.external) {
    return (
      <Button variant="ghost" size="sm" asChild>
        <a href={item.href} target="_blank" rel="noopener noreferrer" className="gap-1.5">
          <Icon className="h-3.5 w-3.5" />
          {item.label}
        </a>
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      asChild
      className={currentView === item.key ? ACTIVE_NAV : undefined}
    >
      <Link href={item.href} className="gap-1.5">
        <Icon className="h-3.5 w-3.5" />
        {item.label}
      </Link>
    </Button>
  );
}

interface MobileNavAccount {
  authenticated: boolean;
  label: string;
  email?: string;
  isAdmin: boolean;
  adminHref: string;
  adminLabel: string;
  loginHref: string;
  loginLabel: string;
  logoutLabel: string;
  onLogout: () => void;
}

function MobileNav({
  currentView,
  groups,
  items,
  label,
  account,
}: {
  currentView: string;
  groups: HeaderNavGroup[];
  items: HeaderNavItem[];
  label: string;
  account: MobileNavAccount;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="xl:hidden" aria-label={label}>
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(88vw,22rem)]">
        <SheetHeader className="border-b border-border/70 bg-muted/50">
          <SheetTitle className="flex items-center gap-2.5">
            <KaxiRunningCat size={26} />
            <KarxyWordmark className="h-6 w-auto" aria-label="KARXY" />
          </SheetTitle>
          <SheetDescription className="sr-only">{label}</SheetDescription>
        </SheetHeader>
        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pb-6" aria-label={label}>
          {groups.map((group) => (
            <div key={group.key} className="space-y-1">
              <p className="px-3 text-xs font-medium text-muted-foreground">{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = currentView === item.key;
                return (
                  <SheetClose key={item.key} asChild>
                    <Link href={item.href} className={mobileItemClass(active)}>
                      <Icon className={`h-4 w-4 ${active ? "text-primary-strong" : "text-muted-foreground"}`} />
                      {item.label}
                    </Link>
                  </SheetClose>
                );
              })}
            </div>
          ))}
          <div className="space-y-1 border-t pt-4">
            {items.map((item) => {
              const Icon = item.icon;
              const active = currentView === item.key;
              const itemClass = mobileItemClass(active);
              const iconClass = `h-4 w-4 ${active ? "text-primary-strong" : "text-muted-foreground"}`;
              return (
                <SheetClose key={item.key} asChild>
                  {item.external ? (
                    <a href={item.href} target="_blank" rel="noopener noreferrer" className={itemClass}>
                      <Icon className={iconClass} />
                      {item.label}
                    </a>
                  ) : (
                    <Link href={item.href} className={itemClass}>
                      <Icon className={iconClass} />
                      {item.label}
                    </Link>
                  )}
                </SheetClose>
              );
            })}
          </div>
          <div className="space-y-1 border-t pt-4">
            {account.authenticated ? (
              <>
                {account.email && (
                  <p className="truncate px-3 text-xs text-muted-foreground">{account.email}</p>
                )}
                {account.isAdmin && (
                  <SheetClose asChild>
                    <Link
                      href={account.adminHref}
                      className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                    >
                      <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                      {account.adminLabel}
                    </Link>
                  </SheetClose>
                )}
                <SheetClose asChild>
                  <button
                    type="button"
                    onClick={account.onLogout}
                    className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium text-destructive transition-colors hover:bg-accent"
                  >
                    <LogOut className="h-4 w-4" />
                    {account.logoutLabel}
                  </button>
                </SheetClose>
              </>
            ) : (
              <SheetClose asChild>
                <a
                  href={account.loginHref}
                  className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  {account.loginLabel}
                </a>
              </SheetClose>
            )}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
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
  const router = useRouter();
  const { data: session, mutate } = useKaxiSession();
  const role = session?.user?.role;
  const isAdmin = role === "PLATFORM_ADMIN";
  const accountLabel = role === "PLATFORM_ADMIN" ? "Admin" : role === "PARTNER_AGENT" ? "Partner" : "Student";

  const logout = async () => {
    await fetch("/api/auth/session", { method: "DELETE", credentials: "same-origin" });
    await mutate();
    router.push("/");
    router.refresh();
  };

  // Scroll-aware elevation: transparent hairline at rest, border + soft shadow
  // once content floats under the sticky header. Transition durations are
  // clamped by the global prefers-reduced-motion rule in globals.css.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const publicHref = (key: string) => viewToPath(key, locale);
  const navGroups: HeaderNavGroup[] = [
    {
      key: "prepare",
      label: tr("nav_study_prep", activeLang),
      items: [
        { key: "diagnose", label: tr("nav_diagnose", activeLang), href: publicHref("diagnose"), icon: Compass },
        { key: "schools", label: tr("nav_schools", activeLang), href: publicHref("schools"), icon: School },
        { key: "cost", label: tr("nav_cost", activeLang), href: publicHref("cost"), icon: Calculator },
      ],
    },
  ];
  const directNavItems: HeaderNavItem[] = [
    { key: "agent", label: tr("nav_agent", activeLang), href: publicHref("agent"), icon: KaxiPawMark },
    { key: "docs", label: tr("nav_my_docs", activeLang), href: publicHref("docs"), icon: FileText },
    { key: "partners", label: tr("nav_expert_support", activeLang), href: publicHref("partners"), icon: Handshake },
    { key: "game", label: tr("nav_game", activeLang), href: gameHref(activeLang), icon: Gamepad2, external: true },
  ];

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-[box-shadow,border-color] duration-300 ${
        scrolled
          ? "border-border/80 shadow-[0_6px_16px_-12px_rgb(31_30_29/0.25)] dark:shadow-[0_6px_16px_-12px_rgb(0_0_0/0.55)]"
          : "border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4">
        <Link
          href={viewToPath("home", locale)}
          aria-label="KARXY"
          className="group flex items-center gap-2 font-bold"
        >
          {/* 자리가 모자라면 장식이 먼저 빠지고 워드마크는 남는다.
              전에는 반대였다 — 워드마크가 400px 미만과 1024~1279px에서 숨겨져,
              375px짜리 화면(가장 흔한 폭이다)에는 64x32로 뭉개진 마스코트만
              남았다. 그 마스코트는 aria-hidden 장식이라 스크린리더에도 읽히지
              않으므로, 그 폭의 헤더에는 브랜드가 아예 존재하지 않았다.
              1024~1279px 쪽은 아래 내비 분기점을 xl로 올려 원인을 없앴다. */}
          <KaxiRunningCat size={32} className="hidden min-[360px]:inline-flex" />
          <KarxyWordmark className="h-7 w-auto transition-transform duration-200 group-hover:-translate-y-0.5" priority />
        </Link>
        {/* lg(1024px)이 아니라 xl(1280px)에서 펼친다.
            lg에서 펼치면 1024~1279px 구간에서 몽골어 라벨 다섯 개가 폭을 다 써
            헤더가 가로로 넘치고 오른쪽 끝의 로그인 링크가 잘려 나갔다. 프로덕션에서
            이미 그렇게 나가고 있었고, 브랜드 자리를 만들려고 워드마크를 그 구간에서
            숨긴 것도 같은 원인의 증상이었다. 분기점을 올리면 그 구간은 햄버거로
            내려가고, 브랜드와 내비가 둘 다 온전히 들어간다. */}
        <nav className="ml-4 hidden items-center gap-1 xl:flex" aria-label={tr("nav_menu", activeLang)}>
          {navGroups.map((group) => (
            <DesktopNavGroup key={group.key} currentView={currentView} group={group} />
          ))}
          {directNavItems.map((item) => (
            <DesktopNavLink key={item.key} currentView={currentView} item={item} />
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <MobileNav
            currentView={currentView}
            groups={navGroups}
            items={directNavItems}
            label={tr("nav_menu", activeLang)}
            account={{
              authenticated: Boolean(session?.authenticated && session.user),
              label: accountLabel,
              email: session?.user?.email ?? undefined,
              isAdmin,
              adminHref: "/admin/cases",
              adminLabel: tr("nav_admin_console", activeLang),
              loginHref: `/login?lang=${activeLang}`,
              loginLabel: tr("nav_login", activeLang),
              logoutLabel: tr("nav_logout", activeLang),
              onLogout: logout,
            }}
          />
          <LangSwitcher currentView={currentView} locale={locale} />
          {session?.authenticated && session.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{accountLabel}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="max-w-64 truncate text-xs font-normal text-muted-foreground">
                  {session.user.email}
                </DropdownMenuLabel>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin/cases" className="gap-1.5">
                      <LayoutDashboard className="h-3.5 w-3.5" />
                      {tr("nav_admin_console", activeLang)}
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-destructive gap-1.5"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {tr("nav_logout", activeLang)}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="sm" asChild className="gap-1.5">
              <a href={`/login?lang=${activeLang}`}>
                <User className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tr("nav_login", activeLang)}</span>
              </a>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
