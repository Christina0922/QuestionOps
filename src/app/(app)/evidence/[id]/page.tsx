import { EvidenceDetail } from "@/components/evidence/evidence-views";

export default async function EvidenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EvidenceDetail id={id} />;
}
