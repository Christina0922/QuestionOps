import { Suspense } from "react";
import { EvidenceList } from "@/components/evidence/evidence-views";
import { Loading } from "@/components/ui/loading";

export default function EvidencePage() {
  return (
    <Suspense fallback={<Loading />}>
      <EvidenceList />
    </Suspense>
  );
}
