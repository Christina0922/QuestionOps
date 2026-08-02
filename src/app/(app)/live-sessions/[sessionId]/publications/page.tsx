import { LivePublicationsView } from "@/components/live/live-session-views";

export default async function LivePublicationsPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <LivePublicationsView sessionId={sessionId} />;
}
