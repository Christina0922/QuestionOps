import { createApiHandler } from "@/lib/api-handler";
import { youTubeCommentService } from "@/services/youtube/comment-service";

export const GET = createApiHandler(async ({ auth, params }) => {
  return youTubeCommentService.getJob(auth.organizationId, params.jobId);
});
