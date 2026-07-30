import { createApiHandler } from "@/lib/api-handler";
import { youTubeConnectionService } from "@/services/youtube/connection-service";

export const GET = createApiHandler(async ({ auth }) => {
  return youTubeConnectionService.getStatus(auth.organizationId);
});
