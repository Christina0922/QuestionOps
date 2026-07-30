import { createApiHandler, parseJsonBody } from "@/lib/api-handler";
import { knowledgeDraftSchema } from "@/schemas/knowledge";
import { knowledgeDraftService } from "@/services/ai/knowledge-draft-service";

export const POST = createApiHandler(async ({ auth, request }) => {
  const body = await parseJsonBody(request, knowledgeDraftSchema);
  return knowledgeDraftService.draft(auth.organizationId, body.evidenceIds);
});
