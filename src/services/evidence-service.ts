import { ApiError } from "@/lib/api-error";
import { activityRepository } from "@/repositories/activity-repository";
import { evidenceRepository } from "@/repositories/evidence-repository";
import { problemRepository } from "@/repositories/problem-repository";
import { tagRepository } from "@/repositories/tag-repository";
import type {
  CreateEvidenceInput,
  ListEvidenceInput,
  UpdateEvidenceInput,
} from "@/schemas/evidence";
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

export class EvidenceService {
  async list(organizationId: string, input: ListEvidenceInput) {
    const { items, total } = await evidenceRepository.list(organizationId, {
      page: input.page,
      pageSize: input.pageSize,
      problemId: input.problemId,
      q: input.q,
    });
    return paginate(items, total, input.page, input.pageSize);
  }

  async get(organizationId: string, id: string) {
    const evidence = await evidenceRepository.findById(organizationId, id);
    if (!evidence) throw ApiError.notFound("Evidence not found");
    return evidence;
  }

  async create(auth: AuthContext, input: CreateEvidenceInput) {
    const problem = await problemRepository.findById(
      auth.organizationId,
      input.problemId,
    );
    if (!problem) throw ApiError.badRequest("Problem not found");

    const tags = await tagRepository.findOrCreateMany(
      auth.organizationId,
      input.tags ?? [],
    );

    const evidence = await evidenceRepository.create({
      organizationId: auth.organizationId,
      problemId: input.problemId,
      observation: input.observation,
      transcript: input.transcript,
      screenshotUrl: input.screenshotUrl || null,
      link: input.link || null,
      confidence: input.confidence,
      authorId: auth.userId,
      tagIds: tags.map((t) => t.id),
    });

    await activityRepository.create({
      organizationId: auth.organizationId,
      userId: auth.userId,
      action: "CREATE",
      entityType: "evidence",
      entityId: evidence.id,
      summary: `Created evidence on "${problem.title}"`,
    });

    return evidence;
  }

  async update(auth: AuthContext, id: string, input: UpdateEvidenceInput) {
    await this.get(auth.organizationId, id);

    if (input.problemId) {
      const problem = await problemRepository.findById(
        auth.organizationId,
        input.problemId,
      );
      if (!problem) throw ApiError.badRequest("Problem not found");
    }

    let tagIds: string[] | undefined;
    if (input.tags) {
      const tags = await tagRepository.findOrCreateMany(
        auth.organizationId,
        input.tags,
      );
      tagIds = tags.map((t) => t.id);
    }

    const evidence = await evidenceRepository.update(auth.organizationId, id, {
      ...input,
      screenshotUrl: input.screenshotUrl,
      link: input.link,
      tagIds,
    });
    if (!evidence) throw ApiError.notFound("Evidence not found");

    await activityRepository.create({
      organizationId: auth.organizationId,
      userId: auth.userId,
      action: "UPDATE",
      entityType: "evidence",
      entityId: evidence.id,
      summary: `Updated evidence`,
    });

    return evidence;
  }

  async remove(auth: AuthContext, id: string) {
    await this.get(auth.organizationId, id);
    const deleted = await evidenceRepository.softDelete(
      auth.organizationId,
      id,
    );
    if (!deleted) throw ApiError.notFound("Evidence not found");

    await activityRepository.create({
      organizationId: auth.organizationId,
      userId: auth.userId,
      action: "DELETE",
      entityType: "evidence",
      entityId: id,
      summary: `Deleted evidence`,
    });

    return { id };
  }
}

export const evidenceService = new EvidenceService();
