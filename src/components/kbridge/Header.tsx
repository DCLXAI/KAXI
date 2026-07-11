"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLangStore } from "@/store/kbridge";
import { useKaxiSession } from "@/hooks/useKaxiSession";
import { LANGS, tr, type Lang } from "@/lib/i18n/translations";
import { viewToPath } from "@/lib/kbridge/views";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
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
  Bot,
  Calculator,
  ChevronDown,
  Compass,
  FileText,
  Globe,
  Handshake,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  School,
  User,
  type LucideIcon,
} from "lucide-react";

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
  icon: LucideIcon;
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
        <Button variant={active ? "secondary" : "ghost"} size="sm" className="gap-1">
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

  return (
    <Button variant={currentView === item.key ? "secondary" : "ghost"} size="sm" asChild>
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
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label={label}>
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(88vw,22rem)]">
        <SheetHeader className="border-b">
          <SheetTitle>KAXI</SheetTitle>
          <SheetDescription className="sr-only">{label}</SheetDescription>
        </SheetHeader>
        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pb-6" aria-label={label}>
          {groups.map((group) => (
            <div key={group.key} className="space-y-1">
              <p className="px-2 text-xs font-medium text-muted-foreground">{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <SheetClose key={item.key} asChild>
                    <Link
                      href={item.href}
                      className={`flex h-10 items-center gap-3 rounded-md px-2 text-sm font-medium transition-colors hover:bg-accent ${
                        currentView === item.key ? "bg-accent text-accent-foreground" : "text-foreground"
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
          <div className="space-y-1 border-t pt-4">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <SheetClose key={item.key} asChild>
                  <Link
                    href={item.href}
                    className={`flex h-10 items-center gap-3 rounded-md px-2 text-sm font-medium transition-colors hover:bg-accent ${
                      currentView === item.key ? "bg-accent text-accent-foreground" : "text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {item.label}
                  </Link>
                </SheetClose>
              );
            })}
          </div>
          <div className="space-y-1 border-t pt-4">
            {account.authenticated ? (
              <>
                {account.email && (
                  <p className="truncate px-2 text-xs text-muted-foreground">{account.email}</p>
                )}
                {account.isAdmin && (
                  <SheetClose asChild>
                    <Link
                      href={account.adminHref}
                      className="flex h-10 items-center gap-3 rounded-md px-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
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
                    className="flex h-10 w-full items-center gap-3 rounded-md px-2 text-left text-sm font-medium text-destructive transition-colors hover:bg-accent"
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
                  className="flex h-10 items-center gap-3 rounded-md px-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
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
    const client = await createSupabaseBrowserClient();
    await client.auth.signOut?.();
    await mutate();
    router.push("/");
    router.refresh();
  };

  const publicHref = (key: string) => viewToPath(key, locale);
  const navGroups: HeaderNavGroup[] = [
    {
      key: "support",
      label: tr("nav_ai_support", activeLang),
      items: [
        { key: "agent", label: tr("nav_agent", activeLang), href: publicHref("agent"), icon: Bot },
        { key: "consult", label: tr("nav_consult", activeLang), href: publicHref("consult"), icon: MessageCircle },
      ],
    },
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
    { key: "docs", label: tr("nav_my_docs", activeLang), href: publicHref("docs"), icon: FileText },
    { key: "partners", label: tr("nav_expert_support", activeLang), href: publicHref("partners"), icon: Handshake },
  ];

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
          <span className="hidden text-base xl:inline">KAXI</span>
        </Link>
        <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label={tr("nav_menu", activeLang)}>
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
