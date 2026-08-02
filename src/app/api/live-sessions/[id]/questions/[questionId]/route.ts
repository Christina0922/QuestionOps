import { createApiHandler, parseJsonBody } from "@/lib/api-handler";
import { liveSessionService } from "@/services/live/live-session-service";
import { z } from "zod";

const actionSchema = z.object({
  action: z.enum([
    "accept",
    "reject",
    "exclude",
    "duplicate",
    "present",
    "start-answer",
    "answer-live",
    "partial-answer",
    "defer",
    "important",
    "confirm-review",
  ]),
  reason: z.string().optional(),
  important: z.boolean().optional(),
  childTexts: z.array(z.string()).optional(),
  status: z
    .enum(["ANSWERED_LIVE", "PARTIALLY_ANSWERED_LIVE", "UNANSWERED"])
    .optional(),
});

export const POST = createApiHandler(async ({ auth, params, request }) => {
  const body = await parseJsonBody(request, actionSchema);
  const { id, questionId } = params;
  switch (body.action) {
    case "accept":
      return liveSessionService.acceptQuestion(auth, id, questionId);
    case "reject":
      return liveSessionService.rejectQuestion(
        auth,
        id,
        questionId,
        body.reason,
      );
    case "exclude":
      return liveSessionService.excludeQuestion(
        auth,
        id,
        questionId,
        body.reason,
      );
    case "duplicate":
      return liveSessionService.markDuplicate(auth, id, questionId);
    case "present":
      return liveSessionService.present(auth, id, questionId);
    case "start-answer":
      return liveSessionService.startAnswer(auth, id, questionId);
    case "answer-live":
      return liveSessionService.answerLive(auth, id, questionId);
    case "partial-answer":
      return liveSessionService.partialAnswer(
        auth,
        id,
        questionId,
        body.childTexts,
      );
    case "defer":
      return liveSessionService.defer(auth, id, questionId);
    case "important":
      return liveSessionService.setImportant(
        auth,
        id,
        questionId,
        body.important ?? true,
      );
    case "confirm-review":
      return liveSessionService.confirmReviewStatus(
        auth,
        id,
        questionId,
        body.status ?? "UNANSWERED",
      );
    default:
      return { ok: false };
  }
});
