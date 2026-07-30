import type { ActivityAction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type LogActivityInput = {
  organizationId: string;
  userId?: string | null;
  action: ActivityAction;
  entityType: string;
  entityId: string;
  summary: string;
  metadata?: Prisma.InputJsonValue;
};

export class ActivityRepository {
  async create(input: LogActivityInput) {
    return prisma.activity.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        summary: input.summary,
        metadata: input.metadata ?? undefined,
      },
    });
  }

  async list(
    organizationId: string,
    options: {
      page: number;
      pageSize: number;
      entityType?: string;
      entityId?: string;
    } = {
      page: 1,
      pageSize: 20,
    },
  ) {
    const where: Prisma.ActivityWhereInput = {
      organizationId,
      ...(options.entityType ? { entityType: options.entityType } : {}),
      ...(options.entityId ? { entityId: options.entityId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
      }),
      prisma.activity.count({ where }),
    ]);

    return { items, total };
  }
}

export const activityRepository = new ActivityRepository();
