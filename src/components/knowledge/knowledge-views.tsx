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

export function KnowledgeList() {
  const { data, isLoading, error } = useKnowledge();
  const remove = useDeleteKnowledge();

  return (
    <div>
      <PageHeader
        title="Knowledge"
        description="Synthesized insights from evidence and clusters."
        actionHref="/knowledge/new"
        actionLabel="New knowledge"
      />
      {isLoading ? <ListSkeleton /> : null}
      {error ? (
        <EmptyState title="Failed to load" description={(error as Error).message} />
      ) : null}
      {data?.items.length === 0 ? (
        <EmptyState
          title="No knowledge yet"
          action={
            <Button asChild>
              <Link href="/knowledge/new">Create knowledge</Link>
            </Button>
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
                  Updated {formatDate(k.updatedAt)} · conf{" "}
                  {(k.confidence * 100).toFixed(0)}%
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/knowledge/${k.id}/edit`}>Edit</Link>
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (confirm("Delete?")) remove.mutate(k.id);
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
      toast.error("Select supporting evidence first");
      return;
    }
    const result = await draft.mutateAsync(values.evidenceIds);
    setValues((v) => ({
      ...v,
      title: result.title,
      description: result.description,
      confidence: result.confidence,
    }));
    toast.success(`Draft ready (${result.source})`);
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
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>
          {mode === "create" ? "New knowledge" : "Edit knowledge"}
        </CardTitle>
        <Button
          type="button"
          variant="secondary"
          disabled={draft.isPending}
          onClick={generateDraft}
        >
          {draft.isPending ? "Drafting…" : "AI draft from evidence"}
        </Button>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              required
              value={values.title}
              onChange={(e) =>
                setValues((v) => ({ ...v, title: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
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
            <Label>Problem (optional)</Label>
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
                <SelectItem value="none">None</SelectItem>
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
            <Label>Confidence ({values.confidence.toFixed(2)})</Label>
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
            <Label>Supporting evidence</Label>
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
            <Label>Tags</Label>
            <TagInput
              value={values.tags}
              onChange={(tags) => setValues((v) => ({ ...v, tags }))}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit">Save</Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function KnowledgeDetail({ id }: { id: string }) {
  const { data, isLoading, error } = useKnowledgeItem(id);
  const remove = useDeleteKnowledge();
  const router = useRouter();

  if (isLoading) return <ListSkeleton />;
  if (error || !data) return <EmptyState title="Knowledge not found" />;

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
          <Link href={`/knowledge/${id}/edit`}>Edit</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/capabilities/new?knowledgeId=${id}`}>
            Create capability
          </Link>
        </Button>
        <Button
          variant="destructive"
          onClick={async () => {
            if (!confirm("Delete?")) return;
            await remove.mutateAsync(id);
            router.push("/knowledge");
          }}
        >
          Delete
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
            Confidence {(item.confidence * 100).toFixed(0)}% · Updated{" "}
            {formatDate(item.updatedAt)}
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
              Supporting evidence
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
