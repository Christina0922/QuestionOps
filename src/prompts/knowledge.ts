import type { ChatMessage } from "@/services/ai/openai-client";

export type EvidencePromptItem = {
  id: string;
  observation: string;
  transcript?: string | null;
  confidence: number;
};

export function buildKnowledgeDraftPrompt(
  evidences: EvidencePromptItem[],
): ChatMessage[] {
  const evidenceBlock = evidences
    .map(
      (e, i) =>
        `Evidence ${i + 1} (${e.id}, confidence=${e.confidence}):\nObservation: ${e.observation}${
          e.transcript ? `\nTranscript: ${e.transcript}` : ""
        }`,
    )
    .join("\n\n");

  return [
    {
      role: "system",
      content:
        "You are a product operations analyst for QuestionOps. Turn customer evidence into reusable knowledge. Respond with JSON only: {\"title\":\"...\",\"description\":\"...\",\"confidence\":0.0-1.0}. Description may use markdown.",
    },
    {
      role: "user",
      content: `Synthesize a knowledge draft from the following evidence.\n\n${evidenceBlock}`,
    },
  ];
}
