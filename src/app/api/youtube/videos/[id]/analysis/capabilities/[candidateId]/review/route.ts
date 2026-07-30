import { createApiHandler, parseJsonBody } from "@/lib/api-handler";
import {
  reviewCandidateSchema,
  youTubeAnalysisService,
} from "@/services/youtube/analysis-service";

export const POST = createApiHandler(async ({ auth, params, request }) => {
  const body = await parseJsonBody(request, reviewCandidateSchema);
  return youTubeAnalysisService.reviewCapability(
    auth,
    params.id,
    params.candidateId,
    body,
  );
});
