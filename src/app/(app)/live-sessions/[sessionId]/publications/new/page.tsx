import { LiveNewPublicationView } from "@/components/live/live-session-views";

export default async function NewLivePublicationPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <LiveNewPublicationView sessionId={sessionId} />;
}
