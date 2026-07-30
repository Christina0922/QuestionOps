import { ProblemDetail } from "@/components/problems/problem-detail";

export default async function ProblemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProblemDetail id={id} />;
}
