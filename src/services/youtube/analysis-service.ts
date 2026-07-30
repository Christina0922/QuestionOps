import { z } from "zod";
import { ApiError } from "@/lib/api-error";
import {
  classifyCommentHeuristic,
  formClusters,
  hashCommentContent,
  nameClusterTemplate,
  type ClassifyResult,
} from "@/lib/youtube/classify";
import { createOpenAIClient } from "@/services/ai/openai-client";
import {
  classifyCommentPrompt,
  generateCapabilityPrompt,
  generateKnowledgePrompt,
  summarizeClusterPrompt,
} from "@/prompts/youtube";
import { activityRepository } from "@/repositories/activity-repository";
import { evidenceRepository } from "@/repositories/evidence-repository";
import { tagRepository } from "@/repositories/tag-repository";
import { clusterService } from "@/services/cluster-service";
import { knowledgeService } from "@/services/knowledge-service";
import { capabilityService } from "@/services/capability-service";
import {
  youTubeConnectionRepository,
  youTubeSyncJobRepository,
  youTubeVideoRepository,
} from "@/repositories/youtube-repository";
import { youtubeJobQueue } from "@/jobs/youtube/queue";
import { prisma } from "@/lib/prisma";
import type { AuthContext } from "@/types";

export const startAnalysisSchema = z.object({
  maxComments: z.coerce.number().int().min(1).max(500).default(100),
});

export const reviewClusterSchema = z.object({
  action: z.enum(["approve", "reject"]),
  problemId: z.string().min(1).optional().nullable(),
  name: z.string().trim().min(1).max(200).optional(),
  summary: z.string().trim().max(5000).optional().nullable(),
});

export const reviewCandidateSchema = z.object({
  action: z.enum(["approve", "reject"]),
  problemId: z.string().min(1).optional().nullable(),
});

