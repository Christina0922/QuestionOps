import { z } from "zod";
import type { ChatMessage } from "@/services/ai/openai-client";

export const classifyCommentOutputSchema = z.object({
  classification: z.enum([
    "QUESTION",
    "COMPLAINT",
    "BUG_REPORT",
    "REQUEST",
    "SUGGESTION",
    "PRAISE",
    "CONFUSION",
    "PURCHASE_INTENT",
    "CHURN_RISK",
    "SPAM",
    "OTHER",
    "UNKNOWN",
  ]),
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE", "MIXED", "UNKNOWN"]),
  urgency: z.number().int().min(1).max(5),
  confidence: z.number().min(0).max(1),
});

export const classifyCommentPrompt = {
  promptVersion: "yt-classify-v1",
  buildMessages(text: string): ChatMessage[] {
    return [
      {
        role: "system",
        content:
          "Classify a YouTube comment. Reply with JSON only matching keys classification, sentiment, urgency (1-5), confidence (0-1).",
      },
      { role: "user", content: text },
    ];
  },
  outputSchema: classifyCommentOutputSchema,
};

export const summarizeClusterPrompt = {
  promptVersion: "yt-cluster-v1",
  buildMessages(texts: string[]): ChatMessage[] {
    return [
      {
        role: "system",
        content:
          'Name a YouTube comment cluster. JSON only: {"name":"...","summary":"..."}',
      },
      {
        role: "user",
        content: texts.map((t, i) => `${i + 1}. ${t}`).join("\n"),
      },
    ];
  },
};

export const generateKnowledgePrompt = {
  promptVersion: "yt-knowledge-v1",
  buildMessages(input: {
    clusterName: string;
    comments: string[];
  }): ChatMessage[] {
    return [
      {
        role: "system",
        content:
          'Draft ops knowledge from comments. JSON only: {"title":"...","description":"...","confidence":0.0-1.0}',
      },
      {
        role: "user",
        content: `Cluster: ${input.clusterName}\nComments:\n${input.comments
          .map((c, i) => `${i + 1}. ${c}`)
          .join("\n")}`,
      },
    ];
  },
};

export const generateCapabilityPrompt = {
  promptVersion: "yt-capability-v1",
  buildMessages(input: {
    title: string;
    description: string;
  }): ChatMessage[] {
    return [
      {
        role: "system",
        content:
          'Draft a capability SOP. JSON only: {"name":"...","description":"...","standardProcedure":"...","checklist":["..."],"expectedOutcome":"..."}',
      },
      {
        role: "user",
        content: `Knowledge: ${input.title}\n${input.description}`,
      },
    ];
  },
};
