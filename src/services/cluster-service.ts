import { ApiError } from "@/lib/api-error";
import { activityRepository } from "@/repositories/activity-repository";
import { clusterRepository } from "@/repositories/cluster-repository";
import { evidenceRepository } from "@/repositories/evidence-repository";
import { problemRepository } from "@/repositories/problem-repository";
import type {
  CreateClusterInput,
  ListClustersInput,
  UpdateClusterInput,
} from "@/schemas/cluster";
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

export class ClusterService {
  async list(organizationId: string, input: ListClustersInput) {
    const { items, total } = await clusterRepository.list(organizationId, {
      page: input.page,
      pageSize: input.pageSize,
      problemId: input.problemId,
      q: input.q,
    });
    return paginate(items, total, input.page, input.pageSize);
  }

  async get(organizationId: string, id: string) {
    const cluster = await clusterRepository.findById(organizationId, id);
    if (!cluster) throw ApiError.notFound("Cluster not found");
    return cluster;
  }

  private async assertEvidenceIds(
    organizationId: string,
    evidenceIds: string[],
  ) {
    const evidences = await evidenceRepository.findByIds(
      organizationId,
      evidenceIds,
    );
    if (evidences.length !== evidenceIds.length) {
      throw ApiError.badRequest("One or more evidence items were not found");
    }
    return evidences;
  }

  async create(auth: AuthContext, input: CreateClusterInput) {
    if (input.problemId) {
      const problem = await problemRepository.findById(
        auth.organizationId,
        input.problemId,
      );
      if (!problem) throw ApiError.badRequest("Problem not found");
    }

    await this.assertEvidenceIds(auth.organizationId, input.evidenceIds);

    const cluster = await clusterRepository.create({
      organizationId: auth.organizationId,
      name: input.name,
      summary: input.summary,
      problemId: input.problemId,
      evidenceIds: input.evidenceIds,
    });

    await activityRepository.create({
      organizationId: auth.organizationId,
      userId: auth.userId,
      action: "CREATE",
      entityType: "cluster",
      entityId: cluster.id,
      summary: `Created cluster "${cluster.name}"`,
    });

    return cluster;
  }

  async update(auth: AuthContext, id: string, input: UpdateClusterInput) {
    await this.get(auth.organizationId, id);

    if (input.problemId) {
      const problem = await problemRepository.findById(
        auth.organizationId,
        input.problemId,
      );
      if (!problem) throw ApiError.badRequest("Problem not found");
    }

    if (input.evidenceIds) {
      await this.assertEvidenceIds(auth.organizationId, input.evidenceIds);
    }

    const cluster = await clusterRepository.update(
      auth.organizationId,
      id,
      input,
    );
    if (!cluster) throw ApiError.notFound("Cluster not found");

    await activityRepository.create({
      organizationId: auth.organizationId,
      userId: auth.userId,
      action: "UPDATE",
      entityType: "cluster",
      entityId: cluster.id,
      summary: `Updated cluster "${cluster.name}"`,
    });

    return cluster;
  }

  async remove(auth: AuthContext, id: string) {
    const existing = await this.get(auth.organizationId, id);
    const deleted = await clusterRepository.softDelete(
      auth.organizationId,
      id,
    );
    if (!deleted) throw ApiError.notFound("Cluster not found");

    await activityRepository.create({
      organizationId: auth.organizationId,
      userId: auth.userId,
      action: "DELETE",
      entityType: "cluster",
      entityId: id,
      summary: `Deleted cluster "${existing.name}"`,
    });

    return { id };
  }
}

export const clusterService = new ClusterService();
