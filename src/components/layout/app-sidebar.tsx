"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BookOpen,
  Boxes,
  CircleDot,
  FileSearch,
  LayoutDashboard,
  Lightbulb,
  Menu,
  Search,
  Wrench,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/problems", label: "Problems", icon: CircleDot },
  { href: "/evidence", label: "Evidence", icon: FileSearch },
  { href: "/clusters", label: "Clusters", icon: Boxes },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/capabilities", label: "Capabilities", icon: Wrench },
  { href: "/search", label: "Search", icon: Search },
  { href: "/activity", label: "Activity", icon: Activity },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-sidebar-border px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Lightbulb className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight">QuestionOps</div>
          <div className="text-xs text-muted-foreground">Evidence → Capability</div>
        </div>
      </div>
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
              {item.label}
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
          aria-label="Open menu"
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
