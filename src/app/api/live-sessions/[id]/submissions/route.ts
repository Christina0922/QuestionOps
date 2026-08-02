import { createApiHandler, parseJsonBody } from "@/lib/api-handler";
import {
  importSubmissionsSchema,
  liveSessionService,
} from "@/services/live/live-session-service";

export const GET = createApiHandler(async ({ auth, params }) => {
  return liveSessionService.listSubmissions(auth.organizationId, params.id);
});

export const POST = createApiHandler(async ({ auth, params, request }) => {
  const body = await parseJsonBody(request, importSubmissionsSchema);
  return liveSessionService.importSubmissions(auth, params.id, body);
});
