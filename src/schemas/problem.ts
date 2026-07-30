import { z } from "zod";
import { paginationSchema, tagNamesSchema } from "@/schemas/common";

export const problemPrioritySchema = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

export const problemStatusSchema = z.enum([
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
]);

export const createProblemSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(10000),
  source: z.string().trim().max(200).optional().nullable(),
  customer: z.string().trim().max(200).optional().nullable(),
  priority: problemPrioritySchema.default("MEDIUM"),
  status: problemStatusSchema.default("OPEN"),
  tags: tagNamesSchema.optional().default([]),
});

export const updateProblemSchema = createProblemSchema.partial();

export const listProblemsSchema = paginationSchema.extend({
  status: problemStatusSchema.optional(),
  priority: problemPrioritySchema.optional(),
  q: z.string().trim().optional(),
});

export type CreateProblemInput = z.infer<typeof createProblemSchema>;
export type UpdateProblemInput = z.infer<typeof updateProblemSchema>;
export type ListProblemsInput = z.infer<typeof listProblemsSchema>;
