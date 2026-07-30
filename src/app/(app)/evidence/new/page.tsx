import { Suspense } from "react";
import { EvidenceForm } from "@/components/evidence/evidence-views";
import { PageHeader } from "@/components/shared/page-header";
import { Loading } from "@/components/ui/loading";

export default function NewEvidencePage() {
  return (
    <div>
      <PageHeader title="New evidence" />
      <Suspense fallback={<Loading />}>
        <EvidenceForm mode="create" />
      </Suspense>
    </div>
  );
}
