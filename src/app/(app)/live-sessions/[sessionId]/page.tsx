import { LiveSessionHub } from "@/components/live/live-session-hub";

export default async function LiveSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <LiveSessionHub sessionId={sessionId} />;
}
