import type { ChatMessage } from "@/services/ai/openai-client";

export type ClusterEvidencePromptItem = {
  id: string;
  observation: string;
  confidence: number;
};

export function buildClusterDraftPrompt(
  evidences: ClusterEvidencePromptItem[],
): ChatMessage[] {
  const evidenceBlock = evidences
    .map(
      (e, i) =>
        `Evidence ${i + 1} (${e.id}, confidence=${e.confidence}): ${e.observation}`,
    )
    .join("\n");

  return [
    {
      role: "system",
      content:
        "You are a product operations analyst for QuestionOps. Group related evidence into a named cluster with a concise summary. Respond with JSON only: {\"name\":\"...\",\"summary\":\"...\"}.",
    },
    {
      role: "user",
      content: `Propose a cluster name and summary for:\n\n${evidenceBlock}`,
    },
  ];
}
