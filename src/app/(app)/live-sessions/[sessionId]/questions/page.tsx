import { LiveQuestionsView } from "@/components/live/live-session-views";

export default async function LiveQuestionsPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <LiveQuestionsView sessionId={sessionId} />;
}
