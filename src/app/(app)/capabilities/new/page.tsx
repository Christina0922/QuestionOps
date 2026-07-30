import { Suspense } from "react";
import { CapabilityForm } from "@/components/capabilities/capability-views";
import { PageHeader } from "@/components/shared/page-header";
import { Loading } from "@/components/ui/loading";

export default function NewCapabilityPage() {
  return (
    <div>
      <PageHeader title="New capability" />
      <Suspense fallback={<Loading />}>
        <CapabilityForm mode="create" />
      </Suspense>
    </div>
  );
}
