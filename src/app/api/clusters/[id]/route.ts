import { createApiHandler, parseJsonBody } from "@/lib/api-handler";
import { updateClusterSchema } from "@/schemas/cluster";
import { clusterService } from "@/services/cluster-service";

export const GET = createApiHandler(async ({ auth, params }) => {
  return clusterService.get(auth.organizationId, params.id);
});

export const PATCH = createApiHandler(async ({ auth, params, request }) => {
  const body = await parseJsonBody(request, updateClusterSchema);
  return clusterService.update(auth, params.id, body);
});

export const DELETE = createApiHandler(async ({ auth, params }) => {
  return clusterService.remove(auth, params.id);
});
