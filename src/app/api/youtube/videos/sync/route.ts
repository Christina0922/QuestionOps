import { createApiHandler } from "@/lib/api-handler";
import { youTubeVideoService } from "@/services/youtube/video-service";

export const POST = createApiHandler(async ({ auth }) => {
  return youTubeVideoService.syncChannelVideos(auth);
});
