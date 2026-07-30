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

export function CapabilitiesList() {
  const { data, isLoading, error } = useCapabilities();
  const remove = useDeleteCapability();

  return (
    <div>
      <PageHeader
        title="Capabilities"
        description="Repeatable procedures derived from knowledge."
        actionHref="/capabilities/new"
        actionLabel="New capability"
      />
      {isLoading ? <ListSkeleton /> : null}
      {error ? (
        <EmptyState title="Failed to load" description={(error as Error).message} />
      ) : null}
      {data?.items.length === 0 ? (
        <EmptyState
          title="No capabilities yet"
          action={
            <Button asChild>
              <Link href="/capabilities/new">Create capability</Link>
            </Button>
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
                  Updated {formatDate(c.updatedAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/capabilities/${c.id}/edit`}>Edit</Link>
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (confirm("Delete?")) remove.mutate(c.id);
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
          {mode === "create" ? "New capability" : "Edit capability"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              required
              value={values.name}
              onChange={(e) =>
                setValues((v) => ({ ...v, name: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
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
            <Label>Standard procedure</Label>
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
            <Label>Checklist (one item per line)</Label>
            <Textarea
              rows={5}
              value={checklistText}
              onChange={(e) => setChecklistText(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Expected outcome</Label>
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
              <Label>Knowledge (optional)</Label>
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
                  <SelectItem value="none">None</SelectItem>
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

export function CapabilityDetail({ id }: { id: string }) {
  const { data, isLoading, error } = useCapability(id);
  const remove = useDeleteCapability();
  const router = useRouter();

  if (isLoading) return <ListSkeleton />;
  if (error || !data) return <EmptyState title="Capability not found" />;

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
          <Link href={`/capabilities/${id}/edit`}>Edit</Link>
        </Button>
        <Button
          variant="destructive"
          onClick={async () => {
            if (!confirm("Delete?")) return;
            await remove.mutateAsync(id);
            router.push("/capabilities");
          }}
        >
          Delete
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
              Standard procedure
            </div>
            <p className="whitespace-pre-wrap">{item.standardProcedure}</p>
          </div>
          <div>
            <div className="mb-1 text-xs uppercase text-muted-foreground">
              Checklist
            </div>
            <ul className="list-disc space-y-1 pl-5">
              {item.checklist.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-1 text-xs uppercase text-muted-foreground">
              Expected outcome
            </div>
            <p>{item.expectedOutcome}</p>
          </div>
          <TagList tags={item.tags} />
          <div className="text-muted-foreground">
            Updated {formatDate(item.updatedAt)}
            {item.knowledge ? (
              <>
                {" "}
                · Knowledge{" "}
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
