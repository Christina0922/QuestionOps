import { createApiHandler, parseJsonBody } from "@/lib/api-handler";
import { updateProblemSchema } from "@/schemas/problem";
import { problemService } from "@/services/problem-service";

export const GET = createApiHandler(async ({ auth, params }) => {
  return problemService.get(auth.organizationId, params.id);
});

export const PATCH = createApiHandler(async ({ auth, params, request }) => {
  const body = await parseJsonBody(request, updateProblemSchema);
  return problemService.update(auth, params.id, body);
});

export const DELETE = createApiHandler(async ({ auth, params }) => {
  return problemService.remove(auth, params.id);
});
