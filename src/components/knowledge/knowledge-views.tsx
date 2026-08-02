"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  useCreateKnowledge,
  useDeleteKnowledge,
  useKnowledge,
  useKnowledgeDraft,
  useKnowledgeItem,
  useUpdateKnowledge,
} from "@/hooks/use-knowledge";
import { useEvidence } from "@/hooks/use-evidence";
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
import { toast } from "sonner";
import { useI18n } from "@/i18n";

export function KnowledgeList() {
  const { t, locale } = useI18n();
  const { data, isLoading, error } = useKnowledge();
  const remove = useDeleteKnowledge();

  return (
    <div>
      <PageHeader
        title={t("knowledge.title")}
        description={t("knowledge.description")}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/live-sessions">{t("knowledge.cta.sessions")}</Link>
            </Button>
            <Button asChild>
              <Link href="/knowledge/new">{t("knowledge.new")}</Link>
            </Button>
          </div>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">{t("knowledge.help.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{t("knowledge.help.what")}</p>
          <p>{t("knowledge.help.when")}</p>
          <p>{t("knowledge.help.how")}</p>
        </CardContent>
      </Card>

      {isLoading ? <ListSkeleton /> : null}
      {error ? (
        <EmptyState
          title={t("common.failedLoad")}
          description={(error as Error).message}
        />
      ) : null}
      {data?.items.length === 0 ? (
        <EmptyState
          title={t("knowledge.empty")}
          description={t("knowledge.emptyHint")}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/live-sessions">{t("knowledge.cta.sessions")}</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/guide">{t("nav.guide")}</Link>
              </Button>
            </div>
          }
        />
      ) : null}
      <div className="space-y-3">
        {(data?.items as Array<{
          id: string;
          title: string;
          description: string;
          confidence: number;
          updatedAt: string;
          tags: Array<{ id: string; name: string }>;
        }> | undefined)?.map((k) => (
          <Card key={k.id}>
            <CardContent className="flex justify-between gap-3 p-4">
              <div className="space-y-2">
                <Link
                  href={`/knowledge/${k.id}`}
                  className="font-semibold hover:text-primary"
                >
                  {k.title}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {truncate(k.description)}
                </p>
                <TagList tags={k.tags} />
                <p className="text-xs text-muted-foreground">
                  {t("common.updated")} {formatDate(k.updatedAt, locale)} ·{" "}
                  {t("knowledge.field.confidence")}{" "}
                  {(k.confidence * 100).toFixed(0)}%
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/knowledge/${k.id}/edit`}>{t("common.edit")}</Link>
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (confirm(t("knowledge.confirmDelete")))
                      remove.mutate(k.id);
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

export function KnowledgeForm({
  mode,
  id,
  initial,
}: {
  mode: "create" | "edit";
  id?: string;
  initial?: {
    title?: string;
    description?: string;
    confidence?: number;
    problemId?: string | null;
    evidenceIds?: string[];
    tags?: string[];
  };
}) {
  const { t } = useI18n();
  const router = useRouter();
  const search = useSearchParams();
  const create = useCreateKnowledge();
  const update = useUpdateKnowledge(id ?? "");
  const draft = useKnowledgeDraft();
  const problems = useProblems({ pageSize: 100 });
  const evidence = useEvidence({ pageSize: 100 });
  const [values, setValues] = useState({
    title: initial?.title || "",
    description: initial?.description || "",
    confidence: initial?.confidence ?? 0.5,
    problemId: initial?.problemId || search.get("problemId") || "",
    evidenceIds: initial?.evidenceIds || [],
    tags: initial?.tags || [],
  });

  const evidenceItems = useMemo(
    () =>
      (evidence.data?.items as Array<{ id: string; observation: string }>) ??
      [],
    [evidence.data],
  );

  async function generateDraft() {
    if (values.evidenceIds.length === 0) {
      toast.error(t("knowledge.selectEvidenceFirst"));
      return;
    }
    const result = await draft.mutateAsync(values.evidenceIds);
    setValues((v) => ({
      ...v,
      title: result.title,
      description: result.description,
      confidence: result.confidence,
    }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title: values.title,
      description: values.description,
      confidence: values.confidence,
      problemId: values.problemId || null,
      evidenceIds: values.evidenceIds,
      tags: values.tags,
    };
    if (mode === "create") {
      const created = (await create.mutateAsync(payload)) as { id: string };
      router.push(`/knowledge/${created.id}`);
    } else if (id) {
      await update.mutateAsync(payload);
      router.push(`/knowledge/${id}`);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0 gap-4">
        <div className="space-y-1">
          <CardTitle>
            {mode === "create" ? t("knowledge.new") : t("knowledge.edit")}
          </CardTitle>
          <p className="text-sm font-normal text-muted-foreground">
            {t("knowledge.form.hint")}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={draft.isPending}
          onClick={generateDraft}
        >
          {draft.isPending ? t("common.drafting") : t("knowledge.aiDraft")}
        </Button>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label>{t("common.title")}</Label>
            <Input
              required
              placeholder={t("knowledge.field.titleHint")}
              value={values.title}
              onChange={(e) =>
                setValues((v) => ({ ...v, title: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>{t("knowledge.field.body")}</Label>
            <Textarea
              required
              rows={8}
              value={values.description}
              onChange={(e) =>
                setValues((v) => ({ ...v, description: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>
              {t("knowledge.field.problem")} ({t("common.optional")})
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
            <Label>
              {t("knowledge.field.confidence")} ({values.confidence.toFixed(2)})
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
            <Label>{t("knowledge.field.evidence")}</Label>
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border p-3">
              {evidenceItems.map((e) => (
                <label key={e.id} className="flex gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={values.evidenceIds.includes(e.id)}
                    onChange={() =>
                      setValues((v) => ({
                        ...v,
                        evidenceIds: v.evidenceIds.includes(e.id)
                          ? v.evidenceIds.filter((x) => x !== e.id)
                          : [...v.evidenceIds, e.id],
                      }))
                    }
                  />
                  <span>{truncate(e.observation, 120)}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("common.tags")}</Label>
            <TagInput
              value={values.tags}
              onChange={(tags) => setValues((v) => ({ ...v, tags }))}
            />
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

export function KnowledgeDetail({ id }: { id: string }) {
  const { t, locale } = useI18n();
  const { data, isLoading, error } = useKnowledgeItem(id);
  const remove = useDeleteKnowledge();
  const router = useRouter();

  if (isLoading) return <ListSkeleton />;
  if (error || !data)
    return <EmptyState title={t("knowledge.notFound")} />;

  const item = data as {
    id: string;
    title: string;
    description: string;
    confidence: number;
    updatedAt: string;
    tags: Array<{ id: string; name: string }>;
    problem?: { id: string; title: string } | null;
    evidences: Array<{
      evidence: { id: string; observation: string };
    }>;
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <Link href={`/knowledge/${id}/edit`}>{t("common.edit")}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/capabilities/new?knowledgeId=${id}`}>
            {t("capabilities.newFromKnowledge")}
          </Link>
        </Button>
        <Button
          variant="destructive"
          onClick={async () => {
            if (!confirm(t("knowledge.confirmDelete"))) return;
            await remove.mutateAsync(id);
            router.push("/knowledge");
          }}
        >
          {t("common.delete")}
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{item.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="whitespace-pre-wrap">{item.description}</p>
          <TagList tags={item.tags} />
          <div className="text-muted-foreground">
            {t("knowledge.field.confidence")}{" "}
            {(item.confidence * 100).toFixed(0)}% · {t("common.updated")}{" "}
            {formatDate(item.updatedAt, locale)}
            {item.problem ? (
              <>
                {" "}
                ·{" "}
                <Link
                  className="text-primary underline"
                  href={`/problems/${item.problem.id}`}
                >
                  {item.problem.title}
                </Link>
              </>
            ) : null}
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase text-muted-foreground">
              {t("knowledge.field.evidence")}
            </div>
            {item.evidences.map(({ evidence }) => (
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
