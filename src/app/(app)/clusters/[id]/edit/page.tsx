"use client";

import { Suspense, use } from "react";
import { ClusterForm } from "@/components/clusters/cluster-views";
import { useCluster } from "@/hooks/use-clusters";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Loading } from "@/components/ui/loading";

function EditClusterInner({ id }: { id: string }) {
  const { data, isLoading, error } = useCluster(id);
  if (isLoading) return <ListSkeleton />;
  if (error || !data) return <EmptyState title="Cluster not found" />;
  const cluster = data as {
    name: string;
    summary?: string | null;
    problemId?: string | null;
    evidences: Array<{ evidence: { id: string } }>;
  };
  return (
    <ClusterForm
      mode="edit"
      id={id}
      initial={{
        name: cluster.name,
        summary: cluster.summary || "",
        problemId: cluster.problemId,
        evidenceIds: cluster.evidences.map((e) => e.evidence.id),
      }}
    />
  );
}

export default function EditClusterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <div>
      <PageHeader title="Edit cluster" />
      <Suspense fallback={<Loading />}>
        <EditClusterInner id={id} />
      </Suspense>
    </div>
  );
}
