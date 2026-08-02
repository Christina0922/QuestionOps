import { createApiHandler } from "@/lib/api-handler";
import { liveSessionService } from "@/services/live/live-session-service";

export const POST = createApiHandler(async ({ auth, params }) => {
  return liveSessionService.generateAnswerDraft(
    auth,
    params.id,
    params.questionId,
  );
});
