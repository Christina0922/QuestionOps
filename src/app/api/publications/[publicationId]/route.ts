import { createApiHandler, parseJsonBody } from "@/lib/api-handler";
import { liveSessionService } from "@/services/live/live-session-service";
import { z } from "zod";

export const POST = createApiHandler(async ({ auth, params, request }) => {
  const body = await parseJsonBody(
    request,
    z.object({
      action: z.enum(["copied", "published"]),
      externalUrl: z.string().url().optional().nullable(),
    }),
  );
  return liveSessionService.markPublication(
    auth,
    params.publicationId,
    body.action,
    body.externalUrl ?? undefined,
  );
});
