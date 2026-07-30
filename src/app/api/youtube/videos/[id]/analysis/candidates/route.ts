import { createApiHandler } from "@/lib/api-handler";
import { youTubeAnalysisService } from "@/services/youtube/analysis-service";

export const POST = createApiHandler(async ({ auth, params }) => {
  return youTubeAnalysisService.generateCandidates(auth, params.id);
});
