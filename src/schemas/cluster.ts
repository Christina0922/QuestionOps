import { z } from "zod";
import { paginationSchema } from "@/schemas/common";

export const createClusterSchema = z.object({
  name: z.string().trim().min(1).max(200),
  summary: z.string().trim().max(5000).optional().nullable(),
  problemId: z.string().min(1).optional().nullable(),
  evidenceIds: z.array(z.string().min(1)).min(1),
});

export const updateClusterSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  summary: z.string().trim().max(5000).optional().nullable(),
  problemId: z.string().min(1).optional().nullable(),
  evidenceIds: z.array(z.string().min(1)).min(1).optional(),
});

export const listClustersSchema = paginationSchema.extend({
  problemId: z.string().optional(),
  q: z.string().trim().optional(),
});

export const clusterDraftSchema = z.object({
  evidenceIds: z.array(z.string().min(1)).min(1).max(50),
});

export type CreateClusterInput = z.infer<typeof createClusterSchema>;
export type UpdateClusterInput = z.infer<typeof updateClusterSchema>;
export type ListClustersInput = z.infer<typeof listClustersSchema>;
