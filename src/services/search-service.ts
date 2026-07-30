import { truncate } from "@/lib/utils";
import { capabilityRepository } from "@/repositories/capability-repository";
import { evidenceRepository } from "@/repositories/evidence-repository";
import { knowledgeRepository } from "@/repositories/knowledge-repository";
import { problemRepository } from "@/repositories/problem-repository";
import type { SearchInput } from "@/schemas/search";
import type { SearchEntityType, SearchHit } from "@/types";

export interface SearchProvider {
  search(
    organizationId: string,
    input: SearchInput,
  ): Promise<{ items: SearchHit[]; total: number }>;
}

function scoreMatch(query: string, ...fields: Array<string | null | undefined>) {
  const q = query.toLowerCase();
  let score = 0;
  for (const field of fields) {
    if (!field) continue;
    const value = field.toLowerCase();
    if (value === q) score += 3;
    else if (value.startsWith(q)) score += 2;
    else if (value.includes(q)) score += 1;
  }
  return score;
}

export class PrismaSearchProvider implements SearchProvider {
  async search(organizationId: string, input: SearchInput) {
    const types: SearchEntityType[] = input.types?.length
      ? input.types
      : ["problem", "evidence", "knowledge", "capability"];

    const take = Math.max(input.pageSize * 2, 20);
    const results: SearchHit[] = [];

    if (types.includes("problem")) {
      const problems = await problemRepository.search(
        organizationId,
        input.q,
        take,
      );
      for (const p of problems) {
        results.push({
          id: p.id,
          entityType: "problem",
          title: p.title,
          snippet: truncate(p.description, 160),
          score: scoreMatch(input.q, p.title, p.description),
          href: `/problems/${p.id}`,
          updatedAt: p.updatedAt.toISOString(),
        });
      }
    }

    if (types.includes("evidence")) {
      const evidences = await evidenceRepository.search(
        organizationId,
        input.q,
        take,
      );
      for (const e of evidences) {
        results.push({
          id: e.id,
          entityType: "evidence",
          title: truncate(e.observation, 80),
          snippet: truncate(e.observation, 160),
          score: scoreMatch(input.q, e.observation),
          href: `/evidence/${e.id}`,
          updatedAt: e.updatedAt.toISOString(),
        });
      }
    }

    if (types.includes("knowledge")) {
      const knowledge = await knowledgeRepository.search(
        organizationId,
        input.q,
        take,
      );
      for (const k of knowledge) {
        results.push({
          id: k.id,
          entityType: "knowledge",
          title: k.title,
          snippet: truncate(k.description, 160),
          score: scoreMatch(input.q, k.title, k.description),
          href: `/knowledge/${k.id}`,
          updatedAt: k.updatedAt.toISOString(),
        });
      }
    }

    if (types.includes("capability")) {
      const capabilities = await capabilityRepository.search(
        organizationId,
        input.q,
        take,
      );
      for (const c of capabilities) {
        results.push({
          id: c.id,
          entityType: "capability",
          title: c.name,
          snippet: truncate(c.description, 160),
          score: scoreMatch(input.q, c.name, c.description),
          href: `/capabilities/${c.id}`,
          updatedAt: c.updatedAt.toISOString(),
        });
      }
    }

    results.sort((a, b) => b.score - a.score || b.updatedAt.localeCompare(a.updatedAt));

    const total = results.length;
    const start = (input.page - 1) * input.pageSize;
    const items = results.slice(start, start + input.pageSize);

    return { items, total };
  }
}

/**
 * SearchService is provider-based so a VectorSearchProvider can be swapped in later.
 */
export class SearchService {
  constructor(private readonly provider: SearchProvider = new PrismaSearchProvider()) {}

  async search(organizationId: string, input: SearchInput) {
    const { items, total } = await this.provider.search(organizationId, input);
    return {
      items,
      total,
      page: input.page,
      pageSize: input.pageSize,
      totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
      query: input.q,
    };
  }
}

export const searchService = new SearchService();
