import { createApiHandler, getSearchParams } from "@/lib/api-handler";
import { paginationSchema } from "@/schemas/common";
import { activityService } from "@/services/activity-service";
import { z } from "zod";

const schema = paginationSchema.extend({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
});

export const GET = createApiHandler(async ({ auth, request }) => {
  const params = Object.fromEntries(getSearchParams(request).entries());
  const input = schema.parse(params);
  return activityService.list(auth.organizationId, input);
});
