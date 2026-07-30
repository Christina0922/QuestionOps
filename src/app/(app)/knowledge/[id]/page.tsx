import { KnowledgeDetail } from "@/components/knowledge/knowledge-views";

export default async function KnowledgeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <KnowledgeDetail id={id} />;
}
