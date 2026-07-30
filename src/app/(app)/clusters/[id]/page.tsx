import { ClusterDetail } from "@/components/clusters/cluster-views";

export default async function ClusterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ClusterDetail id={id} />;
}
