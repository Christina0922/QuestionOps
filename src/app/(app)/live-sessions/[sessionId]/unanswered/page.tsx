import { LiveUnansweredView } from "@/components/live/live-session-views";

export default async function LiveUnansweredPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <LiveUnansweredView sessionId={sessionId} />;
}
