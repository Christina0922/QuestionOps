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
import { useI18n } from "@/i18n";
import type { MessageKey } from "@/i18n";

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
  const { t } = useI18n();
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
          {mode === "create" ? t("problems.new") : t("problems.edit")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="title">{t("common.title")}</Label>
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
            <Label htmlFor="description">{t("common.description")}</Label>
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
              <Label htmlFor="source">{t("problems.field.source")}</Label>
              <Input
                id="source"
                value={values.source}
                onChange={(e) =>
                  setValues((v) => ({ ...v, source: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer">{t("problems.field.customer")}</Label>
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
              <Label>{t("problems.field.priority")}</Label>
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
                      {t(`priority.${p}` as MessageKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("problems.field.status")}</Label>
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
                      {t(`status.${s}` as MessageKey)}
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
            <Button type="submit" disabled={pending}>
              {pending ? t("common.saving") : t("common.save")}
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
