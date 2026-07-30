"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

const bypass =
  process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true" ||
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function AppHeader({ title }: { title?: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur md:px-6">
      <div className="pl-10 md:pl-0">
        <h1 className="text-sm font-semibold md:text-base">
          {title ?? "QuestionOps"}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/search">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search</span>
          </Link>
        </Button>
        <ThemeToggle />
        {bypass ? (
          <div className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
            Dev User
          </div>
        ) : (
          <UserButton afterSignOutUrl="/sign-in" />
        )}
      </div>
    </header>
  );
}
