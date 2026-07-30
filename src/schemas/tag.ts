import { z } from "zod";

export const createTagSchema = z.object({
  name: z.string().trim().min(1).max(64),
});

export const listTagsSchema = z.object({
  q: z.string().trim().optional(),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;
