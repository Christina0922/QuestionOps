import { createApiHandler, parseJsonBody } from "@/lib/api-handler";
import { updateKnowledgeSchema } from "@/schemas/knowledge";
import { knowledgeService } from "@/services/knowledge-service";

export const GET = createApiHandler(async ({ auth, params }) => {
  return knowledgeService.get(auth.organizationId, params.id);
});

export const PATCH = createApiHandler(async ({ auth, params, request }) => {
  const body = await parseJsonBody(request, updateKnowledgeSchema);
  return knowledgeService.update(auth, params.id, body);
});

export const DELETE = createApiHandler(async ({ auth, params }) => {
  return knowledgeService.remove(auth, params.id);
});
