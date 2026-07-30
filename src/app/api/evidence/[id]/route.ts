import { createApiHandler, parseJsonBody } from "@/lib/api-handler";
import { updateEvidenceSchema } from "@/schemas/evidence";
import { evidenceService } from "@/services/evidence-service";

export const GET = createApiHandler(async ({ auth, params }) => {
  return evidenceService.get(auth.organizationId, params.id);
});

export const PATCH = createApiHandler(async ({ auth, params, request }) => {
  const body = await parseJsonBody(request, updateEvidenceSchema);
  return evidenceService.update(auth, params.id, body);
});

export const DELETE = createApiHandler(async ({ auth, params }) => {
  return evidenceService.remove(auth, params.id);
});
