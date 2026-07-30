import { ApiError } from "@/lib/api-error";
import { activityRepository } from "@/repositories/activity-repository";
import { capabilityRepository } from "@/repositories/capability-repository";
import { knowledgeRepository } from "@/repositories/knowledge-repository";
import { problemRepository } from "@/repositories/problem-repository";
import { tagRepository } from "@/repositories/tag-repository";
import type {
  CreateCapabilityInput,
  ListCapabilitiesInput,
  UpdateCapabilityInput,
} from "@/schemas/capability";
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

export class CapabilityService {
  async list(organizationId: string, input: ListCapabilitiesInput) {
    const { items, total } = await capabilityRepository.list(organizationId, {
      page: input.page,
      pageSize: input.pageSize,
      problemId: input.problemId,
      knowledgeId: input.knowledgeId,
      q: input.q,
    });
    return paginate(items, total, input.page, input.pageSize);
  }

  async get(organizationId: string, id: string) {
    const capability = await capabilityRepository.findById(organizationId, id);
    if (!capability) throw ApiError.notFound("Capability not found");
    return capability;
  }

  async create(auth: AuthContext, input: CreateCapabilityInput) {
    if (input.problemId) {
      const problem = await problemRepository.findById(
        auth.organizationId,
        input.problemId,
      );
      if (!problem) throw ApiError.badRequest("Problem not found");
    }

    if (input.knowledgeId) {
      const knowledge = await knowledgeRepository.findById(
        auth.organizationId,
        input.knowledgeId,
      );
      if (!knowledge) throw ApiError.badRequest("Knowledge not found");
    }

    const tags = await tagRepository.findOrCreateMany(
      auth.organizationId,
      input.tags ?? [],
    );

    const capability = await capabilityRepository.create({
      organizationId: auth.organizationId,
      name: input.name,
      description: input.description,
      standardProcedure: input.standardProcedure,
      checklist: input.checklist ?? [],
      expectedOutcome: input.expectedOutcome,
      knowledgeId: input.knowledgeId,
      problemId: input.problemId,
      authorId: auth.userId,
      tagIds: tags.map((t) => t.id),
    });

    await activityRepository.create({
      organizationId: auth.organizationId,
      userId: auth.userId,
      action: "CREATE",
      entityType: "capability",
      entityId: capability.id,
      summary: `Created capability "${capability.name}"`,
    });

    return capability;
  }

  async update(auth: AuthContext, id: string, input: UpdateCapabilityInput) {
    await this.get(auth.organizationId, id);

    let tagIds: string[] | undefined;
    if (input.tags) {
      const tags = await tagRepository.findOrCreateMany(
        auth.organizationId,
        input.tags,
      );
      tagIds = tags.map((t) => t.id);
    }

    const capability = await capabilityRepository.update(
      auth.organizationId,
      id,
      { ...input, tagIds },
    );
    if (!capability) throw ApiError.notFound("Capability not found");

    await activityRepository.create({
      organizationId: auth.organizationId,
      userId: auth.userId,
      action: "UPDATE",
      entityType: "capability",
      entityId: capability.id,
      summary: `Updated capability "${capability.name}"`,
    });

    return capability;
  }

  async remove(auth: AuthContext, id: string) {
    const existing = await this.get(auth.organizationId, id);
    const deleted = await capabilityRepository.softDelete(
      auth.organizationId,
      id,
    );
    if (!deleted) throw ApiError.notFound("Capability not found");

    await activityRepository.create({
      organizationId: auth.organizationId,
      userId: auth.userId,
      action: "DELETE",
      entityType: "capability",
      entityId: id,
      summary: `Deleted capability "${existing.name}"`,
    });

    return { id };
  }
}

export const capabilityService = new CapabilityService();
