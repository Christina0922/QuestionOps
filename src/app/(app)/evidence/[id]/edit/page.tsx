"use client";

import { Suspense, use } from "react";
import { EvidenceForm } from "@/components/evidence/evidence-views";
import { useEvidenceItem } from "@/hooks/use-evidence";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Loading } from "@/components/ui/loading";

function EditEvidenceInner({ id }: { id: string }) {
  const { data, isLoading, error } = useEvidenceItem(id);
  if (isLoading) return <ListSkeleton />;
  if (error || !data) return <EmptyState title="Evidence not found" />;
  const item = data as {
    problemId: string;
    observation: string;
    transcript?: string | null;
    screenshotUrl?: string | null;
    link?: string | null;
    confidence: number;
    tags: Array<{ name: string }>;
  };
  return (
    <EvidenceForm
      mode="edit"
      id={id}
      initial={{
        problemId: item.problemId,
        observation: item.observation,
        transcript: item.transcript || "",
        screenshotUrl: item.screenshotUrl || "",
        link: item.link || "",
        confidence: item.confidence,
        tags: item.tags.map((t) => t.name),
      }}
    />
  );
}

export default function EditEvidencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <div>
      <PageHeader title="Edit evidence" />
      <Suspense fallback={<Loading />}>
        <EditEvidenceInner id={id} />
      </Suspense>
    </div>
  );
}
