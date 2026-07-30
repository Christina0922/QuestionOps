"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  useCreateProblem,
  useUpdateProblem,
} from "@/hooks/use-problems";
import { TagInput } from "@/components/shared/tag-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProblemPriority, ProblemStatus } from "@/types";

type ProblemFormValues = {
  title: string;
  description: string;
  source: string;
  customer: string;
  priority: ProblemPriority;
  status: ProblemStatus;
  tags: string[];
};

const defaults: ProblemFormValues = {
  title: "",
  description: "",
  source: "",
  customer: "",
  priority: "MEDIUM",
  status: "OPEN",
  tags: [],
};

export function ProblemForm({
  mode,
  id,
  initial,
}: {
  mode: "create" | "edit";
  id?: string;
  initial?: Partial<ProblemFormValues>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ProblemFormValues>({
    ...defaults,
    ...initial,
  });
  const create = useCreateProblem();
  const update = useUpdateProblem(id ?? "");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title: values.title,
      description: values.description,
      source: values.source || null,
      customer: values.customer || null,
      priority: values.priority,
      status: values.status,
      tags: values.tags,
    };

    if (mode === "create") {
      const created = (await create.mutateAsync(payload)) as { id: string };
      router.push(`/problems/${created.id}`);
    } else if (id) {
      await update.mutateAsync(payload);
      router.push(`/problems/${id}`);
    }
  }

  const pending = create.isPending || update.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "create" ? "New problem" : "Edit problem"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              required
              value={values.title}
              onChange={(e) =>
                setValues((v) => ({ ...v, title: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              required
              rows={6}
              value={values.description}
              onChange={(e) =>
                setValues((v) => ({ ...v, description: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                value={values.source}
                onChange={(e) =>
                  setValues((v) => ({ ...v, source: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
              <Input
                id="customer"
                value={values.customer}
                onChange={(e) =>
                  setValues((v) => ({ ...v, customer: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={values.priority}
                onValueChange={(priority: ProblemPriority) =>
                  setValues((v) => ({ ...v, priority }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={values.status}
                onValueChange={(status: ProblemStatus) =>
                  setValues((v) => ({ ...v, status }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const
                  ).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace("_", " ")}
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
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
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
