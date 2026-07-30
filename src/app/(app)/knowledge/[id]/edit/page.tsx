"use client";

import { Suspense, use } from "react";
import { KnowledgeForm } from "@/components/knowledge/knowledge-views";
import { useKnowledgeItem } from "@/hooks/use-knowledge";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Loading } from "@/components/ui/loading";

function EditKnowledgeInner({ id }: { id: string }) {
  const { data, isLoading, error } = useKnowledgeItem(id);
  if (isLoading) return <ListSkeleton />;
  if (error || !data) return <EmptyState title="Knowledge not found" />;
  const item = data as {
    title: string;
    description: string;
    confidence: number;
    problemId?: string | null;
    tags: Array<{ name: string }>;
    evidences: Array<{ evidence: { id: string } }>;
  };
  return (
    <KnowledgeForm
      mode="edit"
      id={id}
      initial={{
        title: item.title,
        description: item.description,
        confidence: item.confidence,
        problemId: item.problemId,
        tags: item.tags.map((t) => t.name),
        evidenceIds: item.evidences.map((e) => e.evidence.id),
      }}
    />
  );
}

export default function EditKnowledgePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <div>
      <PageHeader title="Edit knowledge" />
      <Suspense fallback={<Loading />}>
        <EditKnowledgeInner id={id} />
      </Suspense>
    </div>
  );
}
