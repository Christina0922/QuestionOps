"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  useCapabilities,
  useCapability,
  useCreateCapability,
  useDeleteCapability,
  useUpdateCapability,
} from "@/hooks/use-capabilities";
import { useKnowledge } from "@/hooks/use-knowledge";
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
import { useI18n } from "@/i18n";

export function CapabilitiesList() {
  const { t, locale } = useI18n();
  const { data, isLoading, error } = useCapabilities();
  const remove = useDeleteCapability();

  return (
    <div>
      <PageHeader
        title={t("capabilities.title")}
        description={t("capabilities.description")}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/knowledge">{t("capabilities.cta.knowledge")}</Link>
            </Button>
            <Button asChild>
              <Link href="/capabilities/new">{t("capabilities.new")}</Link>
            </Button>
          </div>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">{t("capabilities.help.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{t("capabilities.help.what")}</p>
          <p>{t("capabilities.help.when")}</p>
          <p>{t("capabilities.help.how")}</p>
          <p>{t("capabilities.help.example")}</p>
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
          title={t("capabilities.empty")}
          description={t("capabilities.emptyHint")}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/knowledge">{t("capabilities.cta.knowledge")}</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/live-sessions">{t("knowledge.cta.sessions")}</Link>
              </Button>
            </div>
          }
        />
      ) : null}
      <div className="space-y-3">
        {(data?.items as Array<{
          id: string;
          name: string;
          description: string;
          updatedAt: string;
          tags: Array<{ id: string; name: string }>;
        }> | undefined)?.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex justify-between gap-3 p-4">
              <div className="space-y-2">
                <Link
                  href={`/capabilities/${c.id}`}
                  className="font-semibold hover:text-primary"
                >
                  {c.name}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {truncate(c.description)}
                </p>
                <TagList tags={c.tags} />
                <p className="text-xs text-muted-foreground">
                  {t("common.updated")} {formatDate(c.updatedAt, locale)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/capabilities/${c.id}/edit`}>
                    {t("common.edit")}
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (confirm(t("capabilities.confirmDelete")))
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

export function CapabilityForm({
  mode,
  id,
  initial,
}: {
  mode: "create" | "edit";
  id?: string;
  initial?: {
    name?: string;
    description?: string;
    standardProcedure?: string;
    checklist?: string[];
    expectedOutcome?: string;
    knowledgeId?: string | null;
    problemId?: string | null;
    tags?: string[];
  };
}) {
  const { t } = useI18n();
  const router = useRouter();
  const search = useSearchParams();
  const create = useCreateCapability();
  const update = useUpdateCapability(id ?? "");
  const problems = useProblems({ pageSize: 100 });
  const knowledge = useKnowledge({ pageSize: 100 });
  const [checklistText, setChecklistText] = useState(
    (initial?.checklist || []).join("\n"),
  );
  const [values, setValues] = useState({
    name: initial?.name || "",
    description: initial?.description || "",
    standardProcedure: initial?.standardProcedure || "",
    expectedOutcome: initial?.expectedOutcome || "",
    knowledgeId: initial?.knowledgeId || search.get("knowledgeId") || "",
    problemId: initial?.problemId || search.get("problemId") || "",
    tags: initial?.tags || [],
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...values,
      knowledgeId: values.knowledgeId || null,
      problemId: values.problemId || null,
      checklist: checklistText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
    };
    if (mode === "create") {
      const created = (await create.mutateAsync(payload)) as { id: string };
      router.push(`/capabilities/${created.id}`);
    } else if (id) {
      await update.mutateAsync(payload);
      router.push(`/capabilities/${id}`);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "create" ? t("capabilities.new") : t("capabilities.edit")}
        </CardTitle>
        <p className="text-sm font-normal text-muted-foreground">
          {t("capabilities.form.hint")}
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label>{t("common.name")}</Label>
            <Input
              required
              placeholder={t("capabilities.field.nameHint")}
              value={values.name}
              onChange={(e) =>
                setValues((v) => ({ ...v, name: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>{t("common.description")}</Label>
            <Textarea
              required
              rows={4}
              value={values.description}
              onChange={(e) =>
                setValues((v) => ({ ...v, description: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>{t("capabilities.field.standardProcedure")}</Label>
            <Textarea
              required
              rows={6}
              value={values.standardProcedure}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  standardProcedure: e.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>
              {t("capabilities.field.checklist")} (
              {t("capabilities.field.checklistHint")})
            </Label>
            <Textarea
              rows={5}
              value={checklistText}
              onChange={(e) => setChecklistText(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("capabilities.field.expectedOutcome")}</Label>
            <Textarea
              required
              rows={3}
              value={values.expectedOutcome}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  expectedOutcome: e.target.value,
                }))
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>
                {t("capabilities.field.knowledge")} ({t("common.optional")})
              </Label>
              <Select
                value={values.knowledgeId || "none"}
                onValueChange={(v) =>
                  setValues((s) => ({
                    ...s,
                    knowledgeId: v === "none" ? "" : v,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("common.noneOption")}</SelectItem>
                  {(
                    (knowledge.data?.items as Array<{
                      id: string;
                      title: string;
                    }>) ?? []
                  ).map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                {t("capabilities.field.problem")} ({t("common.optional")})
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("common.noneOption")}</SelectItem>
                  {(
                    (problems.data?.items as Array<{
                      id: string;
                      title: string;
                    }>) ?? []
                  ).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

export function CapabilityDetail({ id }: { id: string }) {
  const { t, locale } = useI18n();
  const { data, isLoading, error } = useCapability(id);
  const remove = useDeleteCapability();
  const router = useRouter();

  if (isLoading) return <ListSkeleton />;
  if (error || !data)
    return <EmptyState title={t("capabilities.notFound")} />;

  const item = data as {
    id: string;
    name: string;
    description: string;
    standardProcedure: string;
    checklist: string[];
    expectedOutcome: string;
    updatedAt: string;
    tags: Array<{ id: string; name: string }>;
    knowledge?: { id: string; title: string } | null;
    problem?: { id: string; title: string } | null;
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <Link href={`/capabilities/${id}/edit`}>{t("common.edit")}</Link>
        </Button>
        <Button
          variant="destructive"
          onClick={async () => {
            if (!confirm(t("capabilities.confirmDelete"))) return;
            await remove.mutateAsync(id);
            router.push("/capabilities");
          }}
        >
          {t("common.delete")}
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{item.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>{item.description}</p>
          <div>
            <div className="mb-1 text-xs uppercase text-muted-foreground">
              {t("capabilities.field.standardProcedure")}
            </div>
            <p className="whitespace-pre-wrap">{item.standardProcedure}</p>
          </div>
          <div>
            <div className="mb-1 text-xs uppercase text-muted-foreground">
              {t("capabilities.field.checklist")}
            </div>
            <ul className="list-disc space-y-1 pl-5">
              {item.checklist.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-1 text-xs uppercase text-muted-foreground">
              {t("capabilities.field.expectedOutcome")}
            </div>
            <p>{item.expectedOutcome}</p>
          </div>
          <TagList tags={item.tags} />
          <div className="text-muted-foreground">
            {t("common.updated")} {formatDate(item.updatedAt, locale)}
            {item.knowledge ? (
              <>
                {" "}
                · {t("entity.knowledge")}{" "}
                <Link
                  className="text-primary underline"
                  href={`/knowledge/${item.knowledge.id}`}
                >
                  {item.knowledge.title}
                </Link>
              </>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
