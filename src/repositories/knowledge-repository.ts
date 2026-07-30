import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const knowledgeInclude = {
  tags: { include: { tag: true } },
  author: { select: { id: true, name: true, email: true } },
  problem: { select: { id: true, title: true } },
  clusters: { include: { cluster: { select: { id: true, name: true } } } },
  evidences: {
    include: {
      evidence: {
        select: { id: true, observation: true, confidence: true },
      },
    },
  },
  _count: {
    select: { capabilities: { where: { deletedAt: null } } },
  },
} satisfies Prisma.KnowledgeInclude;

function mapKnowledge<
  T extends { tags: Array<{ tag: { id: string; name: string } }> },
>(knowledge: T) {
  return {
    ...knowledge,
    tags: knowledge.tags.map((t) => ({ id: t.tag.id, name: t.tag.name })),
  };
}

export class KnowledgeRepository {
  async list(
    organizationId: string,
    options: {
      page: number;
      pageSize: number;
      problemId?: string;
      q?: string;
    },
  ) {
    const where: Prisma.KnowledgeWhereInput = {
      organizationId,
      deletedAt: null,
      ...(options.problemId ? { problemId: options.problemId } : {}),
      ...(options.q
        ? {
            OR: [
              { title: { contains: options.q, mode: "insensitive" } },
              { description: { contains: options.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.knowledge.findMany({
        where,
        include: knowledgeInclude,
        orderBy: { updatedAt: "desc" },
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
      }),
      prisma.knowledge.count({ where }),
    ]);

    return { items: rows.map(mapKnowledge), total };
  }

  async findById(organizationId: string, id: string) {
    const knowledge = await prisma.knowledge.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        ...knowledgeInclude,
        capabilities: {
          where: { deletedAt: null },
          orderBy: { updatedAt: "desc" },
        },
      },
    });
    return knowledge ? mapKnowledge(knowledge) : null;
  }

  async create(data: {
    organizationId: string;
    title: string;
    description: string;
    confidence: number;
    problemId?: string | null;
    authorId?: string | null;
    tagIds: string[];
    clusterIds: string[];
    evidenceIds: string[];
  }) {
    const knowledge = await prisma.knowledge.create({
      data: {
        organizationId: data.organizationId,
        title: data.title,
        description: data.description,
        confidence: data.confidence,
        problemId: data.problemId ?? null,
        authorId: data.authorId ?? null,
        tags: { create: data.tagIds.map((tagId) => ({ tagId })) },
        clusters: {
          create: data.clusterIds.map((clusterId) => ({ clusterId })),
        },
        evidences: {
          create: data.evidenceIds.map((evidenceId) => ({ evidenceId })),
        },
      },
      include: knowledgeInclude,
    });
    return mapKnowledge(knowledge);
  }

  async update(
    organizationId: string,
    id: string,
    data: {
      title?: string;
      description?: string;
      confidence?: number;
      problemId?: string | null;
      tagIds?: string[];
      clusterIds?: string[];
      evidenceIds?: string[];
    },
  ) {
    const existing = await prisma.knowledge.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) return null;

    if (data.tagIds) {
      await prisma.knowledgeTag.deleteMany({ where: { knowledgeId: id } });
      if (data.tagIds.length > 0) {
        await prisma.knowledgeTag.createMany({
          data: data.tagIds.map((tagId) => ({ knowledgeId: id, tagId })),
        });
      }
    }
    if (data.clusterIds) {
      await prisma.knowledgeCluster.deleteMany({ where: { knowledgeId: id } });
      if (data.clusterIds.length > 0) {
        await prisma.knowledgeCluster.createMany({
          data: data.clusterIds.map((clusterId) => ({
            knowledgeId: id,
            clusterId,
          })),
        });
      }
    }
    if (data.evidenceIds) {
      await prisma.knowledgeEvidence.deleteMany({ where: { knowledgeId: id } });
      if (data.evidenceIds.length > 0) {
        await prisma.knowledgeEvidence.createMany({
          data: data.evidenceIds.map((evidenceId) => ({
            knowledgeId: id,
            evidenceId,
          })),
        });
      }
    }

    const knowledge = await prisma.knowledge.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined
          ? { description: data.description }
          : {}),
        ...(data.confidence !== undefined
          ? { confidence: data.confidence }
          : {}),
        ...(data.problemId !== undefined ? { problemId: data.problemId } : {}),
      },
      include: knowledgeInclude,
    });

    return mapKnowledge(knowledge);
  }

  async softDelete(organizationId: string, id: string) {
    const existing = await prisma.knowledge.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) return null;
    return prisma.knowledge.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async count(organizationId: string) {
    return prisma.knowledge.count({
      where: { organizationId, deletedAt: null },
    });
  }

  async recentCreated(organizationId: string, take = 5) {
    return prisma.knowledge.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });
  }

  async recentUpdated(organizationId: string, take = 5) {
    return prisma.knowledge.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take,
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });
  }

  async search(organizationId: string, q: string, take = 20) {
    return prisma.knowledge.findMany({
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

export const knowledgeRepository = new KnowledgeRepository();
