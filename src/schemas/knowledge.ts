import { z } from "zod";
import { paginationSchema, tagNamesSchema } from "@/schemas/common";

export const createKnowledgeSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(20000),
  confidence: z.number().min(0).max(1).default(0.5),
  problemId: z.string().min(1).optional().nullable(),
  clusterIds: z.array(z.string().min(1)).optional().default([]),
  evidenceIds: z.array(z.string().min(1)).optional().default([]),
  tags: tagNamesSchema.optional().default([]),
});

export const updateKnowledgeSchema = createKnowledgeSchema.partial();

export const listKnowledgeSchema = paginationSchema.extend({
  problemId: z.string().optional(),
  q: z.string().trim().optional(),
});

export const knowledgeDraftSchema = z.object({
  evidenceIds: z.array(z.string().min(1)).min(1).max(50),
});

export type CreateKnowledgeInput = z.infer<typeof createKnowledgeSchema>;
export type UpdateKnowledgeInput = z.infer<typeof updateKnowledgeSchema>;
export type ListKnowledgeInput = z.infer<typeof listKnowledgeSchema>;
