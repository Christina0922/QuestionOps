"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  Radio,
  Search,
  Wrench,
} from "lucide-react";
import { useLiveDashboard } from "@/hooks/use-live-sessions";
import { useDashboard } from "@/hooks/use-meta";
import { PageHeader } from "@/components/shared/page-header";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { useI18n } from "@/i18n";
import type { MessageKey } from "@/i18n";

const legacyStatCards = [
  {
    key: "knowledge" as const,
    labelKey: "dashboard.stat.knowledge" as MessageKey,
    href: "/knowledge",
    icon: BookOpen,
  },
  {
    key: "capabilities" as const,
    labelKey: "dashboard.stat.capabilities" as MessageKey,
    href: "/capabilities",
    icon: Wrench,
  },
];

export function DashboardView() {
  const { data: live, isLoading: liveLoading, error: liveError } =
    useLiveDashboard();
  const { data: legacy } = useDashboard();
  const router = useRouter();
  const [q, setQ] = useState("");
  const { t, locale } = useI18n();

  if (liveLoading) return <ListSkeleton rows={6} />;
  if (liveError) {
    return (
      <EmptyState
        title={t("dashboard.loadError")}
        description={(liveError as Error).message}
      />
    );
  }
  if (!live) return null;

  const liveStats = [
    { label: "오늘 세션", value: live.todaySessions, href: "/live-sessions" },
    { label: "질문", value: live.totals.questions, href: "/live-sessions" },
    { label: "생방 답변", value: live.totals.answered, href: "/live-sessions" },
    { label: "부분 답변", value: live.totals.partial, href: "/live-sessions" },
    { label: "미답변", value: live.totals.unanswered, href: "/live-sessions" },
    { label: "초안", value: live.draftCount, href: "/live-sessions" },
    { label: "검토 대기", value: live.reviewPending, href: "/live-sessions" },
  ];

  return (
    <div>
      <PageHeader
        title={t("dashboard.title")}
        description={t("dashboard.description")}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/live-sessions">{t("dashboard.guide.cta")}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/guide">{t("dashboard.guide.open")}</Link>
            </Button>
          </div>
        }
      />

      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-muted-foreground">
            {t("dashboard.guide.teaser")}
          </p>
          <Button variant="secondary" asChild>
            <Link href="/guide">{t("nav.guide")}</Link>
          </Button>
        </CardContent>
      </Card>

      <form
        className="mb-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim())
            router.push(`/search?q=${encodeURIComponent(q.trim())}`);
        }}
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("dashboard.searchPlaceholder")}
        />
        <Button type="submit">
          <Search className="h-4 w-4" />
          {t("common.search")}
        </Button>
      </form>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {liveStats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="transition-colors hover:border-primary/40">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.label}
                </CardTitle>
                <Radio className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {live.sessions.length > 0 ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">
              {t("dashboard.recentSessions")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {live.sessions.slice(0, 5).map((session) => (
              <Link
                key={session.id}
                href={`/live-sessions/${session.id}`}
                className="flex items-start justify-between gap-3 rounded-md border p-3 transition-colors hover:bg-muted/40"
              >
                <div>
                  <div className="mb-1 flex gap-2">
                    <Badge
                      variant={
                        session.status === "LIVE" ? "danger" : "outline"
                      }
                    >
                      {session.status}
                    </Badge>
                  </div>
                  <div className="text-sm font-medium">{session.title}</div>
                </div>
                <div className="shrink-0 text-xs text-muted-foreground">
                  {formatDate(session.updatedAt, locale)}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {legacy ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {legacyStatCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.key} href={card.href}>
                <Card className="transition-colors hover:border-primary/40">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {t(card.labelKey)}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-semibold">
                      {legacy.totals[card.key]}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
