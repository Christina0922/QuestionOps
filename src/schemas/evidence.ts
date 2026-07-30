import { z } from "zod";
import { paginationSchema, tagNamesSchema } from "@/schemas/common";

export const createEvidenceSchema = z.object({
  problemId: z.string().min(1),
  observation: z.string().trim().min(1).max(10000),
  transcript: z.string().trim().max(50000).optional().nullable(),
  screenshotUrl: z
    .union([z.string().url(), z.literal(""), z.null()])
    .optional(),
  link: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
  confidence: z.number().min(0).max(1).default(0.5),
  tags: tagNamesSchema.optional().default([]),
});

export const updateEvidenceSchema = createEvidenceSchema
  .omit({ problemId: true })
  .partial()
  .extend({
    problemId: z.string().min(1).optional(),
  });

export const listEvidenceSchema = paginationSchema.extend({
  problemId: z.string().optional(),
  q: z.string().trim().optional(),
});

export type CreateEvidenceInput = z.infer<typeof createEvidenceSchema>;
export type UpdateEvidenceInput = z.infer<typeof updateEvidenceSchema>;
export type ListEvidenceInput = z.infer<typeof listEvidenceSchema>;
