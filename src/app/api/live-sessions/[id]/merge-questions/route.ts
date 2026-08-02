import { createApiHandler, parseJsonBody } from "@/lib/api-handler";
import { liveSessionService } from "@/services/live/live-session-service";
import { z } from "zod";

export const POST = createApiHandler(async ({ auth, params, request }) => {
  const body = await parseJsonBody(
    request,
    z.object({
      questionIds: z.array(z.string()).min(2),
      representativeText: z.string().optional(),
    }),
  );
  return liveSessionService.mergeQuestions(
    auth,
    params.id,
    body.questionIds,
    body.representativeText,
  );
});
