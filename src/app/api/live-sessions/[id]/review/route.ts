import { createApiHandler } from "@/lib/api-handler";
import { liveSessionService } from "@/services/live/live-session-service";

export const GET = createApiHandler(async ({ auth, params }) => {
  return liveSessionService.getReview(auth.organizationId, params.id);
});

export const POST = createApiHandler(async ({ auth, params }) => {
  return liveSessionService.prepareReview(auth, params.id);
});
