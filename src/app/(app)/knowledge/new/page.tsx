import { Suspense } from "react";
import { KnowledgeForm } from "@/components/knowledge/knowledge-views";
import { PageHeader } from "@/components/shared/page-header";
import { Loading } from "@/components/ui/loading";

export default function NewKnowledgePage() {
  return (
    <div>
      <PageHeader title="New knowledge" />
      <Suspense fallback={<Loading />}>
        <KnowledgeForm mode="create" />
      </Suspense>
    </div>
  );
}
