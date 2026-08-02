import { createApiHandler } from "@/lib/api-handler";
import { liveSessionService } from "@/services/live/live-session-service";

export const GET = createApiHandler(async ({ auth }) => {
  return liveSessionService.dashboard(auth.organizationId);
});
