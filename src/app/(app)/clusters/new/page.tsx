import { Suspense } from "react";
import { ClusterForm } from "@/components/clusters/cluster-views";
import { PageHeader } from "@/components/shared/page-header";
import { Loading } from "@/components/ui/loading";

export default function NewClusterPage() {
  return (
    <div>
      <PageHeader title="New cluster" />
      <Suspense fallback={<Loading />}>
        <ClusterForm mode="create" />
      </Suspense>
    </div>
  );
}
