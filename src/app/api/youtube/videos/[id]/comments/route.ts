import { createApiHandler, getSearchParams, parseJsonBody } from "@/lib/api-handler";
import {
  importCommentsSchema,
  listYouTubeCommentsSchema,
  youTubeCommentService,
} from "@/services/youtube/comment-service";

export const GET = createApiHandler(async ({ auth, params, request }) => {
  const query = Object.fromEntries(getSearchParams(request).entries());
  const input = listYouTubeCommentsSchema.parse(query);
  return youTubeCommentService.list(auth.organizationId, params.id, input);
});

export const POST = createApiHandler(async ({ auth, params, request }) => {
  const body = await parseJsonBody(request, importCommentsSchema);
  return youTubeCommentService.startImport(auth, params.id, body);
});
