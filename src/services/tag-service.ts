import { tagRepository } from "@/repositories/tag-repository";
import type { CreateTagInput } from "@/schemas/tag";

export class TagService {
  async list(organizationId: string, q?: string) {
    return tagRepository.list(organizationId, q);
  }

  async create(organizationId: string, input: CreateTagInput) {
    const existing = await tagRepository.list(organizationId, input.name);
    const match = existing.find(
      (t) => t.name.toLowerCase() === input.name.trim().toLowerCase(),
    );
    if (match) return match;
    return tagRepository.create(organizationId, input.name);
  }
}

export const tagService = new TagService();
