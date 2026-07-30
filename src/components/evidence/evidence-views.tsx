"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  useCreateEvidence,
  useDeleteEvidence,
  useEvidence,
  useEvidenceItem,
  useUpdateEvidence,
} from "@/hooks/use-evidence";
import { useProblems } from "@/hooks/use-problems";
import { PageHeader } from "@/components/shared/page-header";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { TagInput } from "@/components/shared/tag-input";
import { TagList } from "@/components/shared/tag-list";
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
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n";

export function EvidenceList() {
  const { t, locale } = useI18n();
  const [q, setQ] = useState("");
  const { data, isLoading, error } = useEvidence({ q: q || undefined });
  const remove = useDeleteEvidence();

  return (
    <div>
      <PageHeader
        title={t("evidence.title")}
        description={t("evidence.description")}
        actionHref="/evidence/new"
        actionLabel={t("evidence.new")}
      />
      <Input
        className="mb-4"
        placeholder={t("evidence.filter")}
        value={q}
        onChange={(e) => setQ(e.target.value)}
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
          title={t("evidence.empty")}
          description={t("evidence.emptyHint")}
          action={
            <Button asChild>
              <Link href="/evidence/new">{t("problems.addEvidence")}</Link>
            </Button>
          }
        />
      ) : null}
      <div className="space-y-3">
        {(data?.items as Array<{
          id: string;
          observation: string;
          confidence: number;
          createdAt: string;
          problem?: { id: string; title: string } | null;
          tags: Array<{ id: string; name: string }>;
        }> | undefined)?.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:justify-between">
              <div className="space-y-2">
                <Link
                  href={`/evidence/${item.id}`}
                  className="font-medium hover:text-primary"
                >
                  {truncate(item.observation, 140)}
                </Link>
                <div className="text-xs text-muted-foreground">
                  {item.problem ? (
                    <Link
                      href={`/problems/${item.problem.id}`}
                      className="underline"
                    >
                      {item.problem.title}
                    </Link>
                  ) : (
                    t("evidence.noProblem")
                  )}{" "}
                  · {formatDate(item.createdAt, locale)} ·{" "}
                  {t("evidence.field.confidence")}{" "}
                  {(item.confidence * 100).toFixed(0)}%
                </div>
                <TagList tags={item.tags} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/evidence/${item.id}/edit`}>
                    {t("common.edit")}
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (confirm(t("evidence.confirmDelete")))
                      remove.mutate(item.id);
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

export function EvidenceForm({
  mode,
  id,
  initial,
}: {
  mode: "create" | "edit";
  id?: string;
  initial?: {
    problemId?: string;
    observation?: string;
    transcript?: string;
    screenshotUrl?: string;
    link?: string;
    confidence?: number;
    tags?: string[];
  };
}) {
  const { t } = useI18n();
  const router = useRouter();
  const search = useSearchParams();
  const problems = useProblems({ pageSize: 100 });
  const create = useCreateEvidence();
  const update = useUpdateEvidence(id ?? "");
  const [values, setValues] = useState({
    problemId: initial?.problemId || search.get("problemId") || "",
    observation: initial?.observation || "",
    transcript: initial?.transcript || "",
    screenshotUrl: initial?.screenshotUrl || "",
    link: initial?.link || "",
    confidence: initial?.confidence ?? 0.5,
    tags: initial?.tags || [],
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...values,
      screenshotUrl: values.screenshotUrl || null,
      link: values.link || null,
      transcript: values.transcript || null,
    };
    if (mode === "create") {
      const created = (await create.mutateAsync(payload)) as { id: string };
      router.push(`/evidence/${created.id}`);
    } else if (id) {
      await update.mutateAsync(payload);
      router.push(`/evidence/${id}`);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "create" ? t("evidence.new") : t("evidence.edit")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label>{t("evidence.field.problem")}</Label>
            <Select
              value={values.problemId}
              onValueChange={(problemId) =>
                setValues((v) => ({ ...v, problemId }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("evidence.selectProblem")} />
              </SelectTrigger>
              <SelectContent>
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
            <Label>{t("evidence.field.observation")}</Label>
            <Textarea
              required
              rows={5}
              value={values.observation}
              onChange={(e) =>
                setValues((v) => ({ ...v, observation: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>{t("evidence.field.transcript")}</Label>
            <Textarea
              rows={4}
              value={values.transcript}
              onChange={(e) =>
                setValues((v) => ({ ...v, transcript: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("evidence.field.screenshotUrl")}</Label>
              <Input
                value={values.screenshotUrl}
                onChange={(e) =>
                  setValues((v) => ({ ...v, screenshotUrl: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("evidence.field.link")}</Label>
              <Input
                value={values.link}
                onChange={(e) =>
                  setValues((v) => ({ ...v, link: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>
              {t("evidence.field.confidence")} ({values.confidence.toFixed(2)})
            </Label>
            <Input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={values.confidence}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  confidence: Number(e.target.value),
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>{t("common.tags")}</Label>
            <TagInput
              value={values.tags}
              onChange={(tags) => setValues((v) => ({ ...v, tags }))}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {create.isPending || update.isPending
                ? t("common.saving")
                : t("common.save")}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function EvidenceDetail({ id }: { id: string }) {
  const { t, locale } = useI18n();
  const { data, isLoading, error } = useEvidenceItem(id);
  const remove = useDeleteEvidence();
  const router = useRouter();

  if (isLoading) return <ListSkeleton />;
  if (error || !data) {
    return <EmptyState title={t("evidence.notFound")} />;
  }

  const item = data as {
    id: string;
    observation: string;
    transcript?: string | null;
    screenshotUrl?: string | null;
    link?: string | null;
    confidence: number;
    createdAt: string;
    problem?: { id: string; title: string } | null;
    tags: Array<{ id: string; name: string }>;
    author?: { name?: string | null; email: string } | null;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link href={`/evidence/${id}/edit`}>{t("common.edit")}</Link>
        </Button>
        <Button
          variant="destructive"
          onClick={async () => {
            if (!confirm(t("evidence.confirmDelete"))) return;
            await remove.mutateAsync(id);
            router.push("/evidence");
          }}
        >
          {t("common.delete")}
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("evidence.field.observation")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="whitespace-pre-wrap">{item.observation}</p>
          {item.transcript ? (
            <div>
              <div className="mb-1 text-xs uppercase text-muted-foreground">
                {t("evidence.field.transcript")}
              </div>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {item.transcript}
              </p>
            </div>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2 text-muted-foreground">
            <div>
              {t("evidence.field.problem")}:{" "}
              {item.problem ? (
                <Link
                  className="text-primary underline"
                  href={`/problems/${item.problem.id}`}
                >
                  {item.problem.title}
                </Link>
              ) : (
                t("common.none")
              )}
            </div>
            <div>
              {t("evidence.field.confidence")}:{" "}
              {(item.confidence * 100).toFixed(0)}%
            </div>
            <div>
              {t("evidence.field.author")}:{" "}
              {item.author?.name || item.author?.email || t("common.none")}
            </div>
            <div>
              {t("common.created")}: {formatDate(item.createdAt, locale)}
            </div>
          </div>
          <TagList tags={item.tags} />
          {item.link ? (
            <a
              className="text-primary underline"
              href={item.link}
              target="_blank"
              rel="noreferrer"
            >
              {t("evidence.externalLink")}
            </a>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
