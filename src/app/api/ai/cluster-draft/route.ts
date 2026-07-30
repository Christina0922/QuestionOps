import { createApiHandler, parseJsonBody } from "@/lib/api-handler";
import { clusterDraftSchema } from "@/schemas/cluster";
import { clusterDraftService } from "@/services/ai/cluster-draft-service";

export const POST = createApiHandler(async ({ auth, request }) => {
  const body = await parseJsonBody(request, clusterDraftSchema);
  return clusterDraftService.draft(auth.organizationId, body.evidenceIds);
});
