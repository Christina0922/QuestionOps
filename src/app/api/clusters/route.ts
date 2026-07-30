import {
  createApiHandler,
  getSearchParams,
  parseJsonBody,
} from "@/lib/api-handler";
import {
  createClusterSchema,
  listClustersSchema,
} from "@/schemas/cluster";
import { clusterService } from "@/services/cluster-service";

export const GET = createApiHandler(async ({ auth, request }) => {
  const params = Object.fromEntries(getSearchParams(request).entries());
  const input = listClustersSchema.parse(params);
  return clusterService.list(auth.organizationId, input);
});

export const POST = createApiHandler(async ({ auth, request }) => {
  const body = await parseJsonBody(request, createClusterSchema);
  return clusterService.create(auth, body);
});
