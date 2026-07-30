"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useI18n } from "@/i18n";

const bypass =
  process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true" ||
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function AppHeader({ title }: { title?: string }) {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur md:px-6">
      <div className="pl-10 md:pl-0">
        <Link
          href="/"
          className="text-sm font-semibold hover:text-primary md:text-base"
        >
          {title ?? t("app.name")}
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/search">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">{t("common.search")}</span>
          </Link>
        </Button>
        <LanguageToggle />
        <ThemeToggle />
        {bypass ? (
          <div className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
            {t("app.devUser")}
          </div>
        ) : (
          <UserButton afterSignOutUrl="/sign-in" />
        )}
      </div>
    </header>
  );
}
