import { createApiHandler, parseJsonBody } from "@/lib/api-handler";
import {
  importYouTubeVideoSchema,
  youTubeVideoService,
} from "@/services/youtube/video-service";

export const POST = createApiHandler(async ({ auth, request }) => {
  const body = await parseJsonBody(request, importYouTubeVideoSchema);
  return youTubeVideoService.importByUrl(auth, body.url);
});
