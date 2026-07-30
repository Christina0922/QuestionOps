import { ApiError } from "@/lib/api-error";
import { activityRepository } from "@/repositories/activity-repository";
import { problemRepository } from "@/repositories/problem-repository";
import { tagRepository } from "@/repositories/tag-repository";
import type {
  CreateProblemInput,
  ListProblemsInput,
  UpdateProblemInput,
} from "@/schemas/problem";
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

export class ProblemService {
  async list(organizationId: string, input: ListProblemsInput) {
    const { items, total } = await problemRepository.list(organizationId, {
      page: input.page,
      pageSize: input.pageSize,
      status: input.status,
      priority: input.priority,
      q: input.q,
    });
    return paginate(items, total, input.page, input.pageSize);
  }

  async get(organizationId: string, id: string) {
    const problem = await problemRepository.findById(organizationId, id);
    if (!problem) throw ApiError.notFound("Problem not found");
    return problem;
  }

  async create(auth: AuthContext, input: CreateProblemInput) {
    const tags = await tagRepository.findOrCreateMany(
      auth.organizationId,
      input.tags ?? [],
    );
    const problem = await problemRepository.create({
      organizationId: auth.organizationId,
      title: input.title,
      description: input.description,
      source: input.source,
      customer: input.customer,
      priority: input.priority,
      status: input.status,
      reporterId: auth.userId,
      tagIds: tags.map((t) => t.id),
    });

    await activityRepository.create({
      organizationId: auth.organizationId,
      userId: auth.userId,
      action: "CREATE",
      entityType: "problem",
      entityId: problem.id,
      summary: `Created problem "${problem.title}"`,
    });

    return problem;
  }

  async update(auth: AuthContext, id: string, input: UpdateProblemInput) {
    await this.get(auth.organizationId, id);

    let tagIds: string[] | undefined;
    if (input.tags) {
      const tags = await tagRepository.findOrCreateMany(
        auth.organizationId,
        input.tags,
      );
      tagIds = tags.map((t) => t.id);
    }

    const problem = await problemRepository.update(auth.organizationId, id, {
      ...input,
      tagIds,
    });
    if (!problem) throw ApiError.notFound("Problem not found");

    await activityRepository.create({
      organizationId: auth.organizationId,
      userId: auth.userId,
      action: "UPDATE",
      entityType: "problem",
      entityId: problem.id,
      summary: `Updated problem "${problem.title}"`,
    });

    return problem;
  }

  async remove(auth: AuthContext, id: string) {
    const existing = await this.get(auth.organizationId, id);
    const deleted = await problemRepository.softDelete(
      auth.organizationId,
      id,
    );
    if (!deleted) throw ApiError.notFound("Problem not found");

    await activityRepository.create({
      organizationId: auth.organizationId,
      userId: auth.userId,
      action: "DELETE",
      entityType: "problem",
      entityId: id,
      summary: `Deleted problem "${existing.title}"`,
    });

    return { id };
  }
}

export const problemService = new ProblemService();
