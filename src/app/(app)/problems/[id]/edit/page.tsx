"use client";

import { use } from "react";
import { ProblemForm } from "@/components/problems/problem-form";
import { useProblem } from "@/hooks/use-problems";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function EditProblemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, error } = useProblem(id);

  if (isLoading) return <ListSkeleton />;
  if (error || !data) return <EmptyState title="Problem not found" />;

  const problem = data as {
    title: string;
    description: string;
    source?: string | null;
    customer?: string | null;
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
    tags: Array<{ name: string }>;
  };

  return (
    <div>
      <PageHeader title="Edit problem" />
      <ProblemForm
        mode="edit"
        id={id}
        initial={{
          title: problem.title,
          description: problem.description,
          source: problem.source || "",
          customer: problem.customer || "",
          priority: problem.priority,
          status: problem.status,
          tags: problem.tags.map((t) => t.name),
        }}
      />
    </div>
  );
}
