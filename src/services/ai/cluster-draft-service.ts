import { buildClusterDraftPrompt } from "@/prompts/cluster";
import { evidenceRepository } from "@/repositories/evidence-repository";
import {
  createOpenAIClient,
  type OpenAIClient,
} from "@/services/ai/openai-client";
import { ApiError } from "@/lib/api-error";

export type ClusterDraft = {
  name: string;
  summary: string;
  source: "openai" | "template";
};

function parseDraftJson(content: string): Partial<ClusterDraft> | null {
  try {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    return JSON.parse(content.slice(start, end + 1)) as Partial<ClusterDraft>;
  } catch {
    return null;
  }
}

function templateDraft(
  evidences: Array<{ observation: string }>,
): ClusterDraft {
  const first = evidences[0]?.observation ?? "Related evidence";
  const words = first.split(/\s+/).slice(0, 6).join(" ");
  return {
    name: `${words}${first.split(/\s+/).length > 6 ? "…" : ""} cluster`,
    summary: [
      `Cluster of ${evidences.length} related evidence items (template draft).`,
      "",
      ...evidences.map((e, i) => `- [${i + 1}] ${e.observation}`),
    ].join("\n"),
    source: "template",
  };
}

export class ClusterDraftService {
  constructor(private readonly client: OpenAIClient | null = createOpenAIClient()) {}

  async draft(
    organizationId: string,
    evidenceIds: string[],
  ): Promise<ClusterDraft> {
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

    const messages = buildClusterDraftPrompt(
      evidences.map((e) => ({
        id: e.id,
        observation: e.observation,
        confidence: e.confidence,
      })),
    );

    try {
      const content = await this.client.complete(messages);
      const parsed = parseDraftJson(content);
      if (!parsed?.name || !parsed?.summary) {
        return templateDraft(evidences);
      }
      return {
        name: parsed.name,
        summary: parsed.summary,
        source: "openai",
      };
    } catch {
      return templateDraft(evidences);
    }
  }
}

export const clusterDraftService = new ClusterDraftService();
