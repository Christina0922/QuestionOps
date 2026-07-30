import { prisma } from "@/lib/prisma";

export class TagRepository {
  async list(organizationId: string, q?: string) {
    return prisma.tag.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(q
          ? { name: { contains: q, mode: "insensitive" as const } }
          : {}),
      },
      orderBy: { name: "asc" },
    });
  }

  async findOrCreateMany(organizationId: string, names: string[]) {
    const unique = Array.from(
      new Set(names.map((n) => n.trim()).filter(Boolean)),
    );
    if (unique.length === 0) return [];

    const tags = await Promise.all(
      unique.map(async (name) => {
        const existing = await prisma.tag.findFirst({
          where: {
            organizationId,
            name: { equals: name, mode: "insensitive" },
            deletedAt: null,
          },
        });
        if (existing) return existing;

        try {
          return await prisma.tag.create({
            data: { organizationId, name },
          });
        } catch {
          return (
            (await prisma.tag.findFirst({
              where: {
                organizationId,
                name: { equals: name, mode: "insensitive" },
              },
            })) ??
            (await prisma.tag.create({
              data: { organizationId, name: `${name}-${Date.now()}` },
            }))
          );
        }
      }),
    );

    return tags;
  }

  async create(organizationId: string, name: string) {
    return prisma.tag.create({
      data: { organizationId, name: name.trim() },
    });
  }
}

export const tagRepository = new TagRepository();
