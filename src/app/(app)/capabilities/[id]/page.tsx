import { CapabilityDetail } from "@/components/capabilities/capability-views";

export default async function CapabilityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CapabilityDetail id={id} />;
}
