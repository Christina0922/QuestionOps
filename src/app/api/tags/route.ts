import {
  createApiHandler,
  getSearchParams,
  parseJsonBody,
} from "@/lib/api-handler";
import { createTagSchema, listTagsSchema } from "@/schemas/tag";
import { tagService } from "@/services/tag-service";

export const GET = createApiHandler(async ({ auth, request }) => {
  const params = Object.fromEntries(getSearchParams(request).entries());
  const input = listTagsSchema.parse(params);
  return tagService.list(auth.organizationId, input.q);
});

export const POST = createApiHandler(async ({ auth, request }) => {
  const body = await parseJsonBody(request, createTagSchema);
  return tagService.create(auth.organizationId, body);
});
