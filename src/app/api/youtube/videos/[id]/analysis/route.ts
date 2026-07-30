import { createApiHandler, parseJsonBody } from "@/lib/api-handler";
import {
  startAnalysisSchema,
  youTubeAnalysisService,
} from "@/services/youtube/analysis-service";

export const GET = createApiHandler(async ({ auth, params }) => {
  return youTubeAnalysisService.getLatest(auth.organizationId, params.id);
});

export const POST = createApiHandler(async ({ auth, params, request }) => {
  const body = await parseJsonBody(request, startAnalysisSchema);
  return youTubeAnalysisService.start(auth, params.id, body);
});
