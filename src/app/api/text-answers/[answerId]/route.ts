import { createApiHandler, parseJsonBody } from "@/lib/api-handler";
import { liveSessionService } from "@/services/live/live-session-service";
import { z } from "zod";

export const PATCH = createApiHandler(async ({ auth, params, request }) => {
  const body = await parseJsonBody(
    request,
    z.object({ currentDraft: z.string().min(1) }),
  );
  return liveSessionService.updateTextAnswer(
    auth,
    params.answerId,
    body.currentDraft,
  );
});

export const POST = createApiHandler(async ({ auth, params, request }) => {
  const body = await parseJsonBody(
    request,
    z.object({ action: z.enum(["approve"]) }),
  );
  if (body.action === "approve") {
    return liveSessionService.approveTextAnswer(auth, params.answerId);
  }
  return { ok: false };
});
