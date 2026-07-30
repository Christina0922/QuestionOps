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

export function SearchView() {
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
        title="Search"
        description="Find problems, evidence, knowledge, and capabilities."
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
          placeholder="Search…"
        />
        <Button type="submit">Search</Button>
      </form>
      {isLoading || isFetching ? <ListSkeleton /> : null}
      {error ? (
        <EmptyState title="Search failed" description={(error as Error).message} />
      ) : null}
      {!submitted ? (
        <EmptyState title="Enter a query to search" />
      ) : null}
      {data && data.items.length === 0 ? (
        <EmptyState title="No results" description={`Nothing matched “${submitted}”.`} />
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
                Updated {formatDate(hit.updatedAt)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function ActivityView() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useActivity(page);

  return (
    <div>
      <PageHeader
        title="Activity"
        description="Audit trail of creates, updates, and deletes."
      />
      {isLoading ? <ListSkeleton /> : null}
      {error ? (
        <EmptyState title="Failed to load" description={(error as Error).message} />
      ) : null}
      {data?.items.length === 0 ? (
        <EmptyState title="No activity yet" />
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
                  {item.user?.name || item.user?.email || "System"}
                </p>
              </div>
              <div className="shrink-0 text-xs text-muted-foreground">
                {formatDate(item.createdAt)}
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
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
