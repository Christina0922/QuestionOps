import {
  createApiHandler,
  getSearchParams,
  parseJsonBody,
} from "@/lib/api-handler";
import {
  createCapabilitySchema,
  listCapabilitiesSchema,
} from "@/schemas/capability";
import { capabilityService } from "@/services/capability-service";

export const GET = createApiHandler(async ({ auth, request }) => {
  const params = Object.fromEntries(getSearchParams(request).entries());
  const input = listCapabilitiesSchema.parse(params);
  return capabilityService.list(auth.organizationId, input);
});

export const POST = createApiHandler(async ({ auth, request }) => {
  const body = await parseJsonBody(request, createCapabilitySchema);
  return capabilityService.create(auth, body);
});
