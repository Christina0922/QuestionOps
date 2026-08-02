import { createApiHandler } from "@/lib/api-handler";
import { liveSessionService } from "@/services/live/live-session-service";

export const GET = createApiHandler(async ({ auth, params }) => {
  return liveSessionService.listUnanswered(auth.organizationId, params.id);
});
