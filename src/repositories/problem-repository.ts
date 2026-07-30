import type { Prisma, ProblemPriority, ProblemStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const problemInclude = {
  tags: { include: { tag: true } },
  reporter: { select: { id: true, name: true, email: true } },
  _count: {
    select: {
      evidences: { where: { deletedAt: null } },
      knowledge: { where: { deletedAt: null } },
      capabilities: { where: { deletedAt: null } },
      clusters: { where: { deletedAt: null } },
    },
  },
} satisfies Prisma.ProblemInclude;

function mapProblem<T extends { tags: Array<{ tag: { id: string; name: string } }> }>(
  problem: T,
) {
  return {
    ...problem,
    tags: problem.tags.map((t) => ({ id: t.tag.id, name: t.tag.name })),
  };
}

export class ProblemRepository {
  async list(
    organizationId: string,
    options: {
      page: number;
      pageSize: number;
      status?: ProblemStatus;
      priority?: ProblemPriority;
      q?: string;
    },
  ) {
    const where: Prisma.ProblemWhereInput = {
      organizationId,
      deletedAt: null,
      ...(options.status ? { status: options.status } : {}),
      ...(options.priority ? { priority: options.priority } : {}),
      ...(options.q
        ? {
            OR: [
              { title: { contains: options.q, mode: "insensitive" } },
              { description: { contains: options.q, mode: "insensitive" } },
              { customer: { contains: options.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.problem.findMany({
        where,
        include: problemInclude,
        orderBy: { updatedAt: "desc" },
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
      }),
      prisma.problem.count({ where }),
    ]);

    return { items: rows.map(mapProblem), total };
  }

  async findById(organizationId: string, id: string) {
    const problem = await prisma.problem.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        ...problemInclude,
        evidences: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          include: {
            author: { select: { id: true, name: true, email: true } },
            tags: { include: { tag: true } },
          },
        },
        knowledge: {
          where: { deletedAt: null },
          orderBy: { updatedAt: "desc" },
          include: {
            tags: { include: { tag: true } },
            author: { select: { id: true, name: true, email: true } },
          },
        },
        capabilities: {
          where: { deletedAt: null },
          orderBy: { updatedAt: "desc" },
          include: {
            tags: { include: { tag: true } },
            author: { select: { id: true, name: true, email: true } },
          },
        },
        clusters: {
          where: { deletedAt: null },
          orderBy: { updatedAt: "desc" },
        },
      },
    });

    if (!problem) return null;

    return {
      ...mapProblem(problem),
      evidences: problem.evidences.map((e) => ({
        ...e,
        tags: e.tags.map((t) => ({ id: t.tag.id, name: t.tag.name })),
      })),
      knowledge: problem.knowledge.map((k) => ({
        ...k,
        tags: k.tags.map((t) => ({ id: t.tag.id, name: t.tag.name })),
      })),
      capabilities: problem.capabilities.map((c) => ({
        ...c,
        checklist: Array.isArray(c.checklist)
          ? (c.checklist as string[])
          : [],
        tags: c.tags.map((t) => ({ id: t.tag.id, name: t.tag.name })),
      })),
    };
  }

  async create(
    data: {
      organizationId: string;
      title: string;
      description: string;
      source?: string | null;
      customer?: string | null;
      priority: ProblemPriority;
      status: ProblemStatus;
      reporterId?: string | null;
      tagIds: string[];
    },
  ) {
    const problem = await prisma.problem.create({
      data: {
        organizationId: data.organizationId,
        title: data.title,
        description: data.description,
        source: data.source ?? null,
        customer: data.customer ?? null,
        priority: data.priority,
        status: data.status,
        reporterId: data.reporterId ?? null,
        tags: {
          create: data.tagIds.map((tagId) => ({ tagId })),
        },
      },
      include: problemInclude,
    });
    return mapProblem(problem);
  }

  async update(
    organizationId: string,
    id: string,
    data: {
      title?: string;
      description?: string;
      source?: string | null;
      customer?: string | null;
      priority?: ProblemPriority;
      status?: ProblemStatus;
      tagIds?: string[];
    },
  ) {
    const existing = await prisma.problem.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) return null;

    if (data.tagIds) {
      await prisma.problemTag.deleteMany({ where: { problemId: id } });
      if (data.tagIds.length > 0) {
        await prisma.problemTag.createMany({
          data: data.tagIds.map((tagId) => ({ problemId: id, tagId })),
        });
      }
    }

    const problem = await prisma.problem.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined
          ? { description: data.description }
          : {}),
        ...(data.source !== undefined ? { source: data.source } : {}),
        ...(data.customer !== undefined ? { customer: data.customer } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
      include: problemInclude,
    });

    return mapProblem(problem);
  }

  async softDelete(organizationId: string, id: string) {
    const existing = await prisma.problem.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) return null;

    return prisma.problem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async count(organizationId: string) {
    return prisma.problem.count({
      where: { organizationId, deletedAt: null },
    });
  }

  async recentCreated(organizationId: string, take = 5) {
    return prisma.problem.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });
  }

  async recentUpdated(organizationId: string, take = 5) {
    return prisma.problem.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take,
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });
  }

  async search(organizationId: string, q: string, take = 20) {
    return prisma.problem.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      take,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        updatedAt: true,
      },
    });
  }
}

export const problemRepository = new ProblemRepository();
