"use client";

import Link from "next/link";
import { useProblem, useDeleteProblem } from "@/hooks/use-problems";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { TagList } from "@/components/shared/tag-list";
import {
  PriorityBadge,
  StatusBadge,
} from "@/components/shared/status-badges";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, truncate } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useActivity } from "@/hooks/use-meta";
import { useI18n } from "@/i18n";

export function ProblemDetail({ id }: { id: string }) {
  const { data, isLoading, error } = useProblem(id);
  const remove = useDeleteProblem();
  const router = useRouter();
  const { t, locale } = useI18n();

  if (isLoading) return <ListSkeleton rows={5} />;
  if (error || !data) {
    return (
      <EmptyState
        title={t("problems.notFound")}
        description={(error as Error | undefined)?.message}
      />
    );
  }

  const problem = data as {
    id: string;
    title: string;
    description: string;
    source?: string | null;
    customer?: string | null;
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
    createdAt: string;
    updatedAt: string;
    tags: Array<{ id: string; name: string }>;
    reporter?: { name?: string | null; email: string } | null;
    evidences: Array<{
      id: string;
      observation: string;
      confidence: number;
      createdAt: string;
      author?: { name?: string | null } | null;
    }>;
    knowledge: Array<{ id: string; title: string; confidence: number }>;
    capabilities: Array<{ id: string; name: string }>;
    clusters: Array<{ id: string; name: string }>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {problem.title}
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <PriorityBadge priority={problem.priority} />
            <StatusBadge status={problem.status} />
            <TagList tags={problem.tags} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/problems/${id}/edit`}>{t("common.edit")}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/evidence/new?problemId=${id}`}>
              {t("problems.addEvidence")}
            </Link>
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              if (!confirm(t("problems.confirmDelete"))) return;
              await remove.mutateAsync(id);
              router.push("/problems");
            }}
          >
            {t("common.delete")}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("entity.problem")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="whitespace-pre-wrap leading-relaxed">
              {problem.description}
            </p>
            <dl className="grid grid-cols-2 gap-3 text-muted-foreground">
              <div>
                <dt className="text-xs uppercase tracking-wide">
                  {t("problems.field.customer")}
                </dt>
                <dd className="text-foreground">
                  {problem.customer || t("common.none")}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide">
                  {t("problems.field.source")}
                </dt>
                <dd className="text-foreground">
                  {problem.source || t("common.none")}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide">
                  {t("problems.field.reporter")}
                </dt>
                <dd className="text-foreground">
                  {problem.reporter?.name ||
                    problem.reporter?.email ||
                    t("common.none")}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide">
                  {t("common.updated")}
                </dt>
                <dd className="text-foreground">
                  {formatDate(problem.updatedAt, locale)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">
              {t("problems.evidenceTimeline")}
            </CardTitle>
            <Badge variant="secondary">{problem.evidences.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {problem.evidences.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("problems.noEvidence")}{" "}
                <Link
                  className="text-primary underline"
                  href={`/evidence/new?problemId=${id}`}
                >
                  {t("problems.addFirstEvidence")}
                </Link>
              </p>
            ) : (
              problem.evidences.map((e) => (
                <Link
                  key={e.id}
                  href={`/evidence/${e.id}`}
                  className="block rounded-md border p-3 transition-colors hover:bg-muted/40"
                >
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{formatDate(e.createdAt, locale)}</span>
                    <span>
                      {t("evidence.field.confidence")}{" "}
                      {(e.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-sm">{truncate(e.observation, 180)}</p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{t("problems.knowledge")}</CardTitle>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/knowledge/new?problemId=${id}`}>
                {t("common.add")}
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {problem.knowledge.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("problems.noneLinked")}
              </p>
            ) : (
              problem.knowledge.map((k) => (
                <Link
                  key={k.id}
                  href={`/knowledge/${k.id}`}
                  className="block rounded-md border p-3 text-sm hover:bg-muted/40"
                >
                  {k.title}
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">
              {t("problems.capabilities")}
            </CardTitle>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/capabilities/new?problemId=${id}`}>
                {t("common.add")}
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {problem.capabilities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("problems.noneLinked")}
              </p>
            ) : (
              problem.capabilities.map((c) => (
                <Link
                  key={c.id}
                  href={`/capabilities/${c.id}`}
                  className="block rounded-md border p-3 text-sm hover:bg-muted/40"
                >
                  {c.name}
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {problem.clusters.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("problems.clusters")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {problem.clusters.map((c) => (
              <Button key={c.id} variant="secondary" size="sm" asChild>
                <Link href={`/clusters/${c.id}`}>{c.name}</Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <ProblemHistory problemId={id} />
    </div>
  );
}

function ProblemHistory({ problemId }: { problemId: string }) {
  const { t, locale } = useI18n();
  const { data, isLoading } = useActivity(1, {
    entityType: "problem",
    entityId: problemId,
  });

  const items = (data?.items ?? []) as Array<{
    id: string;
    summary: string;
    action: string;
    createdAt: string;
    user?: { name?: string | null; email?: string } | null;
  }>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("problems.history")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("problems.noHistory")}
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
            >
              <div>
                <p className="text-sm">{item.summary}</p>
                <p className="text-xs text-muted-foreground">
                  {item.user?.name || item.user?.email || t("common.system")} ·{" "}
                  {item.action}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatDate(item.createdAt, locale)}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
