import { LiveSubmissionsView } from "@/components/live/live-session-views";

export default async function LiveSubmissionsPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <LiveSubmissionsView sessionId={sessionId} />;
}
