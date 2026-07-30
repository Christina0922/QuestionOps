import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const clusterInclude = {
  problem: { select: { id: true, title: true } },
  evidences: {
    include: {
      evidence: {
        select: {
          id: true,
          observation: true,
          confidence: true,
          createdAt: true,
        },
      },
    },
  },
  _count: { select: { evidences: true } },
} satisfies Prisma.ClusterInclude;

export class ClusterRepository {
  async list(
    organizationId: string,
    options: {
      page: number;
      pageSize: number;
      problemId?: string;
      q?: string;
    },
  ) {
    const where: Prisma.ClusterWhereInput = {
      organizationId,
      deletedAt: null,
      ...(options.problemId ? { problemId: options.problemId } : {}),
      ...(options.q
        ? {
            OR: [
              { name: { contains: options.q, mode: "insensitive" } },
              { summary: { contains: options.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.cluster.findMany({
        where,
        include: clusterInclude,
        orderBy: { updatedAt: "desc" },
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
      }),
      prisma.cluster.count({ where }),
    ]);

    return { items, total };
  }

  async findById(organizationId: string, id: string) {
    return prisma.cluster.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: clusterInclude,
    });
  }

  async create(data: {
    organizationId: string;
    name: string;
    summary?: string | null;
    problemId?: string | null;
    evidenceIds: string[];
  }) {
    return prisma.cluster.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        summary: data.summary ?? null,
        problemId: data.problemId ?? null,
        evidences: {
          create: data.evidenceIds.map((evidenceId) => ({ evidenceId })),
        },
      },
      include: clusterInclude,
    });
  }

  async update(
    organizationId: string,
    id: string,
    data: {
      name?: string;
      summary?: string | null;
      problemId?: string | null;
      evidenceIds?: string[];
    },
  ) {
    const existing = await prisma.cluster.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) return null;

    if (data.evidenceIds) {
      await prisma.clusterEvidence.deleteMany({ where: { clusterId: id } });
      if (data.evidenceIds.length > 0) {
        await prisma.clusterEvidence.createMany({
          data: data.evidenceIds.map((evidenceId) => ({
            clusterId: id,
            evidenceId,
          })),
        });
      }
    }

    return prisma.cluster.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.summary !== undefined ? { summary: data.summary } : {}),
        ...(data.problemId !== undefined ? { problemId: data.problemId } : {}),
      },
      include: clusterInclude,
    });
  }

  async softDelete(organizationId: string, id: string) {
    const existing = await prisma.cluster.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) return null;
    return prisma.cluster.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async count(organizationId: string) {
    return prisma.cluster.count({
      where: { organizationId, deletedAt: null },
    });
  }
}

export const clusterRepository = new ClusterRepository();
