import {
  createApiHandler,
  getSearchParams,
  parseJsonBody,
} from "@/lib/api-handler";
import {
  createKnowledgeSchema,
  listKnowledgeSchema,
} from "@/schemas/knowledge";
import { knowledgeService } from "@/services/knowledge-service";

export const GET = createApiHandler(async ({ auth, request }) => {
  const params = Object.fromEntries(getSearchParams(request).entries());
  const input = listKnowledgeSchema.parse(params);
  return knowledgeService.list(auth.organizationId, input);
});

export const POST = createApiHandler(async ({ auth, request }) => {
  const body = await parseJsonBody(request, createKnowledgeSchema);
  return knowledgeService.create(auth, body);
});
