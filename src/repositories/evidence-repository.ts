import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const evidenceInclude = {
  tags: { include: { tag: true } },
  author: { select: { id: true, name: true, email: true } },
  problem: { select: { id: true, title: true } },
} satisfies Prisma.EvidenceInclude;

function mapEvidence<
  T extends { tags: Array<{ tag: { id: string; name: string } }> },
>(evidence: T) {
  return {
    ...evidence,
    tags: evidence.tags.map((t) => ({ id: t.tag.id, name: t.tag.name })),
  };
}

export class EvidenceRepository {
  async list(
    organizationId: string,
    options: {
      page: number;
      pageSize: number;
      problemId?: string;
      q?: string;
    },
  ) {
    const where: Prisma.EvidenceWhereInput = {
      organizationId,
      deletedAt: null,
      ...(options.problemId ? { problemId: options.problemId } : {}),
      ...(options.q
        ? {
            OR: [
              { observation: { contains: options.q, mode: "insensitive" } },
              { transcript: { contains: options.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.evidence.findMany({
        where,
        include: evidenceInclude,
        orderBy: { createdAt: "desc" },
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
      }),
      prisma.evidence.count({ where }),
    ]);

    return { items: rows.map(mapEvidence), total };
  }

  async findById(organizationId: string, id: string) {
    const evidence = await prisma.evidence.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: evidenceInclude,
    });
    return evidence ? mapEvidence(evidence) : null;
  }

  async findByIds(organizationId: string, ids: string[]) {
    const rows = await prisma.evidence.findMany({
      where: {
        organizationId,
        deletedAt: null,
        id: { in: ids },
      },
      include: evidenceInclude,
    });
    return rows.map(mapEvidence);
  }

  async create(data: {
    organizationId: string;
    problemId: string;
    observation: string;
    transcript?: string | null;
    screenshotUrl?: string | null;
    link?: string | null;
    confidence: number;
    authorId?: string | null;
    tagIds: string[];
    sourceType?: "MANUAL" | "YOUTUBE_COMMENT";
    sourceExternalId?: string | null;
    sourceUrl?: string | null;
    youtubeCommentId?: string | null;
  }) {
    const evidence = await prisma.evidence.create({
      data: {
        organizationId: data.organizationId,
        problemId: data.problemId,
        observation: data.observation,
        transcript: data.transcript || null,
        screenshotUrl: data.screenshotUrl || null,
        link: data.link || null,
        confidence: data.confidence,
        authorId: data.authorId ?? null,
        sourceType: data.sourceType ?? "MANUAL",
        sourceExternalId: data.sourceExternalId ?? null,
        sourceUrl: data.sourceUrl ?? null,
        youtubeCommentId: data.youtubeCommentId ?? null,
        tags: {
          create: data.tagIds.map((tagId) => ({ tagId })),
        },
      },
      include: evidenceInclude,
    });
    return mapEvidence(evidence);
  }

  async findBySource(
    organizationId: string,
    sourceType: "MANUAL" | "YOUTUBE_COMMENT",
    sourceExternalId: string,
  ) {
    const evidence = await prisma.evidence.findFirst({
      where: {
        organizationId,
        sourceType,
        sourceExternalId,
        deletedAt: null,
      },
      include: evidenceInclude,
    });
    return evidence ? mapEvidence(evidence) : null;
  }

  async update(
    organizationId: string,
    id: string,
    data: {
      problemId?: string;
      observation?: string;
      transcript?: string | null;
      screenshotUrl?: string | null;
      link?: string | null;
      confidence?: number;
      tagIds?: string[];
    },
  ) {
    const existing = await prisma.evidence.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) return null;

    if (data.tagIds) {
      await prisma.evidenceTag.deleteMany({ where: { evidenceId: id } });
      if (data.tagIds.length > 0) {
        await prisma.evidenceTag.createMany({
          data: data.tagIds.map((tagId) => ({ evidenceId: id, tagId })),
        });
      }
    }

    const evidence = await prisma.evidence.update({
      where: { id },
      data: {
        ...(data.problemId !== undefined ? { problemId: data.problemId } : {}),
        ...(data.observation !== undefined
          ? { observation: data.observation }
          : {}),
        ...(data.transcript !== undefined
          ? { transcript: data.transcript || null }
          : {}),
        ...(data.screenshotUrl !== undefined
          ? { screenshotUrl: data.screenshotUrl || null }
          : {}),
        ...(data.link !== undefined ? { link: data.link || null } : {}),
        ...(data.confidence !== undefined
          ? { confidence: data.confidence }
          : {}),
      },
      include: evidenceInclude,
    });

    return mapEvidence(evidence);
  }

  async softDelete(organizationId: string, id: string) {
    const existing = await prisma.evidence.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) return null;
    return prisma.evidence.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async count(organizationId: string) {
    return prisma.evidence.count({
      where: { organizationId, deletedAt: null },
    });
  }

  async recentCreated(organizationId: string, take = 5) {
    return prisma.evidence.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        observation: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async search(organizationId: string, q: string, take = 20) {
    return prisma.evidence.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [
          { observation: { contains: q, mode: "insensitive" } },
          { transcript: { contains: q, mode: "insensitive" } },
        ],
      },
      take,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        observation: true,
        updatedAt: true,
      },
    });
  }
}

export const evidenceRepository = new EvidenceRepository();
