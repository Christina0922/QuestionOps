import { createApiHandler, parseJsonBody } from "@/lib/api-handler";
import { liveSessionService } from "@/services/live/live-session-service";
import { z } from "zod";

export const GET = createApiHandler(async ({ auth, params }) => {
  return liveSessionService.get(auth.organizationId, params.id);
});

export const PATCH = createApiHandler(async ({ auth, params, request }) => {
  const body = await parseJsonBody(
    request,
    z.object({ status: z.string().min(1) }),
  );
  return liveSessionService.updateStatus(auth, params.id, body.status);
});
