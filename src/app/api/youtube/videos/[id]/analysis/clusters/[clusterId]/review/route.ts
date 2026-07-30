import { createApiHandler, parseJsonBody } from "@/lib/api-handler";
import {
  reviewClusterSchema,
  youTubeAnalysisService,
} from "@/services/youtube/analysis-service";

export const POST = createApiHandler(async ({ auth, params, request }) => {
  const body = await parseJsonBody(request, reviewClusterSchema);
  return youTubeAnalysisService.reviewCluster(
    auth,
    params.id,
    params.clusterId,
    body,
  );
});
