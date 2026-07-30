"use client";

import Link from "next/link";
import { useState } from "react";
import { useProblems, useDeleteProblem } from "@/hooks/use-problems";
import { PageHeader } from "@/components/shared/page-header";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { TagList } from "@/components/shared/tag-list";
import {
  PriorityBadge,
  StatusBadge,
} from "@/components/shared/status-badges";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, truncate } from "@/lib/utils";
import type { ProblemPriority, ProblemStatus } from "@/types";

type ProblemRow = {
  id: string;
  title: string;
  description: string;
  priority: ProblemPriority;
  status: ProblemStatus;
  customer?: string | null;
  updatedAt: string;
  tags: Array<{ id: string; name: string }>;
  _count?: { evidences: number; knowledge: number; capabilities: number };
};

export function ProblemsList() {
  const [q, setQ] = useState("");
  const { data, isLoading, error } = useProblems({ q: q || undefined });
  const remove = useDeleteProblem();

  return (
    <div>
      <PageHeader
        title="Problems"
        description="Customer problems under investigation."
        actionHref="/problems/new"
        actionLabel="New problem"
      />
      <div className="mb-4">
        <Input
          placeholder="Filter problems…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {isLoading ? <ListSkeleton /> : null}
      {error ? (
        <EmptyState title="Failed to load" description={(error as Error).message} />
      ) : null}
      {data && data.items.length === 0 ? (
        <EmptyState
          title="No problems yet"
          description="Create a customer problem to start collecting evidence."
          action={
            <Button asChild>
              <Link href="/problems/new">New problem</Link>
            </Button>
          }
        />
      ) : null}
      <div className="space-y-3">
        {(data?.items as ProblemRow[] | undefined)?.map((problem) => (
          <Card key={problem.id}>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-2">
                <Link
                  href={`/problems/${problem.id}`}
                  className="text-base font-semibold hover:text-primary"
                >
                  {problem.title}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {truncate(problem.description)}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <PriorityBadge priority={problem.priority} />
                  <StatusBadge status={problem.status} />
                  <TagList tags={problem.tags} />
                </div>
                <div className="text-xs text-muted-foreground">
                  Updated {formatDate(problem.updatedAt)}
                  {problem._count
                    ? ` · ${problem._count.evidences} evidence · ${problem._count.knowledge} knowledge · ${problem._count.capabilities} capabilities`
                    : null}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/problems/${problem.id}/edit`}>Edit</Link>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm("Delete this problem?")) remove.mutate(problem.id);
                  }}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
