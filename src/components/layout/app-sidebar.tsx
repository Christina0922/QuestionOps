"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BookOpen,
  CircleHelp,
  LayoutDashboard,
  Lightbulb,
  Menu,
  Radio,
  Search,
  Settings,
  Wrench,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import type { MessageKey } from "@/i18n";

const nav: Array<{ href: string; labelKey: MessageKey; icon: typeof LayoutDashboard }> = [
  { href: "/", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/guide", labelKey: "nav.guide", icon: CircleHelp },
  { href: "/live-sessions", labelKey: "nav.liveSessions", icon: Radio },
  { href: "/knowledge", labelKey: "nav.knowledge", icon: BookOpen },
  { href: "/capabilities", labelKey: "nav.capabilities", icon: Wrench },
  { href: "/search", labelKey: "nav.search", icon: Search },
  { href: "/settings/integrations/youtube", labelKey: "nav.youtube", icon: Settings },
  { href: "/activity", labelKey: "nav.activity", icon: Activity },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { t } = useI18n();

  const content = (
    <div className="flex h-full flex-col">
      <Link
        href="/"
        onClick={() => setOpen(false)}
        className="flex items-center gap-2 border-b border-sidebar-border px-4 py-4 transition-colors hover:bg-accent/40"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Lightbulb className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight">
            {t("app.name")}
          </div>
          <div className="text-xs text-muted-foreground">{t("app.tagline")}</div>
        </div>
      </Link>
      <nav className="flex-1 space-y-1 p-3">
        {nav.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-accent/60 hover:text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar md:block">
        {content}
      </aside>
      <div className="md:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="fixed left-3 top-3 z-40"
          onClick={() => setOpen(true)}
          aria-label={t("nav.openMenu")}
        >
          <Menu className="h-5 w-5" />
        </Button>
        {open ? (
          <div className="fixed inset-0 z-50 flex">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setOpen(false)}
            />
            <div className="relative z-10 h-full w-64 bg-sidebar shadow-xl">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
              {content}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
