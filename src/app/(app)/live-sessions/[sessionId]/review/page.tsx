import { LiveReviewView } from "@/components/live/live-session-views";

export default async function LiveReviewPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <LiveReviewView sessionId={sessionId} />;
}
