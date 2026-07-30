import { createApiHandler, getSearchParams } from "@/lib/api-handler";
import { searchSchema } from "@/schemas/search";
import { searchService } from "@/services/search-service";

export const GET = createApiHandler(async ({ auth, request }) => {
  const params = Object.fromEntries(getSearchParams(request).entries());
  const input = searchSchema.parse(params);
  return searchService.search(auth.organizationId, input);
});
