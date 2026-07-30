"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  CircleDot,
  FileSearch,
  Search,
  Wrench,
} from "lucide-react";
import { useDashboard } from "@/hooks/use-meta";
import { PageHeader } from "@/components/shared/page-header";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const statCards = [
  { key: "problems" as const, label: "Problems", href: "/problems", icon: CircleDot },
  { key: "evidences" as const, label: "Evidence", href: "/evidence", icon: FileSearch },
  { key: "knowledge" as const, label: "Knowledge", href: "/knowledge", icon: BookOpen },
  { key: "capabilities" as const, label: "Capabilities", href: "/capabilities", icon: Wrench },
];

export function DashboardView() {
  const { data, isLoading, error } = useDashboard();
  const router = useRouter();
  const [q, setQ] = useState("");

  if (isLoading) return <ListSkeleton rows={6} />;
  if (error) {
    return (
      <EmptyState
        title="Could not load dashboard"
        description={(error as Error).message}
      />
    );
  }
  if (!data) return null;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Track problems through evidence, knowledge, and capability."
      />

      <form
        className="mb-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
        }}
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search problems, evidence, knowledge, capabilities…"
        />
        <Button type="submit">
          <Search className="h-4 w-4" />
          Search
        </Button>
      </form>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.key} href={card.href}>
              <Card className="transition-colors hover:border-primary/40">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {card.label}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold">
                    {data.totals[card.key]}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recently created</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentCreated.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items yet.</p>
            ) : (
              data.recentCreated.map((item) => (
                <Link
                  key={`${item.entityType}-${item.id}`}
                  href={item.href}
                  className="flex items-start justify-between gap-3 rounded-md border p-3 transition-colors hover:bg-muted/40"
                >
                  <div>
                    <div className="mb-1">
                      <Badge variant="outline">{item.entityType}</Badge>
                    </div>
                    <div className="text-sm font-medium">{item.title}</div>
                  </div>
                  <div className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(item.createdAt)}
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recently updated</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentUpdated.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items yet.</p>
            ) : (
              data.recentUpdated.map((item) => (
                <Link
                  key={`${item.entityType}-${item.id}`}
                  href={item.href}
                  className="flex items-start justify-between gap-3 rounded-md border p-3 transition-colors hover:bg-muted/40"
                >
                  <div>
                    <div className="mb-1">
                      <Badge variant="outline">{item.entityType}</Badge>
                    </div>
                    <div className="text-sm font-medium">{item.title}</div>
                  </div>
                  <div className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(item.updatedAt)}
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
