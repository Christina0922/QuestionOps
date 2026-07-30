import { createApiHandler } from "@/lib/api-handler";
import { youTubeConnectionService } from "@/services/youtube/connection-service";

export const POST = createApiHandler(async ({ auth }) => {
  return youTubeConnectionService.disconnect(auth);
});
