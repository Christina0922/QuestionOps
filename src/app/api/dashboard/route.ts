import { createApiHandler } from "@/lib/api-handler";
import { dashboardService } from "@/services/dashboard-service";

export const GET = createApiHandler(async ({ auth }) => {
  return dashboardService.getStats(auth.organizationId);
});
