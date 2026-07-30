import { createApiHandler, parseJsonBody } from "@/lib/api-handler";
import {
  convertCommentsSchema,
  youTubeCommentService,
} from "@/services/youtube/comment-service";

export const POST = createApiHandler(async ({ auth, params, request }) => {
  const body = await parseJsonBody(request, convertCommentsSchema);
  return youTubeCommentService.convertToEvidence(auth, params.id, body);
});
