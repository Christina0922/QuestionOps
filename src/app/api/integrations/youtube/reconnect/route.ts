import { createApiHandler } from "@/lib/api-handler";
import { youTubeConnectionService } from "@/services/youtube/connection-service";

export const POST = createApiHandler(async ({ auth }) => {
  const result = youTubeConnectionService.createConnectState(auth, true);
  if (result.mode === "mock") {
    return youTubeConnectionService.completeMockConnect(auth);
  }
  return { url: result.url, state: result.state };
});
