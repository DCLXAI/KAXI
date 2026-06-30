"use client";

import { useState } from "react";
import { useLangStore } from "@/store/kbridge";
import { LANGS, tr, type Lang } from "@/lib/i18n/translations";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

export function LangSwitcher() {
  const { lang, setLang } = useLangStore();
  const [open, setOpen] = useState(false);
  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];

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
              setLang(l.code as Lang);
              setOpen(false);
            }}
            className="gap-2"
          >
            <span className="text-base">{l.flag}</span>
            <span>{l.label}</span>
            {l.code === lang && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function NavItem({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-sm font-medium transition-colors hover:text-foreground ${
        active ? "text-foreground" : "text-muted-foreground"
      }`}
    >
      {label}
    </button>
  );
}

export function Header({
  currentView,
  onNavigate,
}: {
  currentView: string;
  onNavigate: (v: string) => void;
}) {
  const { lang } = useLangStore();

  const navItems = [
    { key: "home", label: tr("brand", lang) },
    { key: "diagnose", label: tr("nav_diagnose", lang) },
    { key: "schools", label: tr("nav_schools", lang) },
    { key: "cost", label: tr("nav_cost", lang) },
    { key: "docs", label: tr("nav_docs", lang) },
    { key: "partners", label: tr("nav_partners", lang) },
    { key: "admin", label: tr("nav_admin", lang) },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4">
        <button
          onClick={() => onNavigate("home")}
          className="flex items-center gap-2 font-bold"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-black">
            K
          </div>
          <span className="hidden sm:inline text-base">K-Bridge Gateway</span>
        </button>
        <nav className="ml-4 hidden md:flex items-center gap-4 overflow-x-auto">
          {navItems.slice(1).map((item) => (
            <NavItem
              key={item.key}
              active={currentView === item.key}
              onClick={() => onNavigate(item.key)}
              label={item.label}
            />
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LangSwitcher />
        </div>
      </div>
      {/* 모바일 네비 */}
      <div className="md:hidden border-t bg-muted/30">
        <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-x-auto px-4 py-2">
          {navItems.slice(1).map((item) => (
            <NavItem
              key={item.key}
              active={currentView === item.key}
              onClick={() => onNavigate(item.key)}
              label={item.label}
            />
          ))}
        </div>
      </div>
    </header>
  );
}
