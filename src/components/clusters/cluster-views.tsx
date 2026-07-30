"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  useCluster,
  useClusters,
  useCreateCluster,
  useDeleteCluster,
  useUpdateCluster,
} from "@/hooks/use-clusters";
import { useEvidence } from "@/hooks/use-evidence";
import { useProblems } from "@/hooks/use-problems";
import { apiFetch } from "@/lib/api-client";
import { PageHeader } from "@/components/shared/page-header";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, truncate } from "@/lib/utils";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

export function ClustersList() {
  const { t } = useI18n();
  const { data, isLoading, error } = useClusters();
  const remove = useDeleteCluster();

  return (
    <div>
      <PageHeader
        title={t("clusters.title")}
        description={t("clusters.description")}
        actionHref="/clusters/new"
        actionLabel={t("clusters.new")}
      />
      {isLoading ? <ListSkeleton /> : null}
      {error ? (
        <EmptyState
          title={t("common.failedLoad")}
          description={(error as Error).message}
        />
      ) : null}
      {data?.items.length === 0 ? (
        <EmptyState
          title={t("clusters.empty")}
          description={t("clusters.emptyHint")}
          action={
            <Button asChild>
              <Link href="/clusters/new">{t("clusters.new")}</Link>
            </Button>
          }
        />
      ) : null}
      <div className="space-y-3">
        {(data?.items as Array<{
          id: string;
          name: string;
          summary?: string | null;
          _count?: { evidences: number };
          problem?: { id: string; title: string } | null;
        }> | undefined)?.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex justify-between gap-3 p-4">
              <div>
                <Link
                  href={`/clusters/${c.id}`}
                  className="font-semibold hover:text-primary"
                >
                  {c.name}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                  {truncate(c.summary || "", 140)}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("clusters.evidenceCount", {
                    count: c._count?.evidences ?? 0,
                  })}
                  {c.problem ? ` · ${c.problem.title}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/clusters/${c.id}/edit`}>{t("common.edit")}</Link>
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (confirm(t("clusters.confirmDelete")))
                      remove.mutate(c.id);
                  }}
                >
                  {t("common.delete")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function ClusterForm({
  mode,
  id,
  initial,
}: {
  mode: "create" | "edit";
  id?: string;
  initial?: {
    name?: string;
    summary?: string;
    problemId?: string | null;
    evidenceIds?: string[];
  };
}) {
  const { t } = useI18n();
  const router = useRouter();
  const search = useSearchParams();
  const create = useCreateCluster();
  const update = useUpdateCluster(id ?? "");
  const problems = useProblems({ pageSize: 100 });
  const evidence = useEvidence({
    pageSize: 100,
    problemId: search.get("problemId") || undefined,
  });
  const [values, setValues] = useState({
    name: initial?.name || "",
    summary: initial?.summary || "",
    problemId: initial?.problemId || search.get("problemId") || "",
    evidenceIds: initial?.evidenceIds || [],
  });
  const [drafting, setDrafting] = useState(false);

  const evidenceItems = useMemo(
    () =>
      (evidence.data?.items as Array<{
        id: string;
        observation: string;
      }>) ?? [],
    [evidence.data],
  );

  function toggleEvidence(evidenceId: string) {
    setValues((v) => ({
      ...v,
      evidenceIds: v.evidenceIds.includes(evidenceId)
        ? v.evidenceIds.filter((x) => x !== evidenceId)
        : [...v.evidenceIds, evidenceId],
    }));
  }

  async function draftFromAi() {
    if (values.evidenceIds.length === 0) {
      toast.error(t("clusters.selectEvidenceFirst"));
      return;
    }
    setDrafting(true);
    try {
      const draft = await apiFetch<{ name: string; summary: string }>(
        "/api/ai/cluster-draft",
        {
          method: "POST",
          body: JSON.stringify({ evidenceIds: values.evidenceIds }),
        },
      );
      setValues((v) => ({
        ...v,
        name: draft.name,
        summary: draft.summary,
      }));
      toast.success(t("clusters.draftApplied"));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDrafting(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: values.name,
      summary: values.summary || null,
      problemId: values.problemId || null,
      evidenceIds: values.evidenceIds,
    };
    if (mode === "create") {
      const created = (await create.mutateAsync(payload)) as { id: string };
      router.push(`/clusters/${created.id}`);
    } else if (id) {
      await update.mutateAsync(payload);
      router.push(`/clusters/${id}`);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>
          {mode === "create" ? t("clusters.new") : t("clusters.edit")}
        </CardTitle>
        <Button
          type="button"
          variant="secondary"
          disabled={drafting}
          onClick={draftFromAi}
        >
          {drafting ? t("common.drafting") : t("clusters.aiDraft")}
        </Button>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label>{t("common.name")}</Label>
            <Input
              required
              value={values.name}
              onChange={(e) =>
                setValues((v) => ({ ...v, name: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>{t("common.summary")}</Label>
            <Textarea
              rows={4}
              value={values.summary}
              onChange={(e) =>
                setValues((v) => ({ ...v, summary: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>
              {t("evidence.field.problem")} ({t("common.optional")})
            </Label>
            <Select
              value={values.problemId || "none"}
              onValueChange={(v) =>
                setValues((s) => ({
                  ...s,
                  problemId: v === "none" ? "" : v,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("evidence.selectProblem")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("common.noneOption")}</SelectItem>
                {(
                  (problems.data?.items as Array<{ id: string; title: string }>) ??
                  []
                ).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("clusters.field.evidenceIds")}</Label>
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-3">
              {evidenceItems.map((e) => (
                <label
                  key={e.id}
                  className="flex cursor-pointer items-start gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={values.evidenceIds.includes(e.id)}
                    onChange={() => toggleEvidence(e.id)}
                  />
                  <span>{truncate(e.observation, 140)}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit">{t("common.save")}</Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function ClusterDetail({ id }: { id: string }) {
  const { t, locale } = useI18n();
  const { data, isLoading, error } = useCluster(id);
  const remove = useDeleteCluster();
  const router = useRouter();

  if (isLoading) return <ListSkeleton />;
  if (error || !data)
    return <EmptyState title={t("clusters.notFound")} />;

  const cluster = data as {
    id: string;
    name: string;
    summary?: string | null;
    updatedAt: string;
    problem?: { id: string; title: string } | null;
    evidences: Array<{
      evidence: {
        id: string;
        observation: string;
        confidence: number;
        createdAt: string;
      };
    }>;
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <Link href={`/clusters/${id}/edit`}>{t("common.edit")}</Link>
        </Button>
        <Button
          variant="destructive"
          onClick={async () => {
            if (!confirm(t("clusters.confirmDelete"))) return;
            await remove.mutateAsync(id);
            router.push("/clusters");
          }}
        >
          {t("common.delete")}
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{cluster.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="whitespace-pre-wrap text-muted-foreground">
            {cluster.summary || t("clusters.noSummary")}
          </p>
          <div className="text-muted-foreground">
            {t("common.updated")} {formatDate(cluster.updatedAt, locale)}
            {cluster.problem ? (
              <>
                {" "}
                · {t("entity.problem")}{" "}
                <Link
                  className="text-primary underline"
                  href={`/problems/${cluster.problem.id}`}
                >
                  {cluster.problem.title}
                </Link>
              </>
            ) : null}
          </div>
          <div className="space-y-2">
            {cluster.evidences.map(({ evidence }) => (
              <Link
                key={evidence.id}
                href={`/evidence/${evidence.id}`}
                className="block rounded-md border p-3 hover:bg-muted/40"
              >
                {truncate(evidence.observation, 160)}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
