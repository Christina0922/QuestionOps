"use client";

import { Suspense, use } from "react";
import { CapabilityForm } from "@/components/capabilities/capability-views";
import { useCapability } from "@/hooks/use-capabilities";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Loading } from "@/components/ui/loading";

function EditCapabilityInner({ id }: { id: string }) {
  const { data, isLoading, error } = useCapability(id);
  if (isLoading) return <ListSkeleton />;
  if (error || !data) return <EmptyState title="Capability not found" />;
  const item = data as {
    name: string;
    description: string;
    standardProcedure: string;
    checklist: string[];
    expectedOutcome: string;
    knowledgeId?: string | null;
    problemId?: string | null;
    tags: Array<{ name: string }>;
  };
  return (
    <CapabilityForm
      mode="edit"
      id={id}
      initial={{
        name: item.name,
        description: item.description,
        standardProcedure: item.standardProcedure,
        checklist: item.checklist,
        expectedOutcome: item.expectedOutcome,
        knowledgeId: item.knowledgeId,
        problemId: item.problemId,
        tags: item.tags.map((t) => t.name),
      }}
    />
  );
}

export default function EditCapabilityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <div>
      <PageHeader title="Edit capability" />
      <Suspense fallback={<Loading />}>
        <EditCapabilityInner id={id} />
      </Suspense>
    </div>
  );
}
