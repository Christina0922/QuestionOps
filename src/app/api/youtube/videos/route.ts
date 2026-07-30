import { createApiHandler, getSearchParams } from "@/lib/api-handler";
import {
  listYouTubeVideosSchema,
  youTubeVideoService,
} from "@/services/youtube/video-service";

export const GET = createApiHandler(async ({ auth, request }) => {
  const params = Object.fromEntries(getSearchParams(request).entries());
  const input = listYouTubeVideosSchema.parse(params);
  return youTubeVideoService.list(auth.organizationId, input);
});
