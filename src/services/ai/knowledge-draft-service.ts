import { buildKnowledgeDraftPrompt } from "@/prompts/knowledge";
import { evidenceRepository } from "@/repositories/evidence-repository";
import {
  createOpenAIClient,
  type OpenAIClient,
} from "@/services/ai/openai-client";
import { ApiError } from "@/lib/api-error";

export type KnowledgeDraft = {
  title: string;
  description: string;
  confidence: number;
  source: "openai" | "template";
};

function parseDraftJson(content: string): Partial<KnowledgeDraft> | null {
  try {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    return JSON.parse(content.slice(start, end + 1)) as Partial<KnowledgeDraft>;
  } catch {
    return null;
  }
}

function templateDraft(
  evidences: Array<{ observation: string }>,
): KnowledgeDraft {
  const bullets = evidences
    .map((e, i) => `${i + 1}. ${e.observation}`)
    .join("\n");
  return {
    title: `Insight from ${evidences.length} evidence item(s)`,
    description: [
      "Synthesized knowledge draft (template — configure OPENAI_API_KEY for AI drafts).",
      "",
      "## Supporting observations",
      bullets,
      "",
      "## Working hypothesis",
      "These observations point to a recurring customer friction pattern. Validate with stakeholders before promoting to capability.",
    ].join("\n"),
    confidence: Math.min(
      0.85,
      0.4 + evidences.length * 0.05,
    ),
    source: "template",
  };
}

export class KnowledgeDraftService {
  constructor(private readonly client: OpenAIClient | null = createOpenAIClient()) {}

  async draft(
    organizationId: string,
    evidenceIds: string[],
  ): Promise<KnowledgeDraft> {
    const evidences = await evidenceRepository.findByIds(
      organizationId,
      evidenceIds,
    );
    if (evidences.length === 0) {
      throw ApiError.badRequest("No evidence found for the given IDs");
    }

    if (!this.client) {
      return templateDraft(evidences);
    }

    const messages = buildKnowledgeDraftPrompt(
      evidences.map((e) => ({
        id: e.id,
        observation: e.observation,
        transcript: e.transcript,
        confidence: e.confidence,
      })),
    );

    try {
      const content = await this.client.complete(messages);
      const parsed = parseDraftJson(content);
      if (!parsed?.title || !parsed?.description) {
        return templateDraft(evidences);
      }
      return {
        title: parsed.title,
        description: parsed.description,
        confidence:
          typeof parsed.confidence === "number"
            ? Math.min(1, Math.max(0, parsed.confidence))
            : 0.6,
        source: "openai",
      };
    } catch {
      return templateDraft(evidences);
    }
  }
}

export const knowledgeDraftService = new KnowledgeDraftService();
