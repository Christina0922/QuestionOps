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

export function EvidenceList() {
  const [q, setQ] = useState("");
  const { data, isLoading, error } = useEvidence({ q: q || undefined });
  const remove = useDeleteEvidence();

  return (
    <div>
      <PageHeader
        title="Evidence"
        description="Observations linked to customer problems."
        actionHref="/evidence/new"
        actionLabel="New evidence"
      />
      <Input
        className="mb-4"
        placeholder="Filter evidence…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {isLoading ? <ListSkeleton /> : null}
      {error ? (
        <EmptyState title="Failed to load" description={(error as Error).message} />
      ) : null}
      {data?.items.length === 0 ? (
        <EmptyState
          title="No evidence yet"
          action={
            <Button asChild>
              <Link href="/evidence/new">Add evidence</Link>
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
                    "No problem"
                  )}{" "}
                  · {formatDate(item.createdAt)} · conf{" "}
                  {(item.confidence * 100).toFixed(0)}%
                </div>
                <TagList tags={item.tags} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/evidence/${item.id}/edit`}>Edit</Link>
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (confirm("Delete this evidence?")) remove.mutate(item.id);
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
          {mode === "create" ? "New evidence" : "Edit evidence"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label>Problem</Label>
            <Select
              value={values.problemId}
              onValueChange={(problemId) =>
                setValues((v) => ({ ...v, problemId }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select problem" />
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
            <Label>Observation</Label>
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
            <Label>Transcript</Label>
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
              <Label>Screenshot URL</Label>
              <Input
                value={values.screenshotUrl}
                onChange={(e) =>
                  setValues((v) => ({ ...v, screenshotUrl: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Link</Label>
              <Input
                value={values.link}
                onChange={(e) =>
                  setValues((v) => ({ ...v, link: e.target.value }))
                }
              />
            </div>
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
            <Label>Tags</Label>
            <TagInput
              value={values.tags}
              onChange={(tags) => setValues((v) => ({ ...v, tags }))}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={create.isPending || update.isPending}>
              Save
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function EvidenceDetail({ id }: { id: string }) {
  const { data, isLoading, error } = useEvidenceItem(id);
  const remove = useDeleteEvidence();
  const router = useRouter();

  if (isLoading) return <ListSkeleton />;
  if (error || !data) {
    return <EmptyState title="Evidence not found" />;
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
          <Link href={`/evidence/${id}/edit`}>Edit</Link>
        </Button>
        <Button
          variant="destructive"
          onClick={async () => {
            if (!confirm("Delete?")) return;
            await remove.mutateAsync(id);
            router.push("/evidence");
          }}
        >
          Delete
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Observation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="whitespace-pre-wrap">{item.observation}</p>
          {item.transcript ? (
            <div>
              <div className="mb-1 text-xs uppercase text-muted-foreground">
                Transcript
              </div>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {item.transcript}
              </p>
            </div>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2 text-muted-foreground">
            <div>
              Problem:{" "}
              {item.problem ? (
                <Link
                  className="text-primary underline"
                  href={`/problems/${item.problem.id}`}
                >
                  {item.problem.title}
                </Link>
              ) : (
                "—"
              )}
            </div>
            <div>Confidence: {(item.confidence * 100).toFixed(0)}%</div>
            <div>Author: {item.author?.name || item.author?.email || "—"}</div>
            <div>Created: {formatDate(item.createdAt)}</div>
          </div>
          <TagList tags={item.tags} />
          {item.link ? (
            <a
              className="text-primary underline"
              href={item.link}
              target="_blank"
              rel="noreferrer"
            >
              External link
            </a>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
