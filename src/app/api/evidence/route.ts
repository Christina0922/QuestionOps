import {
  createApiHandler,
  getSearchParams,
  parseJsonBody,
} from "@/lib/api-handler";
import {
  createEvidenceSchema,
  listEvidenceSchema,
} from "@/schemas/evidence";
import { evidenceService } from "@/services/evidence-service";

export const GET = createApiHandler(async ({ auth, request }) => {
  const params = Object.fromEntries(getSearchParams(request).entries());
  const input = listEvidenceSchema.parse(params);
  return evidenceService.list(auth.organizationId, input);
});

export const POST = createApiHandler(async ({ auth, request }) => {
  const body = await parseJsonBody(request, createEvidenceSchema);
  return evidenceService.create(auth, body);
});
