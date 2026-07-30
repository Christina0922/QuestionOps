import { truncate } from "@/lib/utils";
import { capabilityRepository } from "@/repositories/capability-repository";
import { clusterRepository } from "@/repositories/cluster-repository";
import { evidenceRepository } from "@/repositories/evidence-repository";
import { knowledgeRepository } from "@/repositories/knowledge-repository";
import { problemRepository } from "@/repositories/problem-repository";
import type { DashboardStats } from "@/types";

export class DashboardService {
  async getStats(organizationId: string): Promise<DashboardStats> {
    const [
      problems,
      evidences,
      knowledge,
      capabilities,
      clusters,
      recentProblems,
      recentKnowledge,
      recentCapabilities,
      recentEvidence,
      updatedProblems,
      updatedKnowledge,
      updatedCapabilities,
    ] = await Promise.all([
      problemRepository.count(organizationId),
      evidenceRepository.count(organizationId),
      knowledgeRepository.count(organizationId),
      capabilityRepository.count(organizationId),
      clusterRepository.count(organizationId),
      problemRepository.recentCreated(organizationId, 5),
      knowledgeRepository.recentCreated(organizationId, 5),
      capabilityRepository.recentCreated(organizationId, 5),
      evidenceRepository.recentCreated(organizationId, 5),
      problemRepository.recentUpdated(organizationId, 5),
      knowledgeRepository.recentUpdated(organizationId, 5),
      capabilityRepository.recentUpdated(organizationId, 5),
    ]);

    const recentCreated = [
      ...recentProblems.map((p) => ({
        id: p.id,
        entityType: "problem",
        title: p.title,
        createdAt: p.createdAt.toISOString(),
        href: `/problems/${p.id}`,
      })),
      ...recentEvidence.map((e) => ({
        id: e.id,
        entityType: "evidence",
        title: truncate(e.observation, 80),
        createdAt: e.createdAt.toISOString(),
        href: `/evidence/${e.id}`,
      })),
      ...recentKnowledge.map((k) => ({
        id: k.id,
        entityType: "knowledge",
        title: k.title,
        createdAt: k.createdAt.toISOString(),
        href: `/knowledge/${k.id}`,
      })),
      ...recentCapabilities.map((c) => ({
        id: c.id,
        entityType: "capability",
        title: c.name,
        createdAt: c.createdAt.toISOString(),
        href: `/capabilities/${c.id}`,
      })),
    ]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8);

    const recentUpdated = [
      ...updatedProblems.map((p) => ({
        id: p.id,
        entityType: "problem",
        title: p.title,
        updatedAt: p.updatedAt.toISOString(),
        href: `/problems/${p.id}`,
      })),
      ...updatedKnowledge.map((k) => ({
        id: k.id,
        entityType: "knowledge",
        title: k.title,
        updatedAt: k.updatedAt.toISOString(),
        href: `/knowledge/${k.id}`,
      })),
      ...updatedCapabilities.map((c) => ({
        id: c.id,
        entityType: "capability",
        title: c.name,
        updatedAt: c.updatedAt.toISOString(),
        href: `/capabilities/${c.id}`,
      })),
    ]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 8);

    return {
      totals: {
        problems,
        evidences,
        knowledge,
        capabilities,
        clusters,
      },
      recentCreated,
      recentUpdated,
    };
  }
}

export const dashboardService = new DashboardService();
