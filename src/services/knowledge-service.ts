import { ApiError } from "@/lib/api-error";
import { activityRepository } from "@/repositories/activity-repository";
import { clusterRepository } from "@/repositories/cluster-repository";
import { evidenceRepository } from "@/repositories/evidence-repository";
import { knowledgeRepository } from "@/repositories/knowledge-repository";
import { problemRepository } from "@/repositories/problem-repository";
import { tagRepository } from "@/repositories/tag-repository";
import type {
  CreateKnowledgeInput,
  ListKnowledgeInput,
  UpdateKnowledgeInput,
} from "@/schemas/knowledge";
import type { AuthContext, PaginatedResult } from "@/types";

function paginate<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export class KnowledgeService {
  async list(organizationId: string, input: ListKnowledgeInput) {
    const { items, total } = await knowledgeRepository.list(organizationId, {
      page: input.page,
      pageSize: input.pageSize,
      problemId: input.problemId,
      q: input.q,
    });
    return paginate(items, total, input.page, input.pageSize);
  }

  async get(organizationId: string, id: string) {
    const knowledge = await knowledgeRepository.findById(organizationId, id);
    if (!knowledge) throw ApiError.notFound("Knowledge not found");
    return knowledge;
  }

  async create(auth: AuthContext, input: CreateKnowledgeInput) {
    if (input.problemId) {
      const problem = await problemRepository.findById(
        auth.organizationId,
        input.problemId,
      );
      if (!problem) throw ApiError.badRequest("Problem not found");
    }

    if (input.evidenceIds?.length) {
      const evidences = await evidenceRepository.findByIds(
        auth.organizationId,
        input.evidenceIds,
      );
      if (evidences.length !== input.evidenceIds.length) {
        throw ApiError.badRequest("One or more evidence items were not found");
      }
    }

    if (input.clusterIds?.length) {
      for (const clusterId of input.clusterIds) {
        const cluster = await clusterRepository.findById(
          auth.organizationId,
          clusterId,
        );
        if (!cluster) throw ApiError.badRequest("Cluster not found");
      }
    }

    const tags = await tagRepository.findOrCreateMany(
      auth.organizationId,
      input.tags ?? [],
    );

    const knowledge = await knowledgeRepository.create({
      organizationId: auth.organizationId,
      title: input.title,
      description: input.description,
      confidence: input.confidence,
      problemId: input.problemId,
      authorId: auth.userId,
      tagIds: tags.map((t) => t.id),
      clusterIds: input.clusterIds ?? [],
      evidenceIds: input.evidenceIds ?? [],
    });

    await activityRepository.create({
      organizationId: auth.organizationId,
      userId: auth.userId,
      action: "CREATE",
      entityType: "knowledge",
      entityId: knowledge.id,
      summary: `Created knowledge "${knowledge.title}"`,
    });

    return knowledge;
  }

  async update(auth: AuthContext, id: string, input: UpdateKnowledgeInput) {
    await this.get(auth.organizationId, id);

    let tagIds: string[] | undefined;
    if (input.tags) {
      const tags = await tagRepository.findOrCreateMany(
        auth.organizationId,
        input.tags,
      );
      tagIds = tags.map((t) => t.id);
    }

    if (input.evidenceIds) {
      const evidences = await evidenceRepository.findByIds(
        auth.organizationId,
        input.evidenceIds,
      );
      if (evidences.length !== input.evidenceIds.length) {
        throw ApiError.badRequest("One or more evidence items were not found");
      }
    }

    const knowledge = await knowledgeRepository.update(
      auth.organizationId,
      id,
      {
        ...input,
        tagIds,
      },
    );
    if (!knowledge) throw ApiError.notFound("Knowledge not found");

    await activityRepository.create({
      organizationId: auth.organizationId,
      userId: auth.userId,
      action: "UPDATE",
      entityType: "knowledge",
      entityId: knowledge.id,
      summary: `Updated knowledge "${knowledge.title}"`,
    });

    return knowledge;
  }

  async remove(auth: AuthContext, id: string) {
    const existing = await this.get(auth.organizationId, id);
    const deleted = await knowledgeRepository.softDelete(
      auth.organizationId,
      id,
    );
    if (!deleted) throw ApiError.notFound("Knowledge not found");

    await activityRepository.create({
      organizationId: auth.organizationId,
      userId: auth.userId,
      action: "DELETE",
      entityType: "knowledge",
      entityId: id,
      summary: `Deleted knowledge "${existing.title}"`,
    });

    return { id };
  }
}

export const knowledgeService = new KnowledgeService();
