import { createApiHandler, parseJsonBody } from "@/lib/api-handler";
import {
  createSessionSchema,
  liveSessionService,
} from "@/services/live/live-session-service";
import { z } from "zod";

export const GET = createApiHandler(async ({ auth }) => {
  return liveSessionService.list(auth.organizationId);
});

export const POST = createApiHandler(async ({ auth, request }) => {
  const body = await parseJsonBody(request, createSessionSchema);
  return liveSessionService.create(auth, body);
});