function parseJsonObject(content: string): Record<string, unknown> | null {
  try {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    return JSON.parse(content.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

async function classifyOne(text: string): Promise<ClassifyResult & { source: string }> {
  const heuristic = classifyCommentHeuristic(text);
  const client = createOpenAIClient();
  if (!client || process.env.AI_PROVIDER === "mock") {
    return { ...heuristic, source: "heuristic" };
  }
  try {
    const content = await client.complete(
      classifyCommentPrompt.buildMessages(text),
    );
    const parsed = classifyCommentPrompt.outputSchema.safeParse(
      parseJsonObject(content),
    );
    if (!parsed.success) return { ...heuristic, source: "heuristic" };
    return { ...parsed.data, source: "openai" };
  } catch {
    return { ...heuristic, source: "heuristic" };
  }
}

export class YouTubeAnalysisService {
  async getLatest(organizationId: string, videoId: string) {
    const video = await youTubeVideoRepository.findById(organizationId, videoId);
    if (!video) throw ApiError.notFound("Video not found");

    const analysis = await prisma.youTubeVideoAnalysis.findFirst({
      where: { organizationId, videoId },
      orderBy: { createdAt: "desc" },
      include: {
        clusters: { orderBy: { createdAt: "asc" } },
        knowledgeCandidates: { orderBy: { createdAt: "asc" } },
        capabilityCandidates: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!analysis) return null;

    const classified = await prisma.youTubeComment.findMany({
      where: {
        organizationId,
        videoId,
        deletedAt: null,
        classification: { not: null },
      },
      orderBy: { classifiedAt: "desc" },
      take: 100,
      select: {
        id: true,
        textOriginal: true,
        classification: true,
        sentiment: true,
        urgency: true,
        classificationConfidence: true,
        analysisClusterId: true,
        detectedLanguage: true,
        authorDisplayName: true,
      },
    });

    return {
      ...analysis,
      supportingCommentIds: undefined,
      clusters: analysis.clusters.map((c) => ({
        ...c,
        supportingCommentIds: asStringArray(c.supportingCommentIds),
      })),
      knowledgeCandidates: analysis.knowledgeCandidates.map((k) => ({
        ...k,
        supportingCommentIds: asStringArray(k.supportingCommentIds),
      })),
      capabilityCandidates: analysis.capabilityCandidates.map((c) => ({
        ...c,
        checklist: asStringArray(c.checklist),
      })),
      classifiedComments: classified,
      startedAt: analysis.startedAt?.toISOString() ?? null,
      completedAt: analysis.completedAt?.toISOString() ?? null,
      createdAt: analysis.createdAt.toISOString(),
      updatedAt: analysis.updatedAt.toISOString(),
    };
  }

  async start(
    auth: AuthContext,
    videoId: string,
    input: z.infer<typeof startAnalysisSchema>,
  ) {
    const video = await youTubeVideoRepository.findById(
      auth.organizationId,
      videoId,
    );
    if (!video) throw ApiError.notFound("Video not found");

    const commentCount = await prisma.youTubeComment.count({
      where: { organizationId: auth.organizationId, videoId, deletedAt: null },
    });
    if (commentCount === 0) {
      throw ApiError.badRequest("Import comments before analysis");
    }

    const connection = await youTubeConnectionRepository.findByOrganization(
      auth.organizationId,
    );

    const job = await youTubeSyncJobRepository.create({
      organizationId: auth.organizationId,
      connectionId: connection?.id,
      channelId: video.channelId,
      videoId: video.id,
      jobType: "ANALYSIS",
      status: "RUNNING",
    });

    const analysis = await prisma.youTubeVideoAnalysis.create({
      data: {
        organizationId: auth.organizationId,
        videoId: video.id,
        jobId: job.id,
        status: "RUNNING",
        commentLimit: input.maxComments,
        startedAt: new Date(),
      },
    });

    await prisma.youTubeVideo.update({
      where: { id: video.id },
      data: { analysisStatus: "RUNNING" },
    });

    void this.runAnalysis({
      auth,
      analysisId: analysis.id,
      jobId: job.id,
      videoId: video.id,
      maxComments: input.maxComments,
    }).catch(async (error) => {
      const message = error instanceof Error ? error.message : "Analysis failed";
      await prisma.youTubeVideoAnalysis.update({
        where: { id: analysis.id },
        data: { status: "FAILED", errorMessage: message, completedAt: new Date() },
      });
      await youTubeSyncJobRepository.complete(job.id, auth.organizationId, {
        status: "FAILED",
        errorCode: "ANALYSIS_FAILED",
        errorMessage: message,
      });
      await prisma.youTubeVideo.update({
        where: { id: video.id },
        data: { analysisStatus: "ERROR" },
      });
    });

    return {
      analysisId: analysis.id,
      jobId: job.id,
      status: "RUNNING",
      queueMode: youtubeJobQueue.mode,
    };
  }

  private async runAnalysis(opts: {
    auth: AuthContext;
    analysisId: string;
    jobId: string;
    videoId: string;
    maxComments: number;
  }) {
    const comments = await prisma.youTubeComment.findMany({
      where: {
        organizationId: opts.auth.organizationId,
        videoId: opts.videoId,
        deletedAt: null,
        isTopLevel: true,
      },
      orderBy: { likeCount: "desc" },
      take: opts.maxComments,
    });

    let processed = 0;
    const classifiedItems: Array<{
      id: string;
      text: string;
      classification: ClassifyResult["classification"];
    }> = [];

    for (const comment of comments) {
      const hash = hashCommentContent(comment.textOriginal);
      let result: ClassifyResult;

      if (
        comment.contentHash === hash &&
        comment.classification &&
        comment.sentiment
      ) {
        result = {
          classification: comment.classification,
          sentiment: comment.sentiment,
          urgency: comment.urgency ?? 2,
          confidence: comment.classificationConfidence ?? 0.5,
        };
      } else {
        result = await classifyOne(comment.textOriginal);
      }

      await prisma.youTubeComment.update({
        where: { id: comment.id },
        data: {
          classification: result.classification,
          sentiment: result.sentiment,
          urgency: result.urgency,
          classificationConfidence: result.confidence,
          contentHash: hash,
          classifiedAt: new Date(),
          analysisClusterId: null,
        },
      });

      classifiedItems.push({
        id: comment.id,
        text: comment.textOriginal,
        classification: result.classification,
      });
      processed += 1;

      if (processed % 10 === 0) {
        await prisma.youTubeVideoAnalysis.update({
          where: { id: opts.analysisId },
          data: { processedCount: processed },
        });
        await prisma.youTubeSyncJob.update({
          where: { id: opts.jobId },
          data: {
            processedCount: processed,
            totalExpected: comments.length,
          },
        });
      }
    }

    await prisma.youTubeAnalysisCluster.deleteMany({
      where: { analysisId: opts.analysisId },
    });

    const seeds = formClusters(classifiedItems).filter(
      (s) => s.commentIds.length >= 1,
    );
    const client = createOpenAIClient();

    for (const seed of seeds.slice(0, 30)) {
      let nameSummary = nameClusterTemplate(seed);
      if (client && process.env.AI_PROVIDER !== "mock") {
        try {
          const content = await client.complete(
            summarizeClusterPrompt.buildMessages(seed.texts.slice(0, 12)),
          );
          const parsed = parseJsonObject(content);
          if (
            typeof parsed?.name === "string" &&
            typeof parsed?.summary === "string"
          ) {
            nameSummary = { name: parsed.name, summary: parsed.summary };
          }
        } catch {
          /* template fallback */
        }
      }

      const cluster = await prisma.youTubeAnalysisCluster.create({
        data: {
          organizationId: opts.auth.organizationId,
          analysisId: opts.analysisId,
          videoId: opts.videoId,
          name: nameSummary.name.slice(0, 200),
          summary: nameSummary.summary,
          supportingCommentIds: seed.commentIds,
          primaryClassification: seed.classification,
          reviewStatus: "AI_GENERATED",
        },
      });

      await prisma.youTubeComment.updateMany({
        where: { id: { in: seed.commentIds } },
        data: { analysisClusterId: cluster.id },
      });
    }

    await prisma.youTubeVideoAnalysis.update({
      where: { id: opts.analysisId },
      data: {
        status: "COMPLETED",
        processedCount: processed,
        clusterCount: Math.min(seeds.length, 30),
        completedAt: new Date(),
      },
    });
    await youTubeSyncJobRepository.complete(
      opts.jobId,
      opts.auth.organizationId,
      {
        status: "COMPLETED",
        processedCount: processed,
        createdCount: Math.min(seeds.length, 30),
      },
    );
    await prisma.youTubeVideo.update({
      where: { id: opts.videoId },
      data: { analysisStatus: "COMPLETED" },
    });

    await activityRepository.create({
      organizationId: opts.auth.organizationId,
      userId: opts.auth.userId,
      action: "CREATE",
      entityType: "youtube_analysis",
      entityId: opts.analysisId,
      summary: `Analyzed ${processed} comments → ${Math.min(seeds.length, 30)} clusters`,
    });
  }

  async reviewCluster(
    auth: AuthContext,
    videoId: string,
    clusterId: string,
    input: z.infer<typeof reviewClusterSchema>,
  ) {
    const cluster = await prisma.youTubeAnalysisCluster.findFirst({
      where: { id: clusterId, organizationId: auth.organizationId, videoId },
    });
    if (!cluster) throw ApiError.notFound("Analysis cluster not found");

    if (input.action === "reject") {
      const updated = await prisma.youTubeAnalysisCluster.update({
        where: { id: cluster.id },
        data: { reviewStatus: "REJECTED" },
      });
      return { ...updated, supportingCommentIds: asStringArray(updated.supportingCommentIds) };
    }

    const commentIds = asStringArray(cluster.supportingCommentIds);
    const evidenceIds = await this.ensureEvidenceForComments(
      auth,
      videoId,
      commentIds,
      input.problemId,
    );
    if (evidenceIds.length === 0) {
      throw ApiError.badRequest("No evidence could be created from comments");
    }

    const created = await clusterService.create(auth, {
      name: input.name ?? cluster.name,
      summary: input.summary ?? cluster.summary,
      problemId: input.problemId ?? null,
      evidenceIds,
    });

    const updated = await prisma.youTubeAnalysisCluster.update({
      where: { id: cluster.id },
      data: {
        reviewStatus: "APPROVED",
        approvedClusterId: created.id,
        problemId: input.problemId ?? null,
        name: input.name ?? cluster.name,
        summary: input.summary ?? cluster.summary,
      },
    });

    return {
      ...updated,
      supportingCommentIds: asStringArray(updated.supportingCommentIds),
      cluster: created,
    };
  }

  async generateCandidates(auth: AuthContext, videoId: string) {
    const analysis = await prisma.youTubeVideoAnalysis.findFirst({
      where: { organizationId: auth.organizationId, videoId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      include: {
        clusters: {
          where: { reviewStatus: { in: ["AI_GENERATED", "APPROVED", "USER_REVIEWED"] } },
        },
      },
    });
    if (!analysis) throw ApiError.badRequest("Run analysis first");

    await prisma.youTubeKnowledgeCandidate.deleteMany({
      where: { analysisId: analysis.id, reviewStatus: "AI_GENERATED" },
    });
    await prisma.youTubeCapabilityCandidate.deleteMany({
      where: { analysisId: analysis.id, reviewStatus: "AI_GENERATED" },
    });

    const client = createOpenAIClient();
    const createdKnowledge = [];

    for (const cluster of analysis.clusters.slice(0, 10)) {
      const commentIds = asStringArray(cluster.supportingCommentIds);
      if (commentIds.length === 0) continue;
      const comments = await prisma.youTubeComment.findMany({
        where: { id: { in: commentIds } },
        select: { textOriginal: true },
      });
      const texts = comments.map((c) => c.textOriginal);

      let title = `${cluster.primaryClassification ?? "Theme"}: ${cluster.name.slice(0, 80)}`;
      let description =
        cluster.summary ??
        `Knowledge draft from ${texts.length} YouTube comments.\n\n${texts
          .slice(0, 6)
          .map((t, i) => `${i + 1}. ${t}`)
          .join("\n")}`;
      let confidence = 0.55;

      if (client && process.env.AI_PROVIDER !== "mock") {
        try {
          const content = await client.complete(
            generateKnowledgePrompt.buildMessages({
              clusterName: cluster.name,
              comments: texts.slice(0, 12),
            }),
          );
          const parsed = parseJsonObject(content);
          if (typeof parsed?.title === "string") title = parsed.title;
          if (typeof parsed?.description === "string")
            description = parsed.description;
          if (typeof parsed?.confidence === "number")
            confidence = parsed.confidence;
        } catch {
          /* template */
        }
      }

      const knowledge = await prisma.youTubeKnowledgeCandidate.create({
        data: {
          organizationId: auth.organizationId,
          analysisId: analysis.id,
          videoId,
          analysisClusterId: cluster.id,
          title: title.slice(0, 200),
          description,
          confidence,
          supportingCommentIds: commentIds,
          reviewStatus: "AI_GENERATED",
        },
      });
      createdKnowledge.push(knowledge);

      let capName = `Respond to: ${title.slice(0, 80)}`;
      let capDescription = description.slice(0, 2000);
      let standardProcedure = [
        "1. Triage matching comments/tickets",
        "2. Reproduce or gather context",
        "3. Apply known fix or escalate",
        "4. Reply with outcome + link to knowledge",
      ].join("\n");
      let checklist = [
        "Confirm customer impact",
        "Check recent related comments",
        "Update knowledge if needed",
      ];
      let expectedOutcome =
        "Issue acknowledged with clear next step for the customer.";

      if (client && process.env.AI_PROVIDER !== "mock") {
        try {
          const content = await client.complete(
            generateCapabilityPrompt.buildMessages({
              title,
              description,
            }),
          );
          const parsed = parseJsonObject(content);
          if (typeof parsed?.name === "string") capName = parsed.name;
          if (typeof parsed?.description === "string")
            capDescription = parsed.description;
          if (typeof parsed?.standardProcedure === "string")
            standardProcedure = parsed.standardProcedure;
          if (Array.isArray(parsed?.checklist)) {
            checklist = parsed.checklist.filter(
              (x): x is string => typeof x === "string",
            );
          }
          if (typeof parsed?.expectedOutcome === "string")
            expectedOutcome = parsed.expectedOutcome;
        } catch {
          /* template */
        }
      }

      await prisma.youTubeCapabilityCandidate.create({
        data: {
          organizationId: auth.organizationId,
          analysisId: analysis.id,
          videoId,
          knowledgeCandidateId: knowledge.id,
          name: capName.slice(0, 200),
          description: capDescription,
          standardProcedure,
          checklist,
          expectedOutcome,
          reviewStatus: "AI_GENERATED",
        },
      });
    }

    await activityRepository.create({
      organizationId: auth.organizationId,
      userId: auth.userId,
      action: "CREATE",
      entityType: "youtube_candidates",
      entityId: analysis.id,
      summary: `Generated ${createdKnowledge.length} knowledge/capability candidates`,
    });

    return this.getLatest(auth.organizationId, videoId);
  }

  async reviewKnowledge(
    auth: AuthContext,
    videoId: string,
    candidateId: string,
    input: z.infer<typeof reviewCandidateSchema>,
  ) {
    const candidate = await prisma.youTubeKnowledgeCandidate.findFirst({
      where: {
        id: candidateId,
        organizationId: auth.organizationId,
        videoId,
      },
    });
    if (!candidate) throw ApiError.notFound("Knowledge candidate not found");

    if (input.action === "reject") {
      return prisma.youTubeKnowledgeCandidate.update({
        where: { id: candidate.id },
        data: { reviewStatus: "REJECTED" },
      });
    }

    const commentIds = asStringArray(candidate.supportingCommentIds);
    const evidenceIds = await this.ensureEvidenceForComments(
      auth,
      videoId,
      commentIds,
      input.problemId,
    );

    const knowledge = await knowledgeService.create(auth, {
      title: candidate.title,
      description: candidate.description,
      confidence: candidate.confidence,
      problemId: input.problemId ?? null,
      evidenceIds,
      clusterIds: [],
      tags: ["youtube", "ai-candidate"],
    });

    return prisma.youTubeKnowledgeCandidate.update({
      where: { id: candidate.id },
      data: {
        reviewStatus: "APPROVED",
        approvedKnowledgeId: knowledge.id,
      },
    });
  }

  async reviewCapability(
    auth: AuthContext,
    videoId: string,
    candidateId: string,
    input: z.infer<typeof reviewCandidateSchema>,
  ) {
    const candidate = await prisma.youTubeCapabilityCandidate.findFirst({
      where: {
        id: candidateId,
        organizationId: auth.organizationId,
        videoId,
      },
      include: { knowledgeCandidate: true },
    });
    if (!candidate) throw ApiError.notFound("Capability candidate not found");

    if (input.action === "reject") {
      return prisma.youTubeCapabilityCandidate.update({
        where: { id: candidate.id },
        data: { reviewStatus: "REJECTED" },
      });
    }

    let knowledgeId = candidate.knowledgeCandidate?.approvedKnowledgeId ?? null;
    if (!knowledgeId && candidate.knowledgeCandidate) {
      const approved = await this.reviewKnowledge(
        auth,
        videoId,
        candidate.knowledgeCandidate.id,
        { action: "approve", problemId: input.problemId },
      );
      knowledgeId = approved.approvedKnowledgeId;
    }

    const capability = await capabilityService.create(auth, {
      name: candidate.name,
      description: candidate.description,
      standardProcedure: candidate.standardProcedure,
      checklist: asStringArray(candidate.checklist),
      expectedOutcome: candidate.expectedOutcome,
      knowledgeId,
      problemId: input.problemId ?? null,
      tags: ["youtube", "ai-candidate"],
    });

    return prisma.youTubeCapabilityCandidate.update({
      where: { id: candidate.id },
      data: {
        reviewStatus: "APPROVED",
        approvedCapabilityId: capability.id,
      },
    });
  }

  private async ensureEvidenceForComments(
    auth: AuthContext,
    videoId: string,
    commentIds: string[],
    preferredProblemId?: string | null,
  ) {
    const comments = await prisma.youTubeComment.findMany({
      where: {
        organizationId: auth.organizationId,
        videoId,
        id: { in: commentIds },
        deletedAt: null,
      },
    });

    const tags = await tagRepository.findOrCreateMany(auth.organizationId, [
      "youtube",
      "ai-cluster",
    ]);
    const tagIds = tags.map((t) => t.id);
    const evidenceIds: string[] = [];

    const problem =
      (preferredProblemId
        ? await prisma.problem.findFirst({
            where: {
              id: preferredProblemId,
              organizationId: auth.organizationId,
              deletedAt: null,
            },
          })
        : null) ??
      (await prisma.problem.findFirst({
        where: {
          organizationId: auth.organizationId,
          deletedAt: null,
          status: "OPEN",
        },
        orderBy: { updatedAt: "desc" },
      })) ??
      (await prisma.problem.findFirst({
        where: { organizationId: auth.organizationId, deletedAt: null },
        orderBy: { createdAt: "desc" },
      }));

    if (!problem) {
      throw ApiError.badRequest(
        "Create a Problem before approving YouTube clusters",
      );
    }

    for (const comment of comments) {
      const existing = await evidenceRepository.findBySource(
        auth.organizationId,
        "YOUTUBE_COMMENT",
        comment.youtubeCommentId,
      );
      if (existing) {
        evidenceIds.push(existing.id);
        continue;
      }
      const created = await evidenceRepository.create({
        organizationId: auth.organizationId,
        problemId: problem.id,
        observation: comment.textOriginal,
        transcript: comment.textOriginal,
        link: comment.sourceUrl,
        confidence: comment.classificationConfidence ?? 0.6,
        authorId: auth.userId,
        tagIds,
        sourceType: "YOUTUBE_COMMENT",
        sourceExternalId: comment.youtubeCommentId,
        sourceUrl: comment.sourceUrl,
        youtubeCommentId: comment.id,
      });
      evidenceIds.push(created.id);
    }

    return evidenceIds;
  }
}

export const youTubeAnalysisService = new YouTubeAnalysisService();
