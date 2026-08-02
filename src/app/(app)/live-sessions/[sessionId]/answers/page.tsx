import { LiveAnswersView } from "@/components/live/live-session-views";

export default async function LiveAnswersPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <LiveAnswersView sessionId={sessionId} />;
}
