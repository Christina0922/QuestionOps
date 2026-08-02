import { LiveControlView } from "@/components/live/live-control-view";

export default async function LiveControlPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <LiveControlView sessionId={sessionId} />;
}
