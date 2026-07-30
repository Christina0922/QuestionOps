import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const capabilityInclude = {
  tags: { include: { tag: true } },
  author: { select: { id: true, name: true, email: true } },
  problem: { select: { id: true, title: true } },
  knowledge: { select: { id: true, title: true } },
} satisfies Prisma.CapabilityInclude;

function mapCapability<
  T extends {
    tags: Array<{ tag: { id: string; name: string } }>;
    checklist: Prisma.JsonValue;
  },
>(capability: T) {
  return {
    ...capability,
    checklist: Array.isArray(capability.checklist)
      ? (capability.checklist as string[])
      : [],
    tags: capability.tags.map((t) => ({ id: t.tag.id, name: t.tag.name })),
  };
}

export class CapabilityRepository {
  async list(
    organizationId: string,
    options: {
      page: number;
      pageSize: number;
      problemId?: string;
      knowledgeId?: string;
      q?: string;
    },
  ) {
    const where: Prisma.CapabilityWhereInput = {
      organizationId,
      deletedAt: null,
      ...(options.problemId ? { problemId: options.problemId } : {}),
      ...(options.knowledgeId ? { knowledgeId: options.knowledgeId } : {}),
      ...(options.q
        ? {
            OR: [
              { name: { contains: options.q, mode: "insensitive" } },
              { description: { contains: options.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.capability.findMany({
        where,
        include: capabilityInclude,
        orderBy: { updatedAt: "desc" },
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
      }),
      prisma.capability.count({ where }),
    ]);

    return { items: rows.map(mapCapability), total };
  }

  async findById(organizationId: string, id: string) {
    const capability = await prisma.capability.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: capabilityInclude,
    });
    return capability ? mapCapability(capability) : null;
  }

  async create(data: {
    organizationId: string;
    name: string;
    description: string;
    standardProcedure: string;
    checklist: string[];
    expectedOutcome: string;
    knowledgeId?: string | null;
    problemId?: string | null;
    authorId?: string | null;
    tagIds: string[];
  }) {
    const capability = await prisma.capability.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        description: data.description,
        standardProcedure: data.standardProcedure,
        checklist: data.checklist,
        expectedOutcome: data.expectedOutcome,
        knowledgeId: data.knowledgeId ?? null,
        problemId: data.problemId ?? null,
        authorId: data.authorId ?? null,
        tags: { create: data.tagIds.map((tagId) => ({ tagId })) },
      },
      include: capabilityInclude,
    });
    return mapCapability(capability);
  }

  async update(
    organizationId: string,
    id: string,
    data: {
      name?: string;
      description?: string;
      standardProcedure?: string;
      checklist?: string[];
      expectedOutcome?: string;
      knowledgeId?: string | null;
      problemId?: string | null;
      tagIds?: string[];
    },
  ) {
    const existing = await prisma.capability.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) return null;

    if (data.tagIds) {
      await prisma.capabilityTag.deleteMany({ where: { capabilityId: id } });
      if (data.tagIds.length > 0) {
        await prisma.capabilityTag.createMany({
          data: data.tagIds.map((tagId) => ({ capabilityId: id, tagId })),
        });
      }
    }

    const capability = await prisma.capability.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined
          ? { description: data.description }
          : {}),
        ...(data.standardProcedure !== undefined
          ? { standardProcedure: data.standardProcedure }
          : {}),
        ...(data.checklist !== undefined ? { checklist: data.checklist } : {}),
        ...(data.expectedOutcome !== undefined
          ? { expectedOutcome: data.expectedOutcome }
          : {}),
        ...(data.knowledgeId !== undefined
          ? { knowledgeId: data.knowledgeId }
          : {}),
        ...(data.problemId !== undefined ? { problemId: data.problemId } : {}),
      },
      include: capabilityInclude,
    });

    return mapCapability(capability);
  }

  async softDelete(organizationId: string, id: string) {
    const existing = await prisma.capability.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) return null;
    return prisma.capability.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async count(organizationId: string) {
    return prisma.capability.count({
      where: { organizationId, deletedAt: null },
    });
  }

  async recentCreated(organizationId: string, take = 5) {
    return prisma.capability.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, name: true, createdAt: true, updatedAt: true },
    });
  }

  async recentUpdated(organizationId: string, take = 5) {
    return prisma.capability.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take,
      select: { id: true, name: true, createdAt: true, updatedAt: true },
    });
  }

  async search(organizationId: string, q: string, take = 20) {
    return prisma.capability.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      take,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        updatedAt: true,
      },
    });
  }
}

export const capabilityRepository = new CapabilityRepository();
