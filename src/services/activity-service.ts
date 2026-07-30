import { activityRepository } from "@/repositories/activity-repository";
import { paginationSchema } from "@/schemas/common";
import type { PaginatedResult } from "@/types";
import { z } from "zod";

const listActivitySchema = paginationSchema.extend({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
});

export type ListActivityInput = z.infer<typeof listActivitySchema>;

export class ActivityService {
  async list(organizationId: string, input: ListActivityInput) {
    const parsed = listActivitySchema.parse(input);
    const { items, total } = await activityRepository.list(organizationId, {
      page: parsed.page,
      pageSize: parsed.pageSize,
      entityType: parsed.entityType,
      entityId: parsed.entityId,
    });

    const result: PaginatedResult<(typeof items)[number]> = {
      items,
      total,
      page: parsed.page,
      pageSize: parsed.pageSize,
      totalPages: Math.max(1, Math.ceil(total / parsed.pageSize)),
    };
    return result;
  }
}

export const activityService = new ActivityService();
