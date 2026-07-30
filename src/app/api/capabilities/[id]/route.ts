import { createApiHandler, parseJsonBody } from "@/lib/api-handler";
import { updateCapabilitySchema } from "@/schemas/capability";
import { capabilityService } from "@/services/capability-service";

export const GET = createApiHandler(async ({ auth, params }) => {
  return capabilityService.get(auth.organizationId, params.id);
});

export const PATCH = createApiHandler(async ({ auth, params, request }) => {
  const body = await parseJsonBody(request, updateCapabilitySchema);
  return capabilityService.update(auth, params.id, body);
});

export const DELETE = createApiHandler(async ({ auth, params }) => {
  return capabilityService.remove(auth, params.id);
});
