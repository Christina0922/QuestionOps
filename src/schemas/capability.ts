import { z } from "zod";
import { paginationSchema, tagNamesSchema } from "@/schemas/common";

export const createCapabilitySchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(10000),
  standardProcedure: z.string().trim().min(1).max(20000),
  checklist: z.array(z.string().trim().min(1)).default([]),
  expectedOutcome: z.string().trim().min(1).max(5000),
  knowledgeId: z.string().min(1).optional().nullable(),
  problemId: z.string().min(1).optional().nullable(),
  tags: tagNamesSchema.optional().default([]),
});

export const updateCapabilitySchema = createCapabilitySchema.partial();

export const listCapabilitiesSchema = paginationSchema.extend({
  problemId: z.string().optional(),
  knowledgeId: z.string().optional(),
  q: z.string().trim().optional(),
});

export type CreateCapabilityInput = z.infer<typeof createCapabilitySchema>;
export type UpdateCapabilityInput = z.infer<typeof updateCapabilitySchema>;
export type ListCapabilitiesInput = z.infer<typeof listCapabilitiesSchema>;
