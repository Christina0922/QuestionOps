import { YouTubeVideoDetailView } from "@/components/youtube/youtube-video-detail-view";

export default async function YouTubeVideoDetailPage({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const { videoId } = await params;
  return <YouTubeVideoDetailView id={videoId} />;
}
