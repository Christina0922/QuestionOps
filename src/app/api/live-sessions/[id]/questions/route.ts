import { createApiHandler, getSearchParams } from "@/lib/api-handler";
import { liveSessionService } from "@/services/live/live-session-service";

export const GET = createApiHandler(async ({ auth, params, request }) => {
  const status = getSearchParams(request).get("status") ?? undefined;
  return liveSessionService.listQuestions(
    auth.organizationId,
    params.id,
    status,
  );
});
