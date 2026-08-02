import { LiveActivityLinkView } from "@/components/live/live-session-views";

export default async function LiveSessionActivityPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <LiveActivityLinkView sessionId={sessionId} />;
}
