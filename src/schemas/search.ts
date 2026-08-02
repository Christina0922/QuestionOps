import { z } from "zod";
import { paginationSchema } from "@/schemas/common";

export const searchSchema = paginationSchema.extend({
  q: z.string().trim().min(1).max(200),
  types: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean)
        : undefined,
    )
    .pipe(
      z
        .array(
          z.enum([
            "problem",
            "evidence",
            "knowledge",
            "capability",
            "live_session",
            "question",
            "submission",
            "publication",
          ]),
        )
        .optional(),
    ),
});

export type SearchInput = z.infer<typeof searchSchema>;
