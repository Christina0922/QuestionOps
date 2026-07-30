import { createApiHandler } from "@/lib/api-handler";
import { youTubeVideoService } from "@/services/youtube/video-service";

export const GET = createApiHandler(async ({ auth, params }) => {
  return youTubeVideoService.get(auth.organizationId, params.id);
});

export const DELETE = createApiHandler(async ({ auth, params }) => {
  return youTubeVideoService.remove(auth, params.id);
});
