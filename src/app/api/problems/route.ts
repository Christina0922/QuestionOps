import {
  createApiHandler,
  getSearchParams,
  parseJsonBody,
} from "@/lib/api-handler";
import {
  createProblemSchema,
  listProblemsSchema,
} from "@/schemas/problem";
import { problemService } from "@/services/problem-service";

export const GET = createApiHandler(async ({ auth, request }) => {
  const params = Object.fromEntries(getSearchParams(request).entries());
  const input = listProblemsSchema.parse(params);
  return problemService.list(auth.organizationId, input);
});

export const POST = createApiHandler(async ({ auth, request }) => {
  const body = await parseJsonBody(request, createProblemSchema);
  return problemService.create(auth, body);
});
