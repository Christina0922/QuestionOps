"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useActivity, useSearch } from "@/hooks/use-meta";
import { PageHeader } from "@/components/shared/page-header";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { useI18n } from "@/i18n";

export function SearchView() {
  const { t, locale } = useI18n();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initial = searchParams.get("q") || "";
  const [q, setQ] = useState(initial);
  const [submitted, setSubmitted] = useState(initial);
  const { data, isLoading, error, isFetching } = useSearch(
    submitted,
    submitted.trim().length > 0,
  );

  return (
    <div>
      <PageHeader
        title={t("search.title")}
        description={t("search.description")}
      />
      <form
        className="mb-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(q.trim());
          router.replace(`/search?q=${encodeURIComponent(q.trim())}`);
        }}
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search.placeholder")}
        />
        <Button type="submit">{t("common.search")}</Button>
      </form>
      {isLoading || isFetching ? <ListSkeleton /> : null}
      {error ? (
        <EmptyState
          title={t("search.failed")}
          description={(error as Error).message}
        />
      ) : null}
      {!submitted ? (
        <EmptyState title={t("search.enterQuery")} />
      ) : null}
      {data && data.items.length === 0 ? (
        <EmptyState
          title={t("search.noResults")}
          description={t("search.noResultsHint", { q: submitted })}
        />
      ) : null}
      <div className="space-y-3">
        {data?.items.map((hit) => (
          <Card key={`${hit.entityType}-${hit.id}`}>
            <CardContent className="p-4">
              <div className="mb-2">
                <Badge variant="outline">{hit.entityType}</Badge>
              </div>
              <Link
                href={hit.href}
                className="font-semibold hover:text-primary"
              >
                {hit.title}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">{hit.snippet}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("common.updated")} {formatDate(hit.updatedAt, locale)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function ActivityView() {
  const { t, locale } = useI18n();
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useActivity(page);

  return (
    <div>
      <PageHeader
        title={t("activity.title")}
        description={t("activity.description")}
      />
      {isLoading ? <ListSkeleton /> : null}
      {error ? (
        <EmptyState
          title={t("activity.failed")}
          description={(error as Error).message}
        />
      ) : null}
      {data?.items.length === 0 ? (
        <EmptyState title={t("activity.empty")} />
      ) : null}
      <div className="space-y-3">
        {(data?.items as Array<{
          id: string;
          action: string;
          entityType: string;
          summary: string;
          createdAt: string;
          user?: { name?: string | null; email: string } | null;
        }> | undefined)?.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex items-start justify-between gap-3 p-4">
              <div>
                <div className="mb-1 flex flex-wrap gap-2">
                  <Badge variant="secondary">{item.action}</Badge>
                  <Badge variant="outline">{item.entityType}</Badge>
                </div>
                <p className="text-sm">{item.summary}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.user?.name || item.user?.email || t("common.system")}
                </p>
              </div>
              <div className="shrink-0 text-xs text-muted-foreground">
                {formatDate(item.createdAt, locale)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {data && data.totalPages > 1 ? (
        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {t("common.previous")}
          </Button>
          <Button
            variant="outline"
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("common.next")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
